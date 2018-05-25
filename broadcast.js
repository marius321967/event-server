const WebSocket = require('ws');
const http = require('http');
const state = require('./state');
const parseWsMessage = require('./services/broadcast/parseWsMessage');
const registerListener = require('./services/broadcast/registerListener');
const sendWsMessage = require('./services/broadcast/sendWsMessage');
const authenticate = require('./services/auth/authenticate');

/**
 * Setup WebSocket boardcast server to distribute events to listeners.
 */
module.exports = () => {
    const server = http.createServer();
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', (connection) => {
        // Handle initialization message.
        connection.on('message', (serializedMessage) => {
            let message;
            parseWsMessage(serializedMessage)
                .then(message2 => {
                    message = message2;
                    return authenticate(message.authentication);
                })
                .then(() => {
                    return registerListener(connection, message.events, state);
                })
                // Send OK or error.
                .then(() => {
                    return sendWsMessage({
                        type: 'init',
                        code: 'OK'
                    }, connection);
                })
                .catch(err => {
                    return sendWsMessage({
                        type: 'init',
                        code: err.message
                    }, connection);
                });

        });
    });

    return {httpSrv: server, wsSrv: wss};
}