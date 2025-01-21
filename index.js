const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const _ = require('lodash')
const scrapper = require('./scrapper')
const Datastore = require('nedb')
const { DateTime } = require("luxon");
const db = new Datastore({ filename: 'db.js', autoload: true });
db.loadDatabase();
const token = process.env.NODE_TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true, request: {
  agentOptions: {
      keepAlive: true,
      family: 4
  }
} });

const notValid = ['No disponible', 'Reservado', 'Por habilitar']

const findOnDb = (query) => {
  return new Promise((resolve, reject) => {
    return db.findOne(query, function (err, docs) {
      if (err) reject(err)
      resolve(docs)
    });
  })
}

const findAll = (query) => {
  return new Promise((resolve, reject) => {
    return db.find(query, function (err, docs) {
      if (err) reject(err)
      resolve(docs)
    });
  })
}

const insertOnDb = (query) => {
  return new Promise((resolve, reject) => {
    return db.insert(query, function (err, docs) {
      if (err) reject(err)
      resolve(docs)
    });
  })
}

const updateOnDb = (query, update) => {
  return new Promise((resolve, reject) => {
    return db.update(query, { $set: update }, {}, function (err, docs) {
      if (err) reject(err)
      resolve(docs)
    });
  })
}


const sendMessages = async (message, isError) => {
  const chats = await findAll({})
  if (_.isEmpty(chats)) {
    console.log('=== error: ', 'No users registered')
    return;
  }
  const messages = chats.filter((chat) => isError || !chat.silent).map((chat) => bot.sendMessage(chat.id, message))
  return Promise.all(messages)
}

sendMessages('Start bot', true)

const runScrapper = async () => {
  try {
    const chats = await findAll({})
    if (_.isEmpty(chats)) {
      console.error('=== error: ', 'No users registered')
      return;
    }
    const { error, start, end, elements } = await scrapper();
    if (error) {
        console.log('=== error: ', error)
        return await sendMessages(`Error on bot: ${error}`, true)
    }
    const found = elements.some((element) => !_.includes(notValid, element))
    if (found) return await sendMessages('✅ !!!!! Disponible', true)
    return await sendMessages(`❌ Nada ${start}`)
  } catch(err) {
    console.log('errror: ', err)
    return await sendMessages(`Error on scheduler: ${err.message}`, true)
  }
}

cron.schedule('1,5,15 * * * *', async () => {
  await runScrapper()
});

cron.schedule('0 9,12,16,23 * * *', async () => {
  await sendMessages('I am living', true)
});

bot.on("polling_error", (msg) => console.log('pooling error', msg));


bot.on('message', async (msg) => {
  const messageText = msg.text;
  const chatId = msg.chat.id;
  const chat = { id: chatId }
  if (messageText === '/start') {
    const start = DateTime.now().toFormat('MM-dd-yyyy_H_mm_ss').toLocaleString()
    const found = await findOnDb(chat)
    if (!found) {
      await insertOnDb({ ...chat, start, silent: false })
      return bot.sendMessage(chatId, 'Welcome to the bot!');
    }
    bot.sendMessage(chatId, 'Already setted');
  } else if (messageText === '/run') {
    bot.sendMessage(chatId, 'Started scrapper');
    await runScrapper()
  } else if (messageText === '/silent' || messageText === '/verbose') {
    const found = await findOnDb(chat)
    if (!found) {
      await insertOnDb({ ...chat, start, silent: messageText === '/silent' })
      return bot.sendMessage(chatId, `Your user created and ${messageText}`);
    }
    await updateOnDb({ id: found.id }, { silent: messageText === '/silent' })
    bot.sendMessage(chatId, `Your user was ${messageText}`);
  } else if (messageText === '/myuser') {
    const found = await findOnDb(chat)
    bot.sendMessage(chatId, `Your user: ${JSON.stringify(found)}`);
  } else if (messageText === '/ping') {
    bot.sendMessage(chatId, 'The bot is live')
  } else {
    bot.sendMessage(chatId, 'type: */start* for register');
  }
});