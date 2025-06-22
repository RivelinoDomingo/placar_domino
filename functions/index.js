const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

// Função que é acionada sempre que um documento de jogador é atualizado.
exports.playerUpdateNotifications = onDocumentUpdated("artifacts/{appId}/public/data/players/{playerId}", async (event) => {
  try {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const playerName = afterData.name || "Um jogador";
    let title = "";
    let body = "";

    // 1. Lógica para determinar se uma notificação deve ser enviada
    // (Verificação de mudança de série)
    if (beforeData.series !== afterData.series) {
      const seriesOrder = ["Amador", "D", "C", "B", "A"];
      const oldIndex = seriesOrder.indexOf(beforeData.series || "Amador");
      const newIndex = seriesOrder.indexOf(afterData.series || "Amador");
      if (newIndex > oldIndex) {
        title = "🎉 Promoção no Placar!";
        body = `${playerName} foi promovido para a Série ${afterData.series}!`;
      } else if (newIndex < oldIndex) {
        title = "😬 Rebaixamento no Placar";
        body = `${playerName} foi rebaixado para a Série ${afterData.series}.`;
      }
    } else { // (Verificação de conquistas)
      const beforeAchievements = beforeData.conquistas || {};
      const afterAchievements = afterData.conquistas || {};
      for (const key in afterAchievements) {
        if (afterAchievements[key] > (beforeAchievements[key] || 0)) {
          const achievementNames = { primeiro_rei: "Primeiro Rei", imbativel: "Imbatível", desbravador: "Desbravador", azarao: "Azarão" };
          title = "⭐ Nova Conquista!";
          body = `${playerName} desbloqueou: ${achievementNames[key] || "uma nova conquista"}!`;
          break;
        }
      }
    }

    // 2. Se um evento relevante aconteceu, busca todos os tokens e envia
    if (title && body) {
      const appIdentifier = event.params.appId;
      const subscriptionsPath = `artifacts/${appIdentifier}/public/data/subscriptions`;
      const subscriptionsSnapshot = await db.collection(subscriptionsPath).get();

      if (subscriptionsSnapshot.empty) {
        console.log("Nenhuma inscrição encontrada para enviar notificações.");
        return null;
      }

      const tokens = subscriptionsSnapshot.docs.map((doc) => doc.id);
      console.log(`Encontrados ${tokens.length} tokens. Preparando para enviar...`);

      const payload = {
        data: {
          title: title,
          body: body,
          icon: `https://rivelinodomingo.github.io/placar_domino/icone192.png`,
          badge: `https://rivelinodomingo.github.io/placar_domino/favicon.ico`,
        },
      };

      // Envia a notificação para todos os tokens
      const response = await getMessaging().sendToDevice(tokens, payload);

      // 3. Lógica de auto-limpeza de tokens inválidos (da sua v1.0)
      const tokensToDelete = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error("Falha ao enviar para o token", tokens[index], error);
          // Se o token não é mais válido, o removemos do banco de dados.
          if (error.code === "messaging/registration-token-not-registered") {
            tokensToDelete.push(db.collection(subscriptionsPath).doc(tokens[index]).delete());
          }
        }
      });

      await Promise.all(tokensToDelete);
      console.log("Envio concluído e limpeza de tokens inválidos realizada.");
    }
    return null;
  } catch (error) {
    console.error("Ocorreu um erro na função playerUpdateNotifications:", error);
    return null;
  }
});
