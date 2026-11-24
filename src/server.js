'use strict';
const http = require('node:http');
const { Server } = require('socket.io');
const config = require('./config');
const { openDatabase } = require('./db');
const { createRepository } = require('./repository');
const { createApp } = require('./app');

const repo = createRepository(openDatabase(config.dbPath));

const io = new Server();
const app = createApp({ repo, io });
const server = http.createServer(app);
io.attach(server);

// Display screens join a room so only they receive slideshow events.
io.on('connection', (socket) => {
  socket.on('display:join', () => socket.join('displays'));
});

server.on('error', (err) => {
  console.error(`Could not listen on port ${config.port}: ${err.code}`);
  process.exit(1);
});

server.listen(config.port, () => {
  console.log(`Upload:  http://localhost:${config.port}/upload`);
  console.log(`Display: http://localhost:${config.port}/display`);
});