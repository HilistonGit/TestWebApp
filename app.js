const map = DG.map('map', {
    center: [55.751244, 37.618423], // Москва
    zoom: 18,
    tilt: 45, // Наклон карты (начальный)
    rotation: 0, // Поворот карты
});

// Включение камеры устройства
async function startCamera() {
    const video = document.getElementById('video');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        console.error('Ошибка доступа к камере:', error);
    }
}

// Обновление положения карты на основе GPS
function updateLocation(position) {
    const { latitude, longitude } = position.coords;
    map.setView([latitude, longitude], map.getZoom());
}

// Инициализация GPS
function initGPS() {
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(updateLocation, (err) => {
            console.error('Ошибка GPS:', err);
        });
    } else {
        console.error('GPS недоступен');
    }
}

// Обновление виртуальной камеры карты
function updateVirtualCamera(alpha, beta, gamma) {
    const tilt = Math.max(0, Math.min(90, beta)); // Угол наклона (0-90 градусов)
    const bearing = alpha; // Азимут

    map.setView(map.getCenter(), map.getZoom(), { tilt: tilt, rotation: bearing });
}

// Обработка данных гироскопа
function initSensors() {
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (event) => {
            const { alpha, beta, gamma } = event;
            updateVirtualCamera(alpha, beta, gamma);
        });
    } else {
        console.error('Гироскоп недоступен');
    }
}

// Запуск приложения
async function startApp() {
    await startCamera();
    initGPS();
    initSensors();
}

startApp();
