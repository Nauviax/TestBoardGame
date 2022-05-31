const { Server, Origins } = require('boardgame.io/server');
const { KiwiKluedo } = require('./Game');

const server = Server({
  games: [KiwiKluedo],
  origins: [Origins.LOCALHOST],
});

const lobbyConfig = {
  apiPort: 8088,
  apiCallback: () => console.log('Running Lobby API on port 8088...'),
};

server.run({ port: 8080, lobbyConfig });