const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {getFirestore} = require("firebase-admin/firestore");
const {initializeApp, applicationDefault} = require("firebase-admin/app");
const {getMessaging} = require("firebase-admin/messaging");
const {logger} = require("firebase-functions");

initializeApp({credential: applicationDefault()});

const appIdentifier = "1:187178310074:web:5f56292dea8dc776532583";

exports.sendNotification = onDocumentCreated(
    `artifacts/${appIdentifier}/public/data/events/{eventId}`,
    async (event) => {
      const db = getFirestore();
      const eventData = event.data.data();

      if (!eventData || !eventData.player || !eventData.text) {
        logger.warn("Evento mal formatado ou incompleto:", eventData);
        return null;
      }

      const {player, text, type} = eventData;

      let title = "Nova Atualização no Placar!";
      const body = `${player} ${text}`;

      if (type === "promotion") {
        title = "📈 Promoção!";
      } else if (type === "demotion") {
        title = "📉 Rebaixamento!";
      } else if (type === "achievement") {
        title = "🏆 Conquista!";
      }

      const tokensSnapshot = await db
          .collection(`artifacts/${appIdentifier}/public/data/subscriptions`)
          .get();

      if (tokensSnapshot.empty) {
        logger.info("Nenhuma inscrição encontrada.");
        return null;
      }

      const tokens = tokensSnapshot.docs.map((doc) => doc.id);

      const message = {
        notification: {title, body},
        tokens,
        webpush: {
          fcmOptions: {
            link: "https://rivelinodomingo.github.io/placar_domino/",
          },
        },
      };

      try {
        const response = await getMessaging().sendMulticast(message);

        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) failedTokens.push(tokens[idx]);
        });

        if (failedTokens.length > 0) {
          logger.warn("Removendo tokens inválidos:", failedTokens);
          const batch = db.batch();
          failedTokens.forEach((token) => {
            const ref = db.doc(`artifacts/${appIdentifier}/public/data` +
            `/subscriptions/${token}`);
            batch.delete(ref);
          });
          await batch.commit();
        }

        logger.info("Notificações enviadas com sucesso:",
            response.successCount);
        return null;
      } catch (error) {
        logger.error("Erro ao enviar notificações:", error);
        return null;
      }
    },
);
