// Importa os scripts do Firebase no topo (versão compat para Service Workers)
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// 1. Inicializa o Firebase dentro do Worker
// Use as suas credenciais aqui
firebase.initializeApp({
  apiKey: "AIzaSyBqpkxcl0GkBBHVO8Nxk7UpYd00H4Frklc",
  projectId: "placar-domino",
  messagingSenderId: "187178310074",
  appId: "1:187178310074:web:5f56292dea8dc776532583"
});

const messaging = firebase.messaging();

// 2. Mantém sua lógica de Cache (PWA)
const CACHE_NAME = "placar_domino_cache_v1.3";
const urlsToCache = [
  "/placar_domino/",
  "/placar_domino/index.html",
  "/placar_domino/manifest.json",
  "/placar_domino/favicon.ico",
  "/placar_domino/icons/icone192.png",
  "/placar_domino/icons/icone512.png",
  "/placar_domino/icons/icone1024.png"
  // ... adicione os outros arquivos aqui
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      )
    )
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// 3. Listener do Firebase para mensagens em Background
// Isso é o que fará o Firefox mostrar a notificação corretamente
messaging.onBackgroundMessage((payload) => {
    console.log('Mensagem em background recebida:', payload);
    const title = payload.notification.title;
    const options = {
        body: payload.notification.body,
        // Caminho absoluto para garantir que o ícone carregue
        icon: 'https://rivelinodomingo.github.io/placar_domino/icons/icon-192.png',
        badge: 'https://rivelinodomingo.github.io/placar_domino/icons/icon-192.png',
        data: payload.fcmOptions?.link || '/placar_domino/'
    };

    self.registration.showNotification(title, options);
});
