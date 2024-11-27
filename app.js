// === Подключение Three.js ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Инициализация камеры ===
const video = document.getElementById('camera-feed');
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
        video.srcObject = stream;
        video.play();
    })
    .catch(console.error);

// === GPS данные ===
let userPosition = { latitude: 0, longitude: 0 };

if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        userPosition.latitude = position.coords.latitude;
        userPosition.longitude = position.coords.longitude;
        console.log(`Пользователь находится на: ${userPosition.latitude}, ${userPosition.longitude}`);
    });
}

// === Преобразование координат из GPS в локальные координаты сцены ===
function convertGeoToScene(lat, lon, userLat, userLon) {
    const earthRadius = 6371000; // Радиус Земли в метрах
    const dLat = THREE.MathUtils.degToRad(lat - userLat);
    const dLon = THREE.MathUtils.degToRad(lon - userLon);
    const x = earthRadius * dLon * Math.cos(THREE.MathUtils.degToRad(userLat));
    const z = earthRadius * dLat;
    return { x, z };
}

// === Загрузка данных зданий из Overpass API ===
async function loadBuildings() {
    const overpassApiUrl = 'https://overpass-api.de/api/interpreter';
    const bbox = [
        userPosition.latitude - 0.005, userPosition.longitude - 0.005,
        userPosition.latitude + 0.005, userPosition.longitude + 0.005,
    ].join(',');

    // OverpassQL запрос для получения зданий в области
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

    // Обработка результата
    const nodes = {};
    data.elements.forEach((element) => {
        if (element.type === "node") {
            nodes[element.id] = { lat: element.lat, lon: element.lon };
        }
    });

    data.elements.forEach((element) => {
        if (element.type === "way" && element.tags && element.tags.building) {
            const coordinates = element.nodes.map((nodeId) => nodes[nodeId]);
            createBuilding(coordinates, userPosition);
        }
    });
}

// === Создание 3D-модели здания ===
function createBuilding(coordinates, userPosition) {
    const shape = new THREE.Shape();

    coordinates.forEach((coord, index) => {
        const { x, z } = convertGeoToScene(coord.lat, coord.lon, userPosition.latitude, userPosition.longitude);
        if (index === 0) {
            shape.moveTo(x, z);
        } else {
            shape.lineTo(x, z);
        }
    });

    const extrudeSettings = { depth: 50, bevelEnabled: false };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    const buildingMesh = new THREE.Mesh(geometry, material);

    scene.add(buildingMesh);
}

// === Анимация ===
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// === Запуск загрузки зданий после получения позиции пользователя ===
setTimeout(() => {
    loadBuildings();
}, 3000);
