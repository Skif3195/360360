const { Telegraf, Scenes, session } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;
const SUPABASE_TABLE = "answers";

const QUESTIONS = [
  "Оцени инициативность (1-5):",
  "Оцени коммуникабельность (1-5):",
  "Что бы ты посоветовал улучшить?"
];

const questionScene = new Scenes.WizardScene(
  'feedback-wizard',
  async (ctx) => {
    ctx.wizard.state.answers = {};
    await ctx.reply("Привет! Начнем оценку. Ответы анонимны.");
    await ctx.reply(QUESTIONS[0]);
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.answers.initiative = ctx.message.text;
    await ctx.reply(QUESTIONS[1]);
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.answers.communication = ctx.message.text;
    await ctx.reply(QUESTIONS[2]);
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.answers.comment = ctx.message.text;
    ctx.wizard.state.answers.timestamp = new Date().toISOString();

    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`,
      ctx.wizard.state.answers,
      {
        headers: {
          apikey: SUPABASE_API_KEY,
          Authorization: `Bearer ${SUPABASE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    ).catch(() => null);

    if (response && response.status === 201) {
      await ctx.reply("Спасибо! Твои ответы сохранены анонимно.");
    } else {
      await ctx.reply("Произошла ошибка при сохранении. Попробуй позже.");
    }

    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([questionScene]);
bot.use(session());
bot.use(stage.middleware());

bot.command('start', (ctx) => ctx.scene.enter('feedback-wizard'));
bot.command('cancel', (ctx) => {
  ctx.reply("Оценка прервана.");
  ctx.scene.leave();
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
