const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

// Define a região da função para rodar perto do seu banco de dados.
const region = "southamerica-east1";

// Função que é acionada sempre que um NOVO DOCUMENTO é criado em 'events'.
exports.eventNotifications = onDocumentCreated({
  document: "artifacts/{appId}/public/data/events/{eventId}",
  region: region,
}, async (event) => {
  try {
    const eventData = event.data.data();
    if (!eventData) {
      logger.info("Nenhum dado no evento, encerrando.");
      return null;
    }

    logger.info("Novo evento detectado:", eventData);

    let title = "Novidade no Placar!";
    let body = `${eventData.player} ${eventData.text}`;

    switch (eventData.type) {
      case "promotion":
        title = "🎉 Promoção no Placar!";
        body = `${eventData.player} ${eventData.text}`;
        break;
      case "demotion":
        title = "😬 Rebaixamento no Placar";
        body = `${eventData.player} ${eventData.text}`;
        break;
      case "achievement":
        title = "⭐ Nova Conquista!";
        body = `${eventData.player} ${eventData.text}`;
        break;
      case "stagnantico":
        title = "🤺 Nova Conquista!";
        body = `${eventData.player} ${eventData.text}`;
        break;
    }

    const appIdentifier = event.params.appId;
    // Caminho correto para a coleção 'subscriptions'
    const subscriptionsPath =
          `artifacts/${appIdentifier}/public/data/subscriptions`;
    const subscriptionsSnapshot =
          await db.collection(subscriptionsPath).get();

    if (subscriptionsSnapshot.empty) {
      logger.warn("Nenhuma inscrição de notificação encontrada.");
      return null;
    }

    const tokens = subscriptionsSnapshot.docs.map((doc) => doc.id);
    if (tokens.length === 0) return null;

    const payload = {
      notification: {
        title: title,
        body: body,
        icon: `https://rivelinodomingo.github.io/placar_domino/icone192.png`,
      },
      data: {
        title: title,
        body: body,
        icon: `https://rivelinodomingo.github.io/placar_domino/icone192.png`,
      },
    };

    // Envia a notificação para todos os tokens individualmente
    const response = await getMessaging().sendToDevice(tokens, payload);

    // --- INÍCIO DA LÓGICA DE AUTO-LIMPEZA (DA SUA v1.0) ---
    const tokensToDelete = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        logger.error("Falha ao enviar para o token:", tokens[index], error);
        // Se o token não é mais válido, o agendamos para remoção.
        if (error.code === "messaging/registration-token-not-registered") {
          logger.info(`Token [${tokens[index]}] ` +
            `está obsoleto. Removendo do Firestore.`);
          tokensToDelete.push(db.collection(subscriptionsPath).
              doc(tokens[index]).delete());
        }
      }
    });

    // Executa todas as exclusões de uma só vez.
    await Promise.all(tokensToDelete);
    logger.info("Envio concluído e limpeza de tokens inválidos realizada.");
    // --- FIM DA LÓGICA DE AUTO-LIMPEZA ---

    return null;
  } catch (error) {
    logger.error("Erro crítico na função eventNotifications:", error);
    return null;
  }
});
