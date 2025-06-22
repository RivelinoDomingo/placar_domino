// ATENÇÃO: Use a sintaxe -compat para Service Workers
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

// Sua configuração do Firebase (exatamente a mesma do seu index.html)
const firebaseConfig = {
    apiKey: "AIzaSyBqpkxcl0GkBBHVO8Nxk7UpYd00H4Frklc",
    authDomain: "placar-domino.firebaseapp.com",
    projectId: "placar-domino",
    storageBucket: "placar-domino.firebasestorage.app",
    messagingSenderId: "187178310074",
    appId: "1:187178310074:web:5f56292dea8dc776532583",
};

// Inicializa o Firebase no service worker
firebase.initializeApp(firebaseConfig);

// Obtém a instância do Messaging
const messaging = firebase.messaging();

// Este bloco lida com as notificações quando seu site está em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Mensagem em segundo plano recebida: ", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/placar_domino/favicon.ico', // Caminho correto para o ícone no GitHub Pages
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
