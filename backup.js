const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

// Inicializa o app Firebase com as credenciais da Service Account
// O JSON da chave vem da variável de ambiente que o GitHub Actions fornecerá
initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
});

const db = getFirestore();
const backupData = {};
const collectionsToBackup = ['players', 'events', 'subscriptions'];
const appIdentifier = "1:187178310074:web:5f56292dea8dc776532583"; // Seu App ID

async function createBackup() {
  console.log('Iniciando o processo de backup...');

  for (const collectionName of collectionsToBackup) {
    console.log(`Fazendo backup da coleção: ${collectionName}...`);
    const collectionPath = `artifacts/${appIdentifier}/public/data/${collectionName}`;
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();

    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });

    backupData[collectionName] = docs;
  }

  // O nome do arquivo será passado como argumento pelo GitHub Action
  const fileName = process.argv[2];
  if (!fileName) {
    console.error('Nome do arquivo de backup não fornecido!');
    process.exit(1);
  }

  fs.writeFileSync(fileName, JSON.stringify(backupData, null, 2));
  console.log(`Backup concluído com sucesso! Salvo em ${fileName}`);
}

createBackup().catch(error => {
  console.error('Ocorreu um erro durante o backup:', error);
  process.exit(1);
});
