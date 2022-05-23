const { Server, Origins } = require('boardgame.io/server');
const { TestGame } = require('./Game');

const server = Server({
  games: [TestGame],
  origins: [Origins.LOCALHOST],
});

server.run(8080);