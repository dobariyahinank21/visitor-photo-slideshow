'use strict';
const http = require('node:http');
const { Server } = require('socket.io');
const config = require('./config');
const { openDatabase } = require('./db');
const { createRepository } = require('./repository');
const { createApp } = require('./app');

const repo = createRepository(openDatabase(config.dbPath));
const server = http.createServer();
const io = new Server(server);

// Display screens join a room so only they receive slideshow events.
io.on('connection', (socket) => {
  socket.on('display:join', () => socket.join('displays'));
});

server.on('request', createApp({ repo, io }));
server.listen(config.port, () => {
  console.log(`Upload:  http://localhost:${config.port}/upload`);
  console.log(`Display: http://localhost:${config.port}/display`);
});
