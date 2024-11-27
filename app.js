// Инициализация камеры
const video = document.createElement("video");
video.id = "camera";
video.style.position = "absolute";
video.style.top = "0";
video.style.left = "0";
video.style.width = "100%";
video.style.height = "100%";
video.style.zIndex = "-1"; // Видео располагается за слоем Three.js
document.body.appendChild(video);

navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
  })
  .catch((err) => {
    console.error("Ошибка доступа к камере:", err);
  });

// Остальной код для работы с Three.js и OSM
let currentCoords = { lat: 45.039, lon: 39.129 }; // Пример начальных координат (Краснодар)

// Функция для обновления координат с GPS
function updateCoords() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      currentCoords.lat = position.coords.latitude;
      currentCoords.lon = position.coords.longitude;
    });
  }
}

// Функция для загрузки данных зданий через Overpass API
async function fetchBuildings() {
  const overpassApi = `https://overpass-api.de/api/interpreter`;
  const query = `
    [out:xml][timeout:25];
    (
      way["building"](${currentCoords.lat - 0.01},${currentCoords.lon - 0.01},${currentCoords.lat + 0.01},${currentCoords.lon + 0.01});
      relation["building"](${currentCoords.lat - 0.01},${currentCoords.lon - 0.01},${currentCoords.lat + 0.01},${currentCoords.lon + 0.01});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetch(overpassApi, {
      method: "POST",
      body: query,
    });
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const osmData = await response.text();

    // Преобразование данных OSM в формат GeoJSON
    const geojson = osmtogeojson(new DOMParser().parseFromString(osmData, "text/xml"));

    // Добавление зданий на сцену
    addBuildingsToScene(geojson.features);
  } catch (err) {
    console.error("Ошибка загрузки данных OSM:", err);
  }
}

// Функция для добавления зданий на сцену
function addBuildingsToScene(buildings) {
  buildings.forEach((building) => {
    if (building.geometry && building.geometry.type === "Polygon") {
      const coords = building.geometry.coordinates[0];
      const shape = new THREE.Shape();
      coords.forEach(([lon, lat], i) => {
        const { x, y } = convertCoordsToScene(lon, lat);
        if (i === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      });

      // Создание 3D-объекта для здания
      const extrudeSettings = { depth: 50, bevelEnabled: false };
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const material = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        transparent: true,
        opacity: 0.5,
      });

      const buildingMesh = new THREE.Mesh(geometry, material);
      scene.add(buildingMesh);
    }
  });
}

// Функция для преобразования координат в сцену Three.js
function convertCoordsToScene(lon, lat) {
  // Пример простого преобразования (не учитывает масштаб)
  const x = (lon - currentCoords.lon) * 10000;
  const y = (lat - currentCoords.lat) * 10000;
  return { x, y };
}

// Инициализация сцены Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

camera.position.z = 100;

// Анимация
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// Инициализация
updateCoords();
fetchBuildings();
