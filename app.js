import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';

// === Инициализация камеры ===
const video = document.getElementById('camera-feed');
navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
        video.srcObject = stream;
        video.play();
    })
    .catch(console.error);

// === Инициализация Three.js ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Добавление "3D зданий" ===
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const building = new THREE.Mesh(geometry, material);
scene.add(building);

// Позиция здания (пример)
building.position.set(0, 0, -5); // 5 метров перед камерой

// === GPS и гироскоп ===
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        console.log(`GPS координаты: ${latitude}, ${longitude}`);
        // Используйте координаты для смещения объектов на карте
    });
}

if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (event) => {
        const { alpha, beta, gamma } = event;
        camera.rotation.y = THREE.MathUtils.degToRad(alpha || 0);
        camera.rotation.x = THREE.MathUtils.degToRad(beta || 0);
        camera.rotation.z = THREE.MathUtils.degToRad(gamma || 0);
    });
}

// === Анимация сцены ===
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
