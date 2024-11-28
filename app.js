// Подключение необходимых библиотек
// osmtogeojson: https://tyrasd.github.io/osmtogeojson/osmtogeojson.js
// three.js: https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js

let currentCoords = null; // Координаты GPS
let orientation = { alpha: 0, beta: 0, gamma: 0 }; // Данные с гироскопа
let buildingsLoaded = false; // Флаг загрузки зданий
let logMessages = []; // Сообщения для консоли

// Инициализация камеры
const video = document.getElementById("camera");
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
  .then((stream) => {
    video.srcObject = stream;
    log("Камера подключена");
  })
  .catch((err) => {
    log(`Ошибка доступа к камере: ${err.message}`);
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
        log(`GPS обновлен: ${currentCoords.lat.toFixed(6)}, ${currentCoords.lon.toFixed(6)}`);
        if (!buildingsLoaded) {
          loadBuildings();
          buildingsLoaded = true;
        }
      },
      (err) => {
        log(`Ошибка получения координат GPS: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  } else {
    log("GPS недоступен.");
  }
}

// Инициализация сенсоров устройства
function initSensors() {
  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", (event) => {
      orientation.alpha = event.alpha || 0;
      orientation.beta = event.beta || 0;
      orientation.gamma = event.gamma || 0;
      updateDebugInfo();
    });
  } else {
    log("Сенсоры устройства недоступны.");
  }
}

// Инициализация сцены Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true }); // Прозрачность включена
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Отрисовка зданий с прозрачным градиентом
function createBuilding(shape) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 50, bevelEnabled: false });
  
  // Градиентный материал
  const material = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x00ff00) }, // Зеленый цвет
    },
    vertexShader: `
      varying float vHeight;
      void main() {
        vHeight = position.y / 50.0; // Нормализация высоты
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying float vHeight;
      void main() {
        gl_FragColor = vec4(color, 1.0 - vHeight); // Градиент прозрачности
      }
    `,
    transparent: true,
  });

  return new THREE.Mesh(geometry, material);
}

// Загрузка зданий с OSM
function loadBuildings() {
  if (!currentCoords) return; // Ждем координат GPS

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
    .catch((err) => log(`Ошибка загрузки данных OSM: ${err.message}`));
}

// Отрисовка зданий
function renderBuildings(geojson) {
  scene.clear(); // Очистить сцену перед добавлением новых зданий

  geojson.features
    .filter((feature) => feature.geometry.type === "Polygon")
    .slice(0, 50) // Ограничение на 50 зданий
    .forEach((feature) => {
      const coordinates = feature.geometry.coordinates[0];
      const shape = new THREE.Shape();

      coordinates.forEach(([lon, lat], index) => {
        const x = (lon - currentCoords.lon) * 10000; // Преобразование координат в метры
        const z = (lat - currentCoords.lat) * 10000;
        if (index === 0) shape.moveTo(x, z);
        else shape.lineTo(x, z);
      });

      const building = createBuilding(shape);
      scene.add(building);
    });
}

// Вывод информации для дебага
function updateDebugInfo() {
  const debugInfo = document.getElementById("debugInfo");
  if (!debugInfo) {
    console.warn("Элемент #debugInfo не найден в DOM.");
    return;
  }
  debugInfo.innerHTML = `
    <p><b>GPS:</b> ${currentCoords ? `${currentCoords.lat.toFixed(6)}, ${currentCoords.lon.toFixed(6)}` : "Ожидание..."}</p>
    <p><b>Ориентация:</b> α=${orientation.alpha.toFixed(2)}°, β=${orientation.beta.toFixed(2)}°, γ=${orientation.gamma.toFixed(2)}°</p>
    <p><b>Консоль:</b><br>${logMessages.join("<br>")}</p>
  `;
}

function log(message) {
  console.log(message);
  logMessages.push(message);
  if (logMessages.length > 10) logMessages.shift(); // Ограничиваем количество сообщений
  updateDebugInfo();
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

// Запуск приложения после загрузки DOM
document.addEventListener("DOMContentLoaded", () => {
  initGPS();     // Инициализация GPS
  initSensors(); // Инициализация сенсоров
  animate();     // Запуск рендера и обновления AR-объектов
});