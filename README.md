# Modern Chat Application

A real-time chat application built with Node.js, Express, Socket.io, React, and TypeScript.

## Features

✅ **User Authentication**
- User registration and login
- JWT-based authentication
- Secure password hashing

✅ **Real-time Messaging**
- Instant message delivery
- Live user status
- Message history

✅ **Modern UI/UX**
- Responsive design
- Beautiful gradient backgrounds
- Smooth animations
- Mobile-friendly interface

✅ **Emoji Support**
- Emoji picker integration
- Rich text messaging

✅ **User Management**
- Online user list
- User avatars (auto-generated)
- User presence indicators

✅ **Video/Audio Calling**
- WebRTC-based video calls
- Audio-only calls
- Call controls (mute/unmute, video on/off)
- Incoming call notifications

## Tech Stack

**Backend:**
- Node.js
- Express.js
- Socket.io
- JWT Authentication
- bcryptjs for password hashing

**Frontend:**
- React 18 with TypeScript
- Socket.io Client
- Axios for HTTP requests
- Emoji Picker React

## Installation & Setup

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - React frontend on http://localhost:3000

## Usage

1. **Register/Login:**
   - Open http://localhost:3000
   - Create a new account or login with existing credentials

2. **Start Chatting:**
   - Send messages in real-time
   - Use emojis with the emoji picker
   - See who's online in the sidebar

3. **Test Multiple Users:**
   - Open multiple browser windows/tabs
   - Register different users
   - Chat between them in real-time

4. **Video Calling:**
   - Click the 📞 button next to any online user to start a call
   - Accept or reject incoming calls
   - Toggle video/audio during calls
   - End calls anytime

## Project Structure

```
chat-app/
├── server/                 # Backend (Node.js + Express + Socket.io)
│   ├── index.js           # Main server file
│   └── package.json       # Server dependencies
├── client/                # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.tsx  # Authentication component
│   │   │   └── Chat.tsx   # Main chat component
│   │   ├── App.tsx        # Main app component
│   │   └── App.css        # Styles
│   └── package.json       # Client dependencies
└── package.json           # Root package for scripts
```

## Features in Detail

### Authentication
- Secure user registration and login
- Password hashing with bcryptjs
- JWT token-based authentication
- Persistent login sessions

### Real-time Communication
- WebSocket connection with Socket.io
- Instant message delivery
- Live user presence
- Message history persistence

### Modern UI
- Responsive design for all devices
- Beautiful gradient backgrounds
- Smooth animations and transitions
- Intuitive user interface

### Emoji Support
- Full emoji picker integration
- Easy emoji insertion
- Rich text messaging support

## Development

- **Backend:** The server runs on port 5000 with auto-reload using nodemon
- **Frontend:** React development server runs on port 3000 with hot reload
- **Concurrent Development:** Use `npm run dev` to run both servers simultaneously

## Production Deployment

1. Build the React app:
   ```bash
   cd client && npm run build
   ```

2. Serve the built files from your Express server
3. Set environment variables for production
4. Use a process manager like PM2 for the Node.js server

Enjoy your modern chat application! 🚀