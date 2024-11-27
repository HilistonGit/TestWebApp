// Инициализация камеры
const video = document.getElementById("camera");
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.error("Ошибка доступа к камере:", err);
  });

// Инициализация Three.js
const canvas = document.getElementById("arCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
renderer.setSize(window.innerWidth, window.innerHeight);

// Текущее положение и ориентация устройства
let currentCoords = { lat: 0, lon: 0 };

// Получение координат GPS
navigator.geolocation.watchPosition((pos) => {
  currentCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
  fetchBuildings();
}, (err) => {
  console.error("Ошибка получения координат:", err);
});

// Обновление ориентации устройства
window.addEventListener("deviceorientation", (event) => {
  camera.rotation.set(
    THREE.MathUtils.degToRad(event.beta - 90),
    THREE.MathUtils.degToRad(event.alpha),
    THREE.MathUtils.degToRad(event.gamma)
  );
});

// Запрос данных о зданиях
async function fetchBuildings() {
    const bbox = [
      currentCoords.lon - 0.01,
      currentCoords.lat - 0.01,
      currentCoords.lon + 0.01,
      currentCoords.lat + 0.01
    ].join(",");
    
    try {
      const response = await fetch(`https://www.openstreetmap.org/api/0.6/map?bbox=${bbox}`);
      const osmData = await response.text(); // Загружаем данные в формате XML
      const geojson = osmtogeojson(new DOMParser().parseFromString(osmData, "text/xml"));
      addBuildingsToScene(geojson.features); // Передаём данные для отрисовки зданий
    } catch (err) {
      console.error("Ошибка загрузки данных OSM:", err);
    }
  }  

// Добавление зданий на сцену
function addBuildingsToScene(features) {
  features.forEach((feature) => {
    if (feature.geometry.type === "Polygon") {
      const shape = new THREE.Shape(
        feature.geometry.coordinates[0].map(([lon, lat]) => {
          const { x, y } = project(lat, lon);
          return new THREE.Vector2(x, y);
        })
      );
      
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: 50, bevelEnabled: false });
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5
      });

      // Прозрачный градиент
      material.onBeforeCompile = (shader) => {
        shader.uniforms.time = { value: 0 };
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `
          #include <dithering_fragment>
          gl_FragColor.a = mix(0.5, 0.0, gl_FragCoord.y / 500.0); // Градиент прозрачности
          `
        );
      };

      const building = new THREE.Mesh(geometry, material);
      building.position.z = -25; // Позиционирование на сцене
      scene.add(building);
    }
  });
}

// Проекция координат в плоскость
function project(lat, lon) {
  const scale = 100000; // Коэффициент масштабирования
  return {
    x: (lon - currentCoords.lon) * scale,
    y: (lat - currentCoords.lat) * scale
  };
}

// Анимация сцены
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
