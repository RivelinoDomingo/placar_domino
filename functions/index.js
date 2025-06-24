// Arquivo: functions/index.js - Versão final com auto-limpeza de tokens

const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const appIdentifier = "1:187178310074:web:5f56292dea8dc776532583";

// Define a região para a função, garantindo
// que ela rode perto do seu banco de dados.
// const region = "southamerica-east1";

exports.sendPromotionDemotionNotification = onDocumentUpdated(`artifacts/` +
  `${appIdentifier}/public/data/events/{eventId}`, async (event) => {
  const eventData = event.data.data();
  if (!eventData || !eventData.player || !eventData.text) {
    logger.warn("Evento mal formatado ou incompleto, " +
              "encerrando.", event.data.id);
    return null;
  }

  logger.info("Novo evento detectado:", eventData);

  let title = "Novidade no Placar!";
  const body = `${eventData.player} ${eventData.text}`;

  switch (eventData.type) {
    case "promotion":
      title = "🎉 Promoção no Placar!";
      break;
    case "demotion":
      title = "😬 Rebaixamento no Placar";
      break;
    case "achievement":
      title = "⭐ Nova Conquista!";
      break;
    case "stagnant":
      title = "🤺 Nova Conquista!";
      break;
  }

  logger.info(`Preparando notificação: ${eventData}`);

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
      title: title,
      body: body,
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
        if (error.code ===
                "messaging/registration-token-not-registered") {
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
    logger.error("Erro CRÍTICO durante o processamento" +
            "dos envios:", error);
  }
},
);
