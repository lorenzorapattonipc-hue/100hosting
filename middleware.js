// Example Discord bot — upload this as a starting point
// Your bot token is injected automatically by 100Hosting
// DO NOT hardcode your token here

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Powered by ${process.env.POWERED_BY || '100Hosting'}`);
  console.log(`Serving ${client.guilds.cache.size} servers`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    message.reply(`Pong! 🏓 Powered by 100Hosting`);
  }

  if (message.content === '!info') {
    message.reply(`This bot is hosted on **100Hosting** — reliable Discord bot infrastructure.`);
  }
});

// Token is set by 100Hosting automatically
client.login(process.env.BOT_TOKEN);
