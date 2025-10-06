const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Allow connections from any IP
server.listen = server.listen.bind(server);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());

// In-memory storage (use database in production)
const users = [];
const messages = [];
const activeUsers = new Map();
const userSocketMap = new Map(); // Map user IDs to socket IDs

const JWT_SECRET = 'your-secret-key';

// Auth routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
  };
  
  users.push(user);
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  
  res.json({ token, user: { id: user.id, username: user.username, avatar: user.avatar } });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ token, user: { id: user.id, username: user.username, avatar: user.avatar } });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (userData) => {
    activeUsers.set(socket.id, userData);
    userSocketMap.set(userData.id, socket.id);
    socket.broadcast.emit('userJoined', userData);
    socket.emit('previousMessages', messages);
    io.emit('activeUsers', Array.from(activeUsers.values()));
  });
  
  socket.on('sendMessage', (messageData) => {
    const message = {
      id: uuidv4(),
      ...messageData,
      timestamp: new Date().toISOString()
    };
    messages.push(message);
    io.emit('newMessage', message);
  });
  
  // WebRTC signaling
  socket.on('call-user', (data) => {
    console.log('Call request from', data.from.username, 'to', data.to);
    const targetSocketId = userSocketMap.get(data.to);
    if (targetSocketId) {
      console.log('Forwarding call to socket:', targetSocketId);
      socket.to(targetSocketId).emit('call-made', {
        offer: data.offer,
        socket: socket.id,
        from: data.from
      });
    } else {
      console.log('Target user not found:', data.to);
    }
  });
  
  socket.on('make-answer', (data) => {
    socket.to(data.to).emit('answer-made', {
      socket: socket.id,
      answer: data.answer
    });
  });
  
  socket.on('reject-call', (data) => {
    socket.to(data.to).emit('call-rejected');
  });
  
  socket.on('ice-candidate', (data) => {
    const targetSocketId = userSocketMap.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('ice-candidate', data.candidate);
    }
  });
  
  socket.on('end-call', (data) => {
    const targetSocketId = userSocketMap.get(data.to);
    if (targetSocketId) {
      socket.to(targetSocketId).emit('call-ended');
    }
  });
  
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      activeUsers.delete(socket.id);
      userSocketMap.delete(user.id);
      socket.broadcast.emit('userLeft', user);
      io.emit('activeUsers', Array.from(activeUsers.values()));
    }
    console.log('User disconnected:', socket.id);
  });
});

// Serve React build files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});