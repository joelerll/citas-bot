const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const _ = require('lodash')
const scrapper = require('./scrapper')
const Datastore = require('nedb')
const db = new Datastore({ filename: 'db.js', autoload: true });
db.loadDatabase();
const token = process.env.NODE_TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

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


const sendMessages = async (message) => {
  const chats = await findAll({})
  if (_.isEmpty(chats)) {
    console.log('=== error: ', 'No users registered')
    return;
  }
  const messages = chats.map((chat) => bot.sendMessage(chat.id, message))
  return Promise.all(messages)
}

sendMessages('Start bot')

cron.schedule('1,5,10,15 * * * *', async () => {
  try {
    const chats = await findAll({})
    if (_.isEmpty(chats)) {
      console.error('=== error: ', 'No users registered')
      return;
    }
    const { error, start, end, elements } = await scrapper();
    if (error) {
        console.log('=== error: ', error)
        return await sendMessages('Error on bot')
    }
    const found = elements.some((element) => !_.includes(notValid, element))
    if (found) return await sendMessages('!!!!! Disponible')
    return await sendMessages(`Nada ${start}`)
  } catch(err) {
    console.log('errror: ', err)
    return await sendMessages('Error on scheduler')
  }
});

bot.on('message', async (msg) => {
  const messageText = msg.text;
  const chatId = msg.chat.id;
  if (messageText === '/start') {
    const chat = { id: chatId, date: new Date() }
    const found = await findOnDb(chat)
    if (!found) {
      await insertOnDb(chat)
      return bot.sendMessage(chatId, 'Welcome to the bot!');
    }
    bot.sendMessage(chatId, 'Already setted');
  } else {
    bot.sendMessage(chatId, 'type: */start* for register');
  }
});