// Script de correção pontual (rodar uma vez): recalcula o campo de cache
// ChatThread.lastMessage (e lastMessageAt/lastMessageUserId/lastMessageUserName) a partir
// da última ChatMessage já salva de cada thread. Necessário porque esse campo era truncado
// em 40 caracteres antes do aumento para 200 — threads antigos ficaram com a prévia curta
// mesmo depois do limite ter sido aumentado, já que o valor salvo não é recalculado sozinho.
// Não cria, edita nem envia nenhuma mensagem — só reescreve esse campo de cache.
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '1.1.1.1']); // contorno de DNS local, ver local-dev-entry.js
const mongoose = require('mongoose');
const ChatThread = require('../models/chatThread.model');
const ChatMessage = require('../models/chatMessage.model');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado ao MongoDB.');

  const threads = await ChatThread.find({}).select('_id lastMessage');
  console.log(`Encontrados ${threads.length} threads.`);

  let updated = 0;
  let unchanged = 0;
  let emptied = 0;

  for (const thread of threads) {
    const latestMessage = await ChatMessage.findOne({ thread: thread._id }).sort({ createdAt: -1 });

    if (!latestMessage) {
      if (thread.lastMessage) {
        await ChatThread.updateOne({ _id: thread._id }, { $set: { lastMessage: '' } });
        emptied += 1;
      }
      continue;
    }

    const newLastMessage = (latestMessage.content || '').substring(0, 200);
    if (newLastMessage === thread.lastMessage) {
      unchanged += 1;
      continue;
    }

    await ChatThread.updateOne(
      { _id: thread._id },
      {
        $set: {
          lastMessage: newLastMessage,
          lastMessageAt: latestMessage.createdAt,
          lastMessageUserId: latestMessage.sender || null,
          lastMessageUserName: latestMessage.senderName || ''
        }
      }
    );
    updated += 1;
  }

  console.log(`Concluído. Atualizados: ${updated}. Já estavam corretos: ${unchanged}. Zerados (sem mensagens): ${emptied}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Erro ao rodar o script:', err);
  process.exit(1);
});
