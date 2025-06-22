const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

// Define a região para a função, garantindo que ela
// rode perto do seu banco de dados.
const region = "southamerica-east1";

// A função agora é disparada quando um novo documento é criado em 'events'.
exports.eventNotifications = onDocumentCreated({
  document: "artifacts/{appId}/public/data/events/{eventId}",
  region: region,
}, async (event) => {
  try {
    const eventData = event.data.data();
    if (!eventData || !eventData.player || !eventData.text) {
      logger.warn("Evento mal formatado ou incompleto, encerrando.",
          event.data.id);
      return null;
    }

    logger.info("Novo evento detectado:", eventData);

    let title = "Novidade no Placar!";
    const body = `${eventData.player} ${eventData.text}`;

    // Personaliza o título com base no tipo de evento
    switch (eventData.type) {
      case "promotion": title = "🎉 Promoção no Placar!"; break;
      case "demotion": title = "😬 Rebaixamento no Placar"; break;
      case "achievement": title = "⭐ Nova Conquista!"; break;
    }

    const appIdentifier = event.params.appId;
    const subscriptionsPath =
      `artifacts/${appIdentifier}/public/data/subscriptions`;
    const subscriptionsSnapshot = await db.collection(subscriptionsPath).get();

    if (subscriptionsSnapshot.empty) {
      logger.warn("Nenhuma inscrição de notificação encontrada.");
      return null;
    }

    const tokens = subscriptionsSnapshot.docs.map((doc) => doc.id);
    if (tokens.length === 0) return null;

    logger.info(`Encontrados ${tokens.length} ` +
    `tokens para enviar a notificação.`);

    // Prepara o pacote da notificação
    const payload = {
      notification: {
        title: title,
        body: body,
        icon: `https://rivelinodomingo.github.io/placar_domino/icone192.png`,
      },
      data: { // Enviamos 'data' também para nosso service worker ter controle
        title: title,
        body: body,
        icon: `https://rivelinodomingo.github.io/placar_domino/icone192.png`,
      },
    };

    // Envia a notificação para a lista de tokens e aguarda a resposta
    const response = await getMessaging().sendToDevice(tokens, payload);

    // Lógica de auto-limpeza de tokens inválidos (da sua v1.0)
    const tokensToDelete = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        logger.error("Falha ao enviar para o token", tokens[index], error);
        if (error.code === "messaging/registration-token-not-registered") {
          logger.info(`Token [${tokens[index]}] está obsoleto. Removendo.`);
          tokensToDelete.push(db.collection(subscriptionsPath).
              doc(tokens[index]).delete());
        }
      }
    });

    // Executa a exclusão dos tokens inválidos
    if (tokensToDelete.length > 0) {
      await Promise.all(tokensToDelete);
      logger.info(`${tokensToDelete.length} tokens inválidos foram removidos.`);
    }

    logger.info("Ciclo de envio de notificações concluído.");
    return null;
  } catch (error) {
    logger.error("Erro crítico na função eventNotifications:", error);
    return null;
  }
});
