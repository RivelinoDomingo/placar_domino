const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const appIdentifier = "1:187178310074:web:5f56292dea8dc776532583"; // Seu App ID

exports.sendPromotionDemotionNotification = functions.firestore
    .document(`artifacts/${appIdentifier}/public/data/players/{playerId}`)
    .onUpdate(async (change, context) => {
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Verifica se a série do jogador mudou
        if (beforeData.series === afterData.series) {
            console.log(`Série do jogador ${afterData.name} não mudou. Nenhuma notificação enviada.`);
            return null;
        }

        let notificationTitle = "Atualização no Placar!";
        let notificationBody = "";

        const seriesOrder = ['A', 'B', 'C', 'D', 'Amador'];
        const beforeIndex = seriesOrder.indexOf(beforeData.series);
        const afterIndex = seriesOrder.indexOf(afterData.series);

        if (afterIndex < beforeIndex) {
            // Promoção
            notificationTitle = "🎉 Promoção no Placar! 🎉";
            notificationBody = `${afterData.name} subiu da Série ${beforeData.series} para a Série ${afterData.series}!`;
        } else {
            // Rebaixamento
            notificationTitle = "⬇️ Rebaixamento no Placar ⬇️";
            notificationBody = `${afterData.name} caiu da Série ${beforeData.series} para a Série ${afterData.series}.`;
        }
        
        console.log(`Enviando notificação: ${notificationBody}`);

        // Busca todos os tokens de inscrição salvos no Firestore
        const subscriptionsSnapshot = await db.collection(`artifacts/${appIdentifier}/public/data/subscriptions`).get();
        
        if (subscriptionsSnapshot.empty) {
            console.log("Nenhuma inscrição de notificação encontrada.");
            return null;
        }

        const tokens = subscriptionsSnapshot.docs.map(doc => doc.id);

        // Monta a mensagem da notificação
        const message = {
            notification: {
                title: notificationTitle,
                body: notificationBody,
            },
            tokens: tokens, // Envia para todos os tokens
        };

        // Envia a mensagem via FCM
        try {
            const response = await messaging.sendMulticast(message);
            console.log("Notificações enviadas com sucesso:", response.successCount);
            if (response.failureCount > 0) {
                console.log("Falha ao enviar para alguns tokens:", response.failureCount);
            }
        } catch (error) {
            console.error("Erro ao enviar notificações:", error);
        }
        
        return null;
    });
