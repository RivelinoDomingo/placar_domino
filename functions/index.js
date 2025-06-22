// Arquivo: functions/index.js - Versão final com auto-limpeza de tokens

const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const appIdentifier = "1:187178310074:web:5f56292dea8dc776532583";

exports.sendPromotionDemotionNotification = onDocumentUpdated(
    `artifacts/${appIdentifier}/public/data/players/{playerId}`,
    async (event) => {
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      if (beforeData.series === afterData.series) {
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

      logger.info(`Preparando notificação: ${notificationBody}`);

      const subscriptionsPath =
          `artifacts/${appIdentifier}/public/data/subscriptions`;
      const subscriptionsSnapshot =
        await db.collection(subscriptionsPath).get();

      if (subscriptionsSnapshot.empty) {
        logger.warn("Nenhuma inscrição encontrada.");
        return;
      }

      const tokens = subscriptionsSnapshot.docs.map((doc) => doc.id);
      logger.info(`Encontrados ${tokens.length} tokens para enviar.`);

      const payload = {
        data: {
          title: notificationTitle,
          body: notificationBody,
        },
      };

      const sendPromises = tokens.map((token) => {
        return admin.messaging().send({
          token: token,
          data: payload.data,
        });
      });

      try {
        const results = await Promise.allSettled(sendPromises);
        let successCount = 0;
        let failureCount = 0;

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            failureCount++;
            const error = result.reason;
            const failedToken = tokens[index];

            logger.error(`Falha ao enviar para o token ` +
            `[${failedToken}]:`, error);

            // =======================================================
            // ADIÇÃO: LÓGICA DE AUTO-LIMPEZA
            // Se o erro for de token não registrado, apague-o do banco!
            // =======================================================
            if (error.code === "messaging/registration-token-not-registered") {
              logger.info(`Token [${failedToken}] ` +
              `está obsoleto. Removendo do Firestore.`);
              db.collection(subscriptionsPath).doc(failedToken).delete();
            }
          }
        });

        logger.info("Relatório de envio final:", {
          successCount: successCount,
          failureCount: failureCount,
        });
      } catch (error) {
        logger.error("Erro CRÍTICO durante o processamento dos envios:", error);
      }
    },
);
