const fetch = require('node-fetch');
const mongoose = require('mongoose');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const cron = require('node-cron');
const CONFIG = require('./config.json');

const dbPort = CONFIG.dbPort;
const dbHost = CONFIG.dbHost;
const restUrl = CONFIG.restUrl;
const localPort = CONFIG.localPort;

server.listen(localPort, () => {
    console.log(`server ok : http://localhost:${localPort}`);
});

// Front.
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/front/index.html');
});


// Creation WebSocket.
io.on('connection', (socket) => {
    console.log('connexion ws')
    socket.on('message', (data) => {
        console.log(`message: ${data}`);
    });
    socket.on('disconnect', (data) => {
        console.log(`deconnexion ws: ${data}`);
    });
});


// Connexion a MongoDB.
mongoose.connect(`mongodb://${dbHost}:${dbPort}`);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'erreur:'));
db.once('open', () => {
    console.log('connexion mongodb ok');
});

// Creation Schema et Model de la reponse REST.
const schema = mongoose.Schema({
    'high': String,
    'last': String,
    'timestamp': String,
    'bid': String,
    'vwap': String,
    'volume': String,
    'low': String,
    'ask': String,
    'open': Number
});
const Reponse = mongoose.model('Reponse', schema);

/**
 * Si des cients sont connectes a la WS, on appelle l'API REST,
 * on stocke le resultat dans MongoDB et on l'envoie aux clients.
 * Repete toutes les 10s.
 */
const scheduler = async () => {
    if (Object.keys(io.sockets.sockets).length > 0) {
        try {
            // Appel REST.
            const data = await fetch(restUrl);
            const json = await data.json();
            
            // On stocke dans MongoDB.
            const reponse = new Reponse(json);
            reponse.save((err, reponse) => {
                if (err) return console.error(err);
            });
    
            // Broadcast.
            io.emit('message', JSON.stringify(json));
        } catch (err) {
            console.log(`erreur scheduler: ${err}`);
        }
    } 
}

// Lancement du Job toutes les 10s.
cron.schedule('*/10 * * * * *', scheduler);