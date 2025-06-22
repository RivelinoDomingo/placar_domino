const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getMessaging} = require("firebase-admin/messaging");

initializeApp();

// Função que é acionada sempre que um documento de jogador é atualizado.
// A sintaxe agora usa onUpdate() e especifica o caminho do documento.
exports.playerUpdateNotifications =
  onDocumentUpdated("artifacts/{appId}/public/data/players/{playerId}",
      async (event) => {
        // Pega os dados do jogador ANTES e DEPOIS da atualização.
        const beforeData = event.data.before.data();
        const afterData = event.data.after.data();
        const playerName = afterData.name || "Um jogador";

        let notificationPayload = null;

        // 1. VERIFICAÇÃO DE MUDANÇA DE SÉRIE
        if (beforeData.series !== afterData.series) {
          const seriesOrder = ["Amador", "D", "C", "B", "A"];
          const oldIndex = seriesOrder.indexOf(beforeData.series || "Amador");
          const newIndex = seriesOrder.indexOf(afterData.series || "Amador");

          if (newIndex > oldIndex) {
            notificationPayload = {
              notification: {
                title: "🎉 Promoção no Placar!",
                body: `${playerName} foi promovido para a Série ` +
                      `${afterData.series}!`,
                icon: "/placar_domino/favicon.ico",
              },
            };
          } else if (newIndex < oldIndex) {
            notificationPayload = {
              notification: {
                title: "😬 Rebaixamento no Placar",
                body: `${playerName} foi rebaixado para a Série ` +
                      `${afterData.series}.`,
                icon: "/placar_domino/favicon.ico",
              },
            };
          }
        }

        // 2. VERIFICAÇÃO DE NOVAS CONQUISTAS
        const beforeAchievements = beforeData.conquistas || {};
        const afterAchievements = afterData.conquistas || {};
        for (const key in afterAchievements) {
          if (afterAchievements[key] > (beforeAchievements[key] || 0)) {
            const achievementNames = {
              primeiro_rei: "Primeiro Rei",
              imbativel: "Imbatível",
              desbravador: "Desbravador",
              azarao: "Azarão",
            };
            const achievementName =
                achievementNames[key] || "uma nova conquista";

            notificationPayload = {
              notification: {
                title: "⭐ Nova Conquista!",
                body: `${playerName} desbloqueou: ${achievementName}!`,
                icon: "/placar_domino/favicon.ico",
              },
            };
            break;
          }
        }

        // 3. ENVIA A NOTIFICAÇÃO
        if (notificationPayload) {
          try {
            notificationPayload.notification.icon =
              "/placar_domino/favicon.ico";
            const response =
              await getMessaging().sendToTopic("all", notificationPayload);

            console.log("Notificação enviada com sucesso:", response);
            return response;
          } catch (error) {
            console.error("Erro ao enviar notificação:", error);
            return error;
          }
        }

        return null;
      });
