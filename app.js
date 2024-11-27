// Инициализация камеры, сцены и рендерера
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Камера и сцена
camera.position.z = 10;  // Увеличил позицию камеры, чтобы было видно больше объектов

// Простая анимация (поворот куба для проверки)
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Функция для получения данных о зданиях с API Overpass
async function loadBuildings(userPosition) {
    const overpassApiUrl = 'https://overpass-api.de/api/interpreter';
    const bbox = [
        userPosition.latitude - 0.005, userPosition.longitude - 0.005,
        userPosition.latitude + 0.005, userPosition.longitude + 0.005,
    ].join(',');

    const query = `
        [out:json][timeout:25];
        (
          way["building"](${bbox});
        );
        out body;
        >;
        out skel qt;
    `;

    const url = `${overpassApiUrl}?data=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();

    console.log('Полученные данные с Overpass API:', data);  // Логируем данные от API

    const nodes = {};
    data.elements.forEach((element) => {
        if (element.type === "node") {
            nodes[element.id] = { lat: element.lat, lon: element.lon };
        }
    });

    data.elements.forEach((element) => {
        if (element.type === "way" && element.tags && element.tags.building) {
            const coordinates = element.nodes.map((nodeId) => nodes[nodeId]);
            console.log('Координаты здания:', coordinates);  // Логируем координаты здания
            createBuilding(coordinates, userPosition);
        }
    });
}

// Функция преобразования координат в сцену
function convertGeoToScene(lat, lon, userLat, userLon) {
    const x = (lon - userLon) * 1000;  // Преобразуем долготу в метры
    const z = (lat - userLat) * 1000;  // Преобразуем широту в метры
    return { x, z };
}

// Функция создания 3D зданий на сцене
function createBuilding(coordinates, userPosition) {
    const shape = new THREE.Shape();
    coordinates.forEach((coord, index) => {
        const { x, z } = convertGeoToScene(coord.lat, coord.lon, userPosition.latitude, userPosition.longitude);
        console.log(`Координаты здания (локальные): X: ${x}, Z: ${z}`);  // Логируем локальные координаты
        if (index === 0) {
            shape.moveTo(x, z);
        } else {
            shape.lineTo(x, z);
        }
    });

    const extrudeSettings = { depth: 10, bevelEnabled: false };  // Уменьшил глубину здания для теста
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const buildingMesh = new THREE.Mesh(geometry, material);

    scene.add(buildingMesh);
    console.log('Здание добавлено на сцену:', buildingMesh);  // Логируем информацию о созданном здании
}

// Инициализация и захват видео с камеры
const video = document.getElementById('camera-feed');
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
        video.srcObject = stream;
        video.play();
        console.log("Камера подключена");
    })
    .catch((err) => {
        console.error("Ошибка подключения к камере:", err);
    });

// Пример пользовательских координат (можно заменить на реальные данные GPS)
const userPosition = { latitude: 55.7558, longitude: 37.6173 }; // Пример: Москва

// Загрузка зданий и их добавление на сцену
loadBuildings(userPosition);
