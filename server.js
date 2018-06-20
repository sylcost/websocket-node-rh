let fetch = require('node-fetch');
var mongoose = require('mongoose');
var express = require('express');

var app = express();
var expressWs = require('express-ws')(app);

 

// Creation WebSocket
app.ws('/', function(ws, req) {
    ws.on('message', function(msg) {
        console.log('msg:'+msg);
    });

    ws.on('close', function(msg) {
        console.log('close:'+msg);
    });
});
 
app.listen(5000);

/**
 * Si des cients sont connectes a la WS, on appelle l'API REST,
 * on stocke le resultat dans MongoDB et on l'envoie aux clients.
 * Repete toutes les 10s.
 */
scheduler = () => {

    if (expressWs.getWss('/').clients.size > 0) {
        fetch('https://www.bitstamp.net/api/ticker/')
        .then(data => data.json())
        .then(json => {

            // On stocke dans MongoDB.
            var exemple = new Reponse(json);
            exemple.save(function (err, exemple) {
                if (err) return console.error(err);
            });

            // On appel chaque client avec la donnee.
            expressWs.getWss('/').clients.forEach((client) => {
                client.send(JSON.stringify(json));
            });
            
            // on relance dans 10s.
            setTimeout(scheduler, 10000);
        })
        .catch(ex => {
            console.log('erreur:'+ex);
        });
    } else {
        // Pas de client connecte, on relance dans 10s.
        setTimeout(scheduler, 10000);
    }
}

// Connexion a MongoDB.
mongoose.connect('mongodb://localhost:27017');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('mongodb connected');
});

// Creation Schema et Model de la reponse REST.
var schema = mongoose.Schema({
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
var Reponse = mongoose.model('Reponse', schema);

// Lancement du scheduler.
scheduler();

console.log('serveur express up');
