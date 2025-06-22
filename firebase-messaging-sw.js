// Importa os scripts do Firebase (versão compatível, essencial para Service Workers)
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBqpkxcl0GkBBHVO8Nxk7UpYd00H4Frklc",
    authDomain: "placar-domino.firebaseapp.com",
    projectId: "placar-domino",
    storageBucket: "placar-domino.firebasestorage.app",
    messagingSenderId: "187178310074",
    appId: "1:187178310074:web:5f56292dea8dc776532583",
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// --- TAREFA 1: O "CARTEIRO" ---
// Lida com as notificações quando o app está em segundo plano.
messaging.onBackgroundMessage((payload) => {
    console.log("[SW] Mensagem em segundo plano recebida:", payload);

    // Extrai o título e o corpo do envelope 'data'
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.body,
        icon: payload.data.icon,
        badge: payload.data.badge,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});


// --- TAREFA 2: O "GERENTE DE ARMAZÉM" (Seu código de cache) ---
const CACHE_NAME = 'domino-score-v6'; // Mude a versão para forçar a atualização do cache
const urlsToCache = [
    '/placar_domino/',
    '/placar_domino/index.html',
    '/placar_domino/manifest.json',
    '/placar_domino/icone192.png',
    '/placar_domino/icone512.png',
    '/placar_domino/favicon.ico',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Caching app shell');
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    if (requestUrl.hostname.includes('firestore.googleapis.com') || event.request.method !== 'GET') {
        return; // Deixa o navegador lidar com isso
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
