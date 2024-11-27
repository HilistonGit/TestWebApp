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

// Инициализация переменных для GPS координат
let currentLatitude = 0;
let currentLongitude = 0;

// Функция для получения текущих GPS-координат устройства
function getGPSCoordinates() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            currentLatitude = position.coords.latitude;
            currentLongitude = position.coords.longitude;
            console.log(`Текущие GPS координаты: Широта: ${currentLatitude}, Долгота: ${currentLongitude}`);
            // Обновление позиции камеры
            camera.position.set(currentLongitude, 0, currentLatitude); // Преобразование GPS в местные координаты
        });
    } else {
        console.error("GPS не поддерживается на этом устройстве.");
    }
}

// Функция для загрузки данных о зданиях из OpenStreetMap через Overpass API
function loadBuildingData() {
    // Используем координаты устройства для получения данных о зданиях вокруг
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
        [out:json];
        (
            way["building"](around:500, ${currentLatitude}, ${currentLongitude});
            node["building"](around:500, ${currentLatitude}, ${currentLongitude});
        );
        out body;
    `;
    fetch(`${overpassUrl}?data=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            console.log('Данные зданий:', data);
            data.elements.forEach(element => {
                if (element.type === "way" && element.tags && element.tags.building) {
                    const coordinates = element.nodes.map(nodeId => {
                        const node = data.elements.find(e => e.id === nodeId);
                        return [node.lon, node.lat];
                    });
                    createBuildingFromGeoData(coordinates);
                }
            });
        })
        .catch(error => console.error('Ошибка при загрузке данных зданий:', error));
}

// Функция для создания 3D здания на основе координат
function createBuildingFromGeoData(coords) {
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const height = 10; // Примерная высота здания (можно сделать динамической, если есть соответствующие данные)

    coords.forEach((coord) => {
        const x = coord[0]; // Долгота
        const z = coord[1]; // Широта
        const geometry = new THREE.BoxGeometry(1, height, 1); // Простой куб в 3D
        const building = new THREE.Mesh(geometry, material);
        building.position.set(x, height / 2, z); // Позиционирование здания на сцене
        scene.add(building);
    });
}

// Функция для обновления данных устройства (GPS и акселерометр)
function updateDevicePosition() {
    getGPSCoordinates(); // Получаем GPS-координаты

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

// Инициализация процесса
animate();
