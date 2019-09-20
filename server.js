const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const u2f = require('u2f');
const config = require('./etc/config');

const privateKey  = fs.readFileSync(config.server.ssl.key, 'utf8');
const certificate = fs.readFileSync(config.server.ssl.cert, 'utf8');

const app = express();
const httpsServer = https.createServer({ key : privateKey, cert : certificate }, app);

/* middlewares */
app.use(express.json());
app.use(express.urlencoded({ extended : true }));
app.use(express.static('public'));

let user;

/* routes */
app.get('/register', (request, response) => {
	const session = u2f.request(config.appId);
    app.set('session', JSON.stringify(session));
    response.send(session);
});
app.post('/register', (request, response) => {
	const registration = u2f.checkRegistration(JSON.parse(app.get('session')), request.body.registerResponse);

    if (!registration.successful) {
        return response.status(500).send({ message: 'error' });
    }

    user = registration;
    response.send(registration);
});
app.get('/login', (request, response) => {
	const session = u2f.request(config.appId, user.keyHandle);
    app.set('session', JSON.stringify(session));
    response.send(session);
});
app.post('/login', (request, response) => {
	const success = u2f.checkSignature(JSON.parse(app.get('session')), request.body.loginResponse, user.publicKey);
    response.send(success);
});

httpsServer.listen({ port : config.server.port, host : config.server.host }, () => console.log('Listening 8443...'));
