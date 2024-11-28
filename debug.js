// Переменные для камеры и сенсоров
let currentCoords = { lat: 0, lon: 0 };
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
    navigator.geolocation.watchPosition((position) => {
      currentCoords.lat = position.coords.latitude;
      currentCoords.lon = position.coords.longitude;
    });
  } else {
    console.warn("GPS недоступен.");
  }
}

// Инициализация акселерометра и гироскопа
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
const renderer = new THREE.WebGLRenderer({ alpha: true }); // Включить прозрачность
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Создание домов
function createHouse(x, z) {
  const geometry = new THREE.BoxGeometry(10, 50, 10); // Ширина: 10м, Высота: 50м
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00, // Ярко-зелёный цвет
    transparent: true,
    opacity: 0.8, // Лёгкая прозрачность
  });

  const house = new THREE.Mesh(geometry, material);
  house.position.set(x, 25, z); // Устанавливаем дом на землю (позиция по высоте: 25)
  return house;
}

// Добавление 5 домов вокруг камеры
const houses = [];
const housePositions = [
  [20, 0],
  [-20, 0],
  [0, 20],
  [0, -20],
  [15, 15],
];
housePositions.forEach(([x, z]) => {
  const house = createHouse(x, z);
  houses.push(house);
  scene.add(house);
});

// Устанавливаем позицию виртуальной камеры
camera.position.set(0, 2, 0); // Высота 2 метра

// Анимация
function animate() {
  requestAnimationFrame(animate);

  // Обновление ориентации камеры в зависимости от сенсоров
  camera.rotation.x = THREE.MathUtils.degToRad(orientation.beta); // Наклон вперёд/назад
  camera.rotation.y = THREE.MathUtils.degToRad(orientation.alpha); // Поворот влево/вправо
  camera.rotation.z = THREE.MathUtils.degToRad(orientation.gamma); // Боковой наклон

  renderer.render(scene, camera);
}
animate();

// Инициализация модулей
initGPS();
initSensors();
