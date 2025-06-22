const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getMessaging} = require("firebase-admin/messaging");

initializeApp();

exports.playerUpdateNotifications =
onDocumentUpdated("artifacts/{appId}/public/data/players/{playerId}",
    async (event) => {
      try {
        const beforeData = event.data.before.data();
        const afterData = event.data.after.data();
        const playerName = afterData.name || "Um jogador";

        let title = "";
        let body = "";

        // 1. VERIFICAÇÃO DE MUDANÇA DE SÉRIE
        if (beforeData.series !== afterData.series) {
          const seriesOrder = ["Amador", "D", "C", "B", "A"];
          const oldIndex = seriesOrder.indexOf(beforeData.series || "Amador");
          const newIndex = seriesOrder.indexOf(afterData.series || "Amador");

          if (newIndex > oldIndex) {
            title = "🎉 Promoção no Placar!";
            body = `${playerName} foi promovido para a Série ` +
                   `${afterData.series}!`;
          } else if (newIndex < oldIndex) {
            title = "😬 Rebaixamento no Placar";
            body = `${playerName} foi rebaixado para a Série ` +
                   `${afterData.series}.`;
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
            const achievementName = achievementNames[key] || "uma " +
            "nova conquista";
            title = "⭐ Nova Conquista!";
            body = `${playerName} desbloqueou: ${achievementName}!`;
            break;
          }
        }

        // 3. ENVIA A NOTIFICAÇÃO (SE HOUVER TÍTULO E CORPO)
        if (title && body) {
          // Formata a notificação dentro do campo 'data'
          // para máxima compatibilidade
          const payload = {
            topic: "all",
            data: {
              title: title,
              body: body,
              icon: "https://rivelinodomingo.github.io/placar_domino/icone192.png",
              badge: "https://rivelinodomingo.github.io/placar_domino/icone-badge.png", // Ícone pequeno para a barra de status
            },
          };

          await getMessaging().send(payload); // Usar send()
          // é mais moderno que sendToTopic()
          console.log("Notificação enviada com sucesso:", payload.data.title);
        }

        return null;
      } catch (error) {
        console.error("Ocorreu um erro na função" +
        "playerUpdateNotifications:", error);
        return null;
      }
    });
