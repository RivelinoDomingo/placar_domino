// Arquivo: functions/index.js - Versão final com depuração detalhada

const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const appIdentifier = "1:187178310074:web:5f56292dea8dc776532583";

exports.sendPromotionDemotionNotification = onDocumentUpdated(
    `artifacts/${appIdentifier}/public/data/players/{playerId}`,
    async (event) => {
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      if (beforeData.series === afterData.series) {
        logger.info(`Série do jogador ${afterData.name} não mudou.`);
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
        logger.warn("Nenhuma inscrição de notificação encontrada para enviar.");
        return;
      }

      const tokens = subscriptionsSnapshot.docs.map((doc) => doc.id);
      logger.info(`Encontrados ${tokens.length} tokens para enviar.`);

      const message = {
        data: {
          title: notificationTitle,
          body: notificationBody,
        },
        tokens: tokens,
      };

      try {
        const response = await messaging.sendMulticast(message);
        logger.info("Relatório de envio FCM:", {
          successCount: response.successCount,
          failureCount: response.failureCount,
        });

        // =================================================================
        // BLOCO DE DEPURAÇÃO DETALHADA - A PARTE MAIS IMPORTANTE
        // =================================================================
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(tokens[idx]);
              // Log detalhado do erro para cada token que falhou
              logger.error(`Falha ao enviar para o ` +
              `token [${tokens[idx]}]:`, resp.error);
            }
          });
          logger.error("Lista de tokens que falharam:", failedTokens);
        }
      } catch (error) {
        logger.error("Erro CRÍTICO ao chamar messaging.sendMulticast:", error);
      }
    },
);
