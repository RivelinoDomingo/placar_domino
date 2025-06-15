// service-worker.js
// Um Service Worker minimalista para habilitar a funcionalidade de "Instalar na Tela Inicial"

const CACHE_NAME = 'domino-score-v5'; // Versão do cache, alterada para forçar atualização
const urlsToCache = [
    '/placar_domino/', // Caches a raiz do aplicativo (index.html na pasta placar_domino)
    '/placar_domino/index.html',
    '/placar_domino/manifest.json',
    '/placar_domino/icone192.png',
    '/placar_domino/icone512.png',
    '/placar_domino/favicon.ico', // Novo: Adicionado para cache do favicon
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
                // Usar Promise.allSettled para que mesmo se algumas URLs falharem, o SW ainda tente instalar
                return Promise.allSettled(urlsToCache.map(url => cache.add(url)))
                    .then(results => {
                        results.forEach(result => {
                            if (result.status === 'rejected') {
                                console.warn('Service Worker: Falha ao cachear URL:', result.reason);
                            }
                        });
                        console.log('Service Worker: Tentativa de cache de URLs concluída.');
                        // Não rejeitar a Promise aqui, permitindo a instalação mesmo com falhas parciais de cache
                        return; 
                    });
            })
            .catch(error => {
                console.error('Service Worker: Falha crítica na fase de instalação:', error);
                // Rejeitar a promessa para que o Service Worker não seja ativado
                return Promise.reject(error);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // IMPORTANTE: Bypassar requisições para o Firestore e outras APIs externas/não GET
    const requestUrl = new URL(event.request.url);

    // Regra 1: Bypass para o Firestore
    if (requestUrl.hostname.includes('firestore.googleapis.com')) {
        console.log('Service Worker: Bypassando requisição Firestore:', event.request.url);
        return event.respondWith(fetch(event.request));
    }

    // Regra 2: Bypass para requisições que não sejam GET (POST, PUT, DELETE, etc.)
    // APIs geralmente não devem ser cacheadas para escrita de dados
    if (event.request.method !== 'GET') {
        console.log('Service Worker: Bypassando requisição não GET:', event.request.url);
        return event.respondWith(fetch(event.request));
    }

    // Para todas as outras requisições GET (assets estáticos), tentar servir do cache primeiro, depois da rede.
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Se encontrar no cache, retorna a resposta do cache
            if (response) {
                console.log('Service Worker: Servindo do cache:', event.request.url);
                return response;
            }

            // Se não encontrar no cache, tenta buscar na rede
            return fetch(event.request)
                .then(networkResponse => {
                    // Opcional: Cachear novas requisições GET após buscá-las da rede
                    // Cuidado com o tamanho do cache e a relevância dos assets dinâmicos
                    // if (networkResponse.ok) { // Apenas cachear respostas bem-sucedidas
                    //     const responseToCache = networkResponse.clone();
                    //     caches.open(CACHE_NAME).then(cache => {
                    //         cache.put(event.request, responseToCache);
                    //     });
                    // }
                    console.log('Service Worker: Servindo da rede:', event.request.url);
                    return networkResponse;
                })
                .catch(error => {
                    console.error('Service Worker: Erro durante o fetch (cache miss e falha de rede):', event.request.url, error);
                    // Opcional: retornar uma página de fallback offline para URLs que não foram cacheadas
                    // return caches.match('/offline.html');
                    // Ou apenas rejeitar a promessa, deixando o navegador lidar com o erro de rede
                    throw error; 
                });
        }).catch(error => {
            console.error('Service Worker: Erro durante a correspondência de cache ou fetch inicial:', event.request.url, error);
            // Captura erros que ocorrem antes mesmo do fetch da rede, por exemplo, problemas de acesso ao cache
            throw error; 
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
