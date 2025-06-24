const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const {logger} = require("firebase-functions");

initializeApp();

const db = getFirestore();
const appIdentifier = "1:187178310074:web:5f56292dea8dc776532583";
// Define a região da função para rodar perto do seu banco de dados.
const region = "southamerica-east1";

exports.sendNotification = onDocumentCreated({
  document: `artifacts/${appIdentifier}/public/data/events/{eventId}`,
  region: region}, async (event) => {
  const eventData = event.data.data();

  if (!eventData || !eventData.player || !eventData.text) {
    logger.warn("Evento mal formatado ou incompleto:", eventData);
    return null;
  }

  const {player, text, type} = eventData;

  let title = "Nova Atualização no Placar!";
  const body = `${player} ${text}`;

  if (type === "promotion") title = "📈 Promoção!";
  else if (type === "demotion") title = "📉 Rebaixamento!";
  else if (type === "achievement") title = "🏆 Conquista!";

  const subscriptionsRef = db.collection(
      `artifacts/${appIdentifier}/public/data/subscriptions`,
  );
  const snapshot = await subscriptionsRef.get();

  if (snapshot.empty) {
    logger.info("Nenhum token encontrado.");
    return null;
  }

  const tokens = snapshot.docs.map((doc) => doc.id);
  const payload = {
    notification: {title, body},
    webpush: {
      fcmOptions: {
        link: "https://rivelinodomingo.github.io/placar_domino/index.html",
      },
    },
  };

  const sendResults = await Promise.allSettled(
      tokens.map((token) =>
        getMessaging().send({...payload, token}).catch((err) => {
          logger.error(`Erro ao enviar para ${token}:`, err.message);
          if (
            err.code === "messaging/invalid-argument" ||
            err.code === "messaging/registration-token-not-registered"
          ) {
            logger.info(`Token inválido/removido: ${token}`);
            return subscriptionsRef.doc(token).delete();
          }
        }),
      ),
  );

  const successCount = sendResults.filter(
      (res) => res.status === "fulfilled",
  ).length;
  const failureCount = sendResults.length - successCount;

  logger.info(`Envio concluído. Sucesso: ${successCount},
        Falha: ${failureCount}`);
},
);
