const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const {logger} = require("firebase-functions");

initializeApp();
const db = getFirestore();

// Define a região para a função, garantindo que
// ela rode perto do seu banco de dados.
const region = "southamerica-east1";

exports.playerUpdateNotifications = onDocumentUpdated({
  document: "artifacts/{appId}/public/data/players/{playerId}",
  region: region,
}, async (event) => {
  try {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    // const playerName = afterData.name || "Um jogador";
    const title = "";
    const body = "";

    // 1. Lógica para determinar o que mudou
    // (promoção, rebaixamento ou conquista)
    if (beforeData.series !== afterData.series) {
      // ... (sua lógica de promoção/rebaixamento aqui) ...
    } else {
      const beforeAchievements = beforeData.conquistas || {};
      const afterAchievements = afterData.conquistas || {};
      for (const key in afterAchievements) {
        if (afterAchievements[key] > (beforeAchievements[key] || 0)) {
          // ... (sua lógica de conquistas aqui) ...
          break;
        }
      }
    }

    // 2. Se um evento relevante aconteceu, busca todos os tokens e envia
    if (title && body) {
      const appIdentifier = event.params.appId;
      const subscriptionsPath =
        `artifacts/${appIdentifier}/public/data/subscriptions`;
      const subscriptionsSnapshot =
        await db.collection(subscriptionsPath).get();

      if (subscriptionsSnapshot.empty) {
        logger.warn("Nenhuma inscrição de notificação encontrada.");
        return null;
      }

      const tokens = subscriptionsSnapshot.docs.map((doc) => doc.id);
      logger.info(`Encontrados ${tokens.length} ` +
        `tokens para enviar a notificação.`);

      const payload = {
        data: {
          title: title,
          body: body,
          icon: `https://rivelinodomingo.github.io/placar_domino/icone192.png`,
          badge: `https://rivelinodomingo.github.io/placar_domino/favicon.ico`,
        },
      };

      // 3. Envia a notificação para todos os tokens individualmente
      const response = await getMessaging().sendToDevice(tokens, payload);

      // 4. Lógica de auto-limpeza de tokens inválidos (inspirada na sua v1.0)
      const tokensToDelete = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          logger.error("Falha ao enviar para o token", tokens[index], error);
          // Se o token não é mais válido, o removemos do banco de dados.
          if (error.code === "messaging/registration-token-not-registered") {
            tokensToDelete.push(db.collection(subscriptionsPath).
                doc(tokens[index]).delete());
          }
        }
      });

      await Promise.all(tokensToDelete);
      logger.info("Envio concluído e limpeza de tokens inválidos realizada.");
    }
    return null;
  } catch (error) {
    logger.error("Ocorreu um erro crítico na função" +
      "playerUpdateNotifications:", error);
    return null;
  }
});
