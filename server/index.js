const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const rooms = ['Genel', 'Teknoloji', 'Oyun', 'Müzik'];
const onlineUsers = {};

io.on('connection', (socket) => {
  console.log('Kullanıcı bağlandı:', socket.id);

  socket.on('join', ({ username, room }) => {
    socket.join(room);
    onlineUsers[socket.id] = { username, room };

    // Odaya katılım mesajı
    io.to(room).emit('message', {
      id: Date.now(),
      username: 'Sistem',
      text: `${username} odaya katıldı 👋`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });

    // Online kullanıcı listesini güncelle
    const roomUsers = Object.values(onlineUsers).filter(u => u.room === room).map(u => u.username);
    io.to(room).emit('roomUsers', roomUsers);
  });

  socket.on('sendMessage', ({ username, room, text }) => {
    io.to(room).emit('message', {
      id: Date.now(),
      username,
      text,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    });
  });

  socket.on('switchRoom', ({ username, oldRoom, newRoom }) => {
    socket.leave(oldRoom);
    socket.join(newRoom);
    onlineUsers[socket.id] = { username, room: newRoom };

    io.to(oldRoom).emit('message', {
      id: Date.now(),
      username: 'Sistem',
      text: `${username} odadan ayrıldı 👋`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });

    io.to(newRoom).emit('message', {
      id: Date.now(),
      username: 'Sistem',
      text: `${username} odaya katıldı 👋`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    });

    const oldRoomUsers = Object.values(onlineUsers).filter(u => u.room === oldRoom).map(u => u.username);
    const newRoomUsers = Object.values(onlineUsers).filter(u => u.room === newRoom).map(u => u.username);
    io.to(oldRoom).emit('roomUsers', oldRoomUsers);
    io.to(newRoom).emit('roomUsers', newRoomUsers);
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (user) {
      const { username, room } = user;
      delete onlineUsers[socket.id];

      io.to(room).emit('message', {
        id: Date.now(),
        username: 'Sistem',
        text: `${username} odadan ayrıldı 👋`,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      });

      const roomUsers = Object.values(onlineUsers).filter(u => u.room === room).map(u => u.username);
      io.to(room).emit('roomUsers', roomUsers);
    }
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

app.get('/', (req, res) => res.send('Chat server çalışıyor!'));

server.listen(5000, () => console.log('Server 5000 portunda çalışıyor'));