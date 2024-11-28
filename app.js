// Переменные для координат, ориентации и статуса GPS
let currentCoords = null; // Координаты будут получены с GPS
let orientation = { alpha: 0, beta: 0, gamma: 0 };

// Инициализация камеры
const video = document.getElementById("camera");
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.error("Ошибка доступа к камере:", err);
  });

// Инициализация GPS
function initGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        currentCoords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        if (!buildingsLoaded) {
          loadBuildings(); // Загружаем здания только после получения координат
          buildingsLoaded = true;
        }
      },
      (err) => {
        console.error("Ошибка получения координат GPS:", err);
      },
      { enableHighAccuracy: true }
    );
  } else {
    console.warn("GPS недоступен.");
  }
}

// Инициализация сенсоров устройства
function initSensors() {
  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", (event) => {
      orientation.alpha = event.alpha || 0;
      orientation.beta = event.beta || 0;
      orientation.gamma = event.gamma || 0;
    });
  } else {
    console.warn("Сенсоры устройства недоступны.");
  }
}

// Инициализация сцены Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true }); // Прозрачность включена
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

let buildingsLoaded = false; // Флаг для предотвращения многократной загрузки зданий

// Загрузка зданий с OSM
function loadBuildings() {
  if (!currentCoords) return; // Ожидаем получения координат GPS

  const bbox = [
    currentCoords.lon - 0.01,
    currentCoords.lat - 0.01,
    currentCoords.lon + 0.01,
    currentCoords.lat + 0.01,
  ].join(",");
  const url = `https://www.openstreetmap.org/api/0.6/map?bbox=${bbox}`;

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Ошибка загрузки OSM: ${response.status}`);
      return response.text();
    })
    .then((osmData) => {
      const geojson = osmtogeojson(new DOMParser().parseFromString(osmData, "text/xml"));
      renderBuildings(geojson);
    })
    .catch((err) => console.error("Ошибка загрузки данных OSM:", err));
}

// Отрисовка зданий
function renderBuildings(geojson) {
  scene.clear(); // Очистить сцену перед добавлением новых зданий

  geojson.features
    .filter((feature) => feature.geometry.type === "Polygon")
    .slice(0, 20) // Ограничение на 20 зданий
    .forEach((feature) => {
      const coordinates = feature.geometry.coordinates[0];
      const shape = new THREE.Shape();

      coordinates.forEach(([lon, lat], index) => {
        const x = (lon - currentCoords.lon) * 10000; // Преобразование координат в метры
        const z = (lat - currentCoords.lat) * 10000;
        if (index === 0) shape.moveTo(x, z);
        else shape.lineTo(x, z);
      });

      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 50, bevelEnabled: false });
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00, // Ярко-зелёный цвет
        transparent: true,
        opacity: 0.5,
      });

      const building = new THREE.Mesh(geometry, material);
      scene.add(building);
    });
}

// Анимация
function animate() {
  requestAnimationFrame(animate);

  // Обновление ориентации камеры
  camera.rotation.x = THREE.MathUtils.degToRad(orientation.beta);
  camera.rotation.y = THREE.MathUtils.degToRad(orientation.alpha);
  camera.rotation.z = THREE.MathUtils.degToRad(orientation.gamma);

  renderer.render(scene, camera);
}
animate();

// Инициализация модулей
initGPS();
initSensors();
