// service-worker.js
// Um Service Worker minimalista para habilitar a funcionalidade de "Instalar na Tela Inicial"

const CACHE_NAME = 'domino-score-v2'; // Versão do cache, alterada para forçar atualização
const urlsToCache = [
    '/placar_domino/', // Caches a raiz do aplicativo (index.html na pasta placar_domino)
    '/placar_domino/index.html',
    '/placar_domino/manifest.json',
    // Não cachearemos o Tailwind CSS do CDN aqui, para evitar possíveis erros CORS durante a instalação.
    // Se você precisar de funcionalidade offline para o Tailwind,
    // considere baixá-lo e servi-lo localmente.
];

self.addEventListener('install', (event) => {
    console.log('Service Worker: Evento de instalação disparado.');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Abrindo cache e adicionando URLs.');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Falha ao adicionar URLs ao cache durante a instalação:', error);
                // Rejeitar a promessa para que o Service Worker não seja ativado
                // se o cache falhar, o que pode causar o TypeError.
                return Promise.reject(error);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Este Service Worker tenta servir do cache primeiro, depois da rede.
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(error => {
            // Catch all errors during fetch to prevent the browser from showing a network error.
            console.error('Service Worker: Erro durante o fetch:', error);
            // Optionally, return a fallback page for offline mode
            // return caches.match('/offline.html');
        })
    );
});

self.addEventListener('activate', (event) => {
    // O Service Worker está ativo. Limpeza de caches antigos pode acontecer aqui.
    console.log('Service Worker: Evento de ativação disparado.');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) { // Remove caches antigos que não correspondem à versão atual
                        console.log('Service Worker: Limpando cache antigo', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
