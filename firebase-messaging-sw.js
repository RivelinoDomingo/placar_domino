// DEBUG: Service Worker - Início do arquivo. Se esta mensagem aparecer, o arquivo foi encontrado.
console.log("[SW] Service Worker está sendo lido pelo navegador.");

// Importa os scripts do Firebase (versão compatível para Service Workers)
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

console.log("[SW] Scripts do Firebase importados.");

// Sua configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBqpkxcl0GkBBHVO8Nxk7UpYd00H4Frklc",
    authDomain: "placar-domino.firebaseapp.com",
    projectId: "placar-domino",
    storageBucket: "placar-domino.firebasestorage.app",
    messagingSenderId: "187178310074",
    appId: "1:187178310074:web:5f56292dea8dc776532583",
};

try {
    firebase.initializeApp(firebaseConfig);
    console.log("[SW] Firebase inicializado com sucesso.");

    const messaging = firebase.messaging();
    console.log("[SW] Firebase Messaging instanciado.");

    // Este é o "ouvinte" principal. Se ele for configurado, o SW está pronto para receber.
    messaging.onBackgroundMessage((payload) => {
        console.log("[SW] MENSAGEM RECEBIDA EM SEGUNDO PLANO!", payload);

        // DEBUG: Mostra o conteúdo exato do 'data' que recebemos do backend.
        console.log("[SW] Payload.data recebido:", payload.data);

        const notificationTitle = payload.data?.title || "Notificação do Placar";
        const notificationOptions = {
            body: payload.data?.body || "Você tem uma nova atualização.",
            icon: payload.data?.icon || "/placar_domino/icone192.png",
            badge: payload.data?.badge || "/placar_domino/favicon.ico",
        };

        console.log("[SW] Título da Notificação:", notificationTitle);
        console.log("[SW] Opções da Notificação:", notificationOptions);

        console.log("[SW] TENTANDO MOSTRAR A NOTIFICAÇÃO...");
        try {
            self.registration.showNotification(notificationTitle, notificationOptions);
            console.log("[SW] SUCESSO: showNotification foi chamado sem erros.");
        } catch (err) {
            console.error("[SW] ERRO AO CHAMAR showNotification:", err);
        }
    });

    console.log("[SW] 'onBackgroundMessage' configurado. Service Worker está pronto e ouvindo.");

} catch (error) {
    console.error("[SW] ERRO CRÍTICO na inicialização do Firebase no Service Worker:", error);
}

// Os seus listeners de cache para o PWA (não mudam)
self.addEventListener('install', (event) => { /* ... */ });
self.addEventListener('activate', (event) => { /* ... */ });
self.addEventListener('fetch', (event) => { /* ... */ });
