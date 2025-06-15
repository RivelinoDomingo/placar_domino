// service-worker.js
// Um Service Worker minimalista para habilitar a funcionalidade de "Instalar na Tela Inicial"

self.addEventListener('install', (event) => {
    // O Service Worker está sendo instalado.
    // Você pode usar isso para pré-cachear recursos se o aplicativo fosse offline-first.
    console.log('Service Worker: Evento de instalação disparado.');
    event.waitUntil(
        caches.open('domino-score-v1').then((cache) => {
            return cache.addAll([
                './', // Caches o próprio index.html
                './index.html',
                './manifest.json',
                // Adicione outros arquivos importantes para o funcionamento offline
                // 'https://cdn.tailwindcss.com', // Se quiser cachear o CDN, cuidado com versões
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Este Service Worker apenas passa as requisições,
    // mas é necessário para o PWA funcionar no Chrome e Android.
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

self.addEventListener('activate', (event) => {
    // O Service Worker está ativo. Limpeza de caches antigos pode acontecer aqui.
    console.log('Service Worker: Evento de ativação disparado.');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== 'domino-score-v1') { // Substitua 'domino-score-v1' pelo nome do seu cache atual
                        console.log('Service Worker: Limpando cache antigo', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

