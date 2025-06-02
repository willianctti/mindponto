const { Client, GatewayIntentBits, Events, Partials } = require('discord.js');
require('dotenv').config();
const cron = require('node-cron');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

// Id giovanni e mello
const RH_IDS = process.env.RH_IDS?.split(',') ?? [];

const notifiedUsers = new Map();
const pontosHoje = new Map();

client.once(Events.ClientReady, () => {
  console.log(`🤖 Bot logado como ${client.user?.tag}`);
});

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
  const user = newPresence.user;

  if (!user || user.bot) return;

  const status = newPresence.status;

  if (status === 'online' && !notifiedUsers.has(user.id)) {
    console.log(`👀 ${user.username} ficou online. Aguardando 5 segundos...`);

    notifiedUsers.set(user.id, true);

    setTimeout(async () => {
      try {
        const hora = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        pontosHoje.set(user.id, hora);

        const dm = await user.createDM();
        await dm.send('⏰ Você bateu o ponto para trabalhar?');
        console.log(`📩 Mensagem enviada para ${user.username}`);
      } catch (error) {
        console.error(`❌ Erro ao enviar DM para ${user.username}:`, error.message);
      } finally {
        setTimeout(() => {
          notifiedUsers.delete(user.id);
        }, 60 * 1000);
      }
    }, 5000); 
  }
});

cron.schedule('30 13 * * *', async () => {
  const hoje = new Date().toLocaleDateString('pt-BR');
  let relatorio = `📊 Relatório diário de pontos (${hoje})\n\n`;

  const guild = client.guilds.cache.first();
  if (!guild) return;

  const membros = await guild.members.fetch();

  membros.forEach(member => {
    if (member.user.bot) return;

    const horario = pontosHoje.get(member.id);
    if (horario) {
      relatorio += `✅ ${member.user.username} - ${horario}\n`;
    } else {
      relatorio += `❌ ${member.user.username} - Não bateu ponto\n`;
    }
  });

  for (const id of RH_IDS) {
    try {
      const user = await client.users.fetch(id);
      const dm = await user.createDM();
      await dm.send(relatorio);
    } catch (err) {
      console.error(`❌ Erro ao enviar relatório para ${id}:`, err);
    }
  }

  pontosHoje.clear();
});

client.login(process.env.DISCORD_TOKEN);