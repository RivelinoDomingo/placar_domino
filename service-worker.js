// Importa os scripts do Firebase. ATENÇÃO: a versão deve ser a mesma do seu app.
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

// Cole aqui a configuração do seu Firebase (o mesmo objeto do index.html)
const firebaseConfig = {
  apiKey: "AIzaSyBqpkxcl0GkBBHVO8Nxk7UpYd00H4Frklc",
  authDomain: "placar-domino.firebaseapp.com",
  projectId: "placar-domino",
  storageBucket: "placar-domino.firebasestorage.app",
  messagingSenderId: "187178310074",
  appId: "1:187178310074:web:5f56292dea8dc776532583",
  measurementId: "G-BL3W42DJ3M"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Obtém a instância do Messaging para lidar com as notificações em segundo plano
const messaging = firebase.messaging();

// Adiciona um ouvinte para quando uma notificação push é recebida
// enquanto o app está em segundo plano.
// CÓDIGO NOVO E CORRIGIDO
messaging.onBackgroundMessage((payload) => {
    console.log("[service-worker.js] Received background message ", payload);
    // Lendo os dados do campo 'data' que a Cloud Function agora envia
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.body,
        icon: "/placar_domino/icone192.png",
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});


// SEU CÓDIGO ANTIGO DE CACHE CONTINUA AQUI
const CACHE_NAME = 'domino-score-v5';
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
            console.log('Service Worker: Caching app shell');
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
    // Bypass para requisições do Firestore e não-GET
    const requestUrl = new URL(event.request.url);
    if (requestUrl.hostname.includes('firestore.googleapis.com') || event.request.method !== 'GET') {
        return event.respondWith(fetch(event.request));
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
