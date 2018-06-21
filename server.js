const fetch = require('node-fetch');
const mongoose = require('mongoose');
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(5000, function() {
    console.log('server ok : http://localhost:5000');
});

// Front.
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});


// Creation WebSocket.
io.on('connection', function (socket) {
    console.log('connexion ws')
    socket.on('message', function (data) {
        console.log('message:'+data);
    });
    socket.on('disconnect', function(data) {
        console.log('deconnexion ws:'+data);
    });
});


// Connexion a MongoDB.
mongoose.connect('mongodb://localhost:27017');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'erreur:'));
db.once('open', function() {
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
async function scheduler() {

    if (Object.keys(io.sockets.sockets).length > 0) {

        try {
            // Appel REST.
            let data = await fetch('https://www.bitstamp.net/api/ticker/');
            let json = await data.json();
            
            // On stocke dans MongoDB.
            let reponse = new Reponse(json);
            reponse.save(function (err, reponse) {
                if (err) return console.error(err);
            });
    
            // Broadcast.
            io.emit('message', JSON.stringify(json));
        } catch (err) {
            console.log('erreur scheduler:'+err);
        } finally {
            // on relance dans 10s.
            setTimeout(scheduler, 10000);
        }

    } else {
        // Pas de client connecte, on relance dans 10s.
        setTimeout(scheduler, 10000);
    }
}

// Lancement du scheduler.
scheduler();