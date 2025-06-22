// Importa os scripts do Firebase (versão compatível para Service Workers)
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

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// CÓDIGO NOVO E CORRIGIDO para lidar com o payload 'data'
messaging.onBackgroundMessage((payload) => {
    console.log("[service-worker.js] Mensagem em segundo plano recebida: ", payload);

    // Extrai o título e o corpo do objeto 'data'
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.body,
        icon: payload.data.icon,
        badge: payload.data.badge, // Importante para ícones na barra de status do Android
    };

    // Exibe a notificação
    self.registration.showNotification(notificationTitle, notificationOptions);
});
