// Este é o código corrigido para o arquivo
// functions/index.js usando a SINTAXE V2

const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const appIdentifier = "1:187178310074:web:5f56292dea8dc776532583";

// A sintaxe para V2 é diferente. Usamos onDocumentUpdated e passamos o caminho.
exports.sendPromotionDemotionNotification = onDocumentUpdated(
    `artifacts/${appIdentifier}/public/data/players/{playerId}`,
    async (event) => {
      // No V2, os dados "before" e "after" ficam dentro de event.data
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      // A lógica interna continua a mesma
      if (beforeData.series === afterData.series) {
        // Usando o logger do V2, que é a prática recomendada
        logger.info(
            `Série do jogador ${afterData.name}` +
            `não mudou. Nenhuma notificação.`,
        );
        return;
      }

      let notificationTitle = "Atualização no Placar!";
      let notificationBody = "";

      const seriesOrder = ["A", "B", "C", "D", "Amador"];
      const beforeIndex = seriesOrder.indexOf(beforeData.series);
      const afterIndex = seriesOrder.indexOf(afterData.series);

      if (afterIndex < beforeIndex) {
        notificationTitle = "🎉 Promoção no Placar! 🎉";
        notificationBody = `${afterData.name} subiu da Série ` +
                           `${beforeData.series} para a Série ` +
                           `${afterData.series}!`;
      } else {
        notificationTitle = "⬇️ Rebaixamento no Placar ⬇️";
        notificationBody = `${afterData.name} caiu da Série ` +
                           `${beforeData.series} para a Série ` +
                           `${afterData.series}.`;
      }

      logger.info(`Enviando notificação: ${notificationBody}`);

      const subscriptionsPath =
          `artifacts/${appIdentifier}/public/data/subscriptions`;
      const subscriptionsSnapshot =
      await db.collection(subscriptionsPath).get();

      if (subscriptionsSnapshot.empty) {
        logger.info("Nenhuma inscrição de notificação encontrada.");
        return;
      }

      const tokens = subscriptionsSnapshot.docs.map((doc) => doc.id);

      const message = {
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        tokens: tokens,
      };

      try {
        const response = await messaging.sendMulticast(message);
        logger.info(
            "Notificações enviadas com sucesso:",
            response.successCount,
        );
        if (response.failureCount > 0) {
          logger.warn(
              "Falha ao enviar para alguns tokens:",
              response.failureCount,
          );
        }
      } catch (error) {
        logger.error("Erro ao enviar notificações:", error);
      }
    },
);
