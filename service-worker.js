const CACHE_NAME = "placar_domino_cache_v1";
const urlsToCache = [
  "/placar_domino/",
  "/placar_domino/index.html",
  "/placar_domino/style.css",
  "/placar_domino/app.js",
  // adicione aqui outros arquivos estáticos importantes
];

// Instala o service worker e faz cache dos arquivos essenciais
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Ativa imediatamente a nova versão
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Ativa o novo service worker e remove caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      )
    )
  );
  return self.clients.claim(); // Garante que o novo SW controle as páginas imediatamente
});

// Intercepta requisições e responde com cache ou rede
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((response) =>
      response || fetch(event.request)
    )
  );
});

// Escuta mensagens de atualização manual
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Notificações push (Firebase Messaging usa isso)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const title = data.notification?.title || "Notificação";
    const options = {
      body: data.notification?.body || "",
      icon: data.notification?.icon || "/placar_domino/icons/icon-192x192.png",
      badge: data.notification?.badge || "/placar_domino/icons/badge.png",
      data: data.data || {},
      actions: data.notification?.actions || [],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Clique em notificações
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/placar_domino/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
