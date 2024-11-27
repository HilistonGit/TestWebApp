// Получаем доступ к элементам
const video = document.getElementById('camera-feed');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Настройка видео с камеры
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then((stream) => {
        video.srcObject = stream;
        video.play();
    })
    .catch((err) => console.log("Ошибка при получении видео: ", err));

// Добавление 3D объектов на сцену
function createBuilding(x, y, z) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const building = new THREE.Mesh(geometry, material);
    building.position.set(x, y, z);
    scene.add(building);
}

// Пример получения данных зданий (вы можете заменить этот код на запрос к API)
const buildingsData = [
    { x: 2.5, y: 1, z: 3 },
    { x: 3.5, y: 1, z: 5 },
    { x: -2.5, y: 1, z: -3 }
];

// Добавление зданий на сцену
buildingsData.forEach(building => {
    createBuilding(building.x, building.y, building.z);
});

// Настройка камеры
camera.position.z = 5;

// Получение координат устройства с GPS и акселерометра
function updateDevicePosition() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            console.log(`GPS координаты: Широта: ${lat}, Долгота: ${lon}`);
            // Обновление позиции камеры и объектов
            camera.position.set(lon, 0, lat); // Пример преобразования GPS в местные координаты
        });
    }

    if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", (event) => {
            const alpha = event.alpha; // Угол вокруг оси Z (гироскоп)
            const beta = event.beta;   // Угол вокруг оси X (гироскоп)
            const gamma = event.gamma; // Угол вокруг оси Y (гироскоп)

            console.log(`Гироскоп - alpha: ${alpha}, beta: ${beta}, gamma: ${gamma}`);
            // Применение данных гироскопа для вращения сцены
            camera.rotation.set(beta * (Math.PI / 180), gamma * (Math.PI / 180), alpha * (Math.PI / 180));
        });
    }
}

// Отрисовка на канвасе
function animate() {
    requestAnimationFrame(animate);
    updateDevicePosition(); // Обновление позиции при анимации
    renderer.render(scene, camera); // Отображение сцены
}

animate();
