const { Client, GatewayIntentBits, Events, Partials } = require('discord.js');
const cron = require('node-cron');
const fetch = require('node-fetch');
const http = require('http');
const axios = require('axios');
require('dotenv').config();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const RH_IDS = process.env.RH_IDS?.split(',') ?? [];
const WORKER_URL = process.env.WORKER_URL;
const notifiedUsers = new Map();
const pendingResponses = new Map();
const respondedUsers = new Map();

function isDiaUtil() {
  const hoje = new Date();
  const diaSemana = hoje.getDay();
  return diaSemana >= 1 && diaSemana <= 5;
}

async function verificarRespostaHoje(userId) {
  try {
    const data = new Date().toISOString().split('T')[0];
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verificar_resposta',
        data: { userId, data }
      })
    });
    
    const result = await response.json();
    return result.respondeu;
  } catch (error) {
    console.error('erro ao verificar resposta:', error);
    return false;
  }
}

async function registrarRespostaSim(userId, username) {
  try {
    const dataAtual = new Date().toISOString().split('T')[0];
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'registrar_resposta',
        data: { 
          userId, 
          username, 
          data: dataAtual 
        }
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log(` registrada para ${username}`);
      respondedUsers.set(userId, true);
      pendingResponses.delete(userId);
    } else {
      throw new Error(result.error || 'erro desconhecido ao registrar resposta');
    }
  } catch (error) {
    console.error(`erro ao registrar resposta para ${username}:`, error);
    throw error; 
  }
}

async function salvarPonto(userId, username, horario) {
  try {
    const dataAtual = new Date().toISOString().split('T')[0];
    console.log(`enviando ponto para API: ${username} - ${horario} - ${dataAtual}`);
    
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'registrar_ponto',
        data: { 
          userId, 
          username, 
          horario,
          data: dataAtual 
        }
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log(`ponto salvo para ${username}`);
    } else {
      throw new Error(result.error || 'erro desconhecido ao salvar ponto');
    }
  } catch (error) {
    console.error(`erro ao salvar ponto para ${username}:`, error);
    throw error;
  }
}

async function buscarPontosDoDia() {
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'buscar_pontos'
      })
    });
    
    const result = await response.json();
    if (result.success) {
      return result.pontos;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('erro ao buscar pontos:', error);
    return [];
  }
}

async function enviarMensagemPonto(user) {
  try {
    const dm = await user.createDM();
    await dm.send('Olá! Você bateu o ponto para trabalhar? Responda com "Sim" quando bater o ponto. Caso não responda essa mensagem, vou perguntar novamente em 10 minutos hahaha');
    console.log(`mensagem enviada para ${user.username}`);
    
    pendingResponses.set(user.id, {
      username: user.username,
      tentativas: 1,
      ultimaMensagem: Date.now()
    });
    
    setTimeout(() => verificarPendentes(user.id), 10 * 60 * 1000);
  } catch (error) {
    console.error(`erro ao enviar DM para ${user.username}:`, error.message);
  }
}

async function verificarPendentes(userId) {
  const pendente = pendingResponses.get(userId);
  if (!pendente) return;
  
  const user = await client.users.fetch(userId);
  if (!user) return;
  
  const jaRespondeu = await verificarRespostaHoje(userId);
  if (jaRespondeu) {
    pendingResponses.delete(userId);
    return;
  }
  
  await enviarMensagemPonto(user);
}

// Função para fazer self-ping
async function keepAlive() {
  try {
    const port = server.address().port;
    const url = `http://localhost:${port}/health`;
    await axios.get(url);
    console.log(`Self-ping executado com sucesso na porta ${port}`);
  } catch (error) {
    console.error('Erro no self-ping:', error.message);
  }
}

client.once(Events.ClientReady, () => {
  console.log(`bot logado como ${client.user?.tag}`);
  
  setInterval(keepAlive, 30000);
  
  cron.schedule('0 0 * * *', () => {
    respondedUsers.clear();
    pendingResponses.clear();
  });
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // Comando de teste para o relatório
  if (message.content === '!teste-relatorio') {
    console.log('Teste manual do relatório iniciado');
    try {
      const hoje = new Date().toLocaleDateString('pt-BR');
      let relatorio = `relatório diário de pontos (${hoje}) - TESTE\n\n`;

      console.log('Buscando pontos do dia...');
      const pontos = await buscarPontosDoDia();
      console.log(`Pontos encontrados: ${pontos.length}`);

      const guild = client.guilds.cache.first();
      if (!guild) {
        await message.reply('Erro: Nenhuma guild encontrada!');
        return;
      }

      const membros = await guild.members.fetch();
      membros.forEach(member => {
        if (member.user.bot) return;
        const ponto = pontos.find(p => p.user_id === member.id);
        if (ponto) {
          relatorio += `${member.user.username} - ${ponto.horario}\n`;
        } else {
          relatorio += `${member.user.username} - nao bateu ponto\n`;
        }
      });

      await message.reply('Enviando relatório de teste...');
      for (const id of RH_IDS) {
        try {
          const user = await client.users.fetch(id);
          const dm = await user.createDM();
          await dm.send(relatorio);
          await message.reply(`Relatório enviado com sucesso para ${user.username}`);
        } catch (err) {
          await message.reply(`Erro ao enviar para ${id}: ${err.message}`);
        }
      }
    } catch (error) {
      await message.reply(`Erro no teste: ${error.message}`);
    }
    return;
  }

  if (!message.channel.isDMBased()) return;
  
  const userId = message.author.id;
  const pendente = pendingResponses.get(userId);
  
  if (pendente && message.content.toLowerCase().includes('sim')) {
    try {
      const hora = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      
      console.log(`registrando ponto para ${message.author.username} às ${hora}`);
      await salvarPonto(userId, message.author.username, hora);
      
      console.log(`registrando resposta de ${message.author.username}`);
      await registrarRespostaSim(userId, message.author.username);
      
      await message.reply('Ponto registrado com sucesso! ✅');
    } catch (error) {
      console.error(`edrro ao processar resposta de ${message.author.username}:`, error);
      await message.reply('Ops, houve um erro ao registrar seu ponto. Por favor, tente novamente em alguns minutos.');
    }
  }
});

client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
  if (!isDiaUtil()) return;
  
  const user = newPresence.user;
  if (!user || user.bot) return;

  const status = newPresence.status;
  if (status === 'online' && !notifiedUsers.has(user.id)) {
    const jaRespondeu = await verificarRespostaHoje(user.id);
    if (jaRespondeu) {
      console.log(`✅ ${user.username} já respondeu hoje`);
      return;
    }

    console.log(`👀 ${user.username} ficou online. Aguardando 5 segundos...`);
    notifiedUsers.set(user.id, true);

    setTimeout(async () => {
      await enviarMensagemPonto(user);
      
      setTimeout(() => {
        notifiedUsers.delete(user.id);
      }, 60 * 1000);
    }, 5000);
  }
});

cron.schedule('30 14 * * 1-5', async () => { 
  console.log('Iniciando geração do relatório...');
  const hoje = new Date().toLocaleDateString('pt-BR');
  let relatorio = `relatório diário de pontos (${hoje})\n\n`;

  try {
    console.log('Buscando pontos do dia...');
    const pontos = await buscarPontosDoDia();
    console.log(`Pontos encontrados: ${pontos.length}`);

    const guild = client.guilds.cache.first();
    if (!guild) {
      console.error('Nenhuma guild encontrada!');
      return;
    }
    console.log(`Guild encontrada: ${guild.name}`);

    console.log('Buscando membros...');
    const membros = await guild.members.fetch();
    console.log(`Total de membros encontrados: ${membros.size}`);

    membros.forEach(member => {
      if (member.user.bot) return;

      const ponto = pontos.find(p => p.user_id === member.id);
      if (ponto) {
        relatorio += `${member.user.username} - ${ponto.horario}\n`;
      } else {
        relatorio += `${member.user.username} - nao bateu ponto\n`;
      }
    });

    console.log('Relatório gerado:', relatorio);
    console.log('IDs do RH para envio:', RH_IDS);

    for (const id of RH_IDS) {
      try {
        console.log(`Tentando enviar relatório para ID: ${id}`);
        const user = await client.users.fetch(id);
        console.log(`Usuário encontrado: ${user.username}`);
        const dm = await user.createDM();
        await dm.send(relatorio);
        console.log(`Relatório enviado com sucesso para ${user.username}`);
      } catch (err) {
        console.error(`Erro ao enviar relatório para ${id}:`, err);
      }
    }
  } catch (error) {
    console.error('Erro ao gerar/enviar relatório:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);