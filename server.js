const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// Leaderboard
const leaderboard = [];

function updateLeaderboard(nickname, wave, score) {
  const existing = leaderboard.find(e => e.nickname === nickname);
  if (existing) {
    if (wave > existing.wave || (wave === existing.wave && score > existing.score)) {
      existing.wave = wave;
      existing.score = score;
    }
  } else {
    leaderboard.push({ nickname, wave, score });
  }
  leaderboard.sort((a, b) => b.wave - a.wave || b.score - a.score);
  if (leaderboard.length > 10) leaderboard.length = 10;
}

// WebSocket
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);
  socket.emit('leaderboardUpdate', leaderboard);

  socket.on('weapon', (data) => {
    io.emit('weapon', { ...data, playerId: socket.id });
  });

  socket.on('move', (data) => {
    io.emit('playerMove', { playerId: socket.id, direction: data.direction });
  });

  socket.on('bomb', () => {
    io.emit('bomb', { playerId: socket.id });
  });

  socket.on('updateScore', (data) => {
    if (data && data.nickname && typeof data.wave === 'number' && typeof data.score === 'number') {
      updateLeaderboard(data.nickname, data.wave, data.score);
      io.emit('leaderboardUpdate', leaderboard);
    }
  });

  socket.on('getLeaderboard', () => {
    socket.emit('leaderboardUpdate', leaderboard);
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LAN: http://${localIP}:${PORT}`);
});
