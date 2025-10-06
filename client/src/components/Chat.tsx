import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import VideoCall from './VideoCall';
import CallNotification from './CallNotification';

interface User {
  id: string;
  username: string;
  avatar: string;
}

interface Message {
  id: string;
  text: string;
  username: string;
  userId: string;
  avatar: string;
  timestamp: string;
}

interface ChatProps {
  user: User;
  onLogout: () => void;
}

const Chat: React.FC<ChatProps> = ({ user, onLogout }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    const newSocket = io(`${window.location.protocol}//${window.location.hostname}:5000`);
    setSocket(newSocket);

    newSocket.emit('join', user);

    newSocket.on('previousMessages', (msgs: Message[]) => {
      setMessages(msgs);
    });

    newSocket.on('newMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('activeUsers', (users: User[]) => {
      setActiveUsers(users);
    });

    // WebRTC call handling
    newSocket.on('call-made', async (data) => {
      console.log('Received call from:', data.from.username);
      if (!isInCall) {
        setIncomingCall(data);
      }
    });

    newSocket.on('call-rejected', () => {
      setIncomingCall(null);
      setRemoteUser(null);
      setIsInCall(false);
    });

    newSocket.on('call-ended', () => {
      setIsInCall(false);
      setIncomingCall(null);
      setRemoteUser(null);
    });

    return () => {
      newSocket.close();
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit('sendMessage', {
        text: newMessage,
        username: user.username,
        userId: user.id,
        avatar: user.avatar
      });
      setNewMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  const startCall = async (targetUser: User) => {
    if (!socket) return;
    
    console.log('Initiating call to:', targetUser.username);
    socket.emit('call-user', {
      offer: null,
      to: targetUser.id,
      from: user
    });
    setRemoteUser(targetUser);
    setIsInCall(true);
  };

  const acceptCall = async () => {
    if (!socket || !incomingCall) return;
    
    console.log('Accepting call from:', incomingCall.from.username);
    
    // First set the remote user and incoming call data
    setRemoteUser(incomingCall.from);
    
    // Then start the call (this will trigger camera/mic access)
    setIsInCall(true);
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (socket && incomingCall) {
      console.log('Rejecting call from:', incomingCall.from.username);
      socket.emit('reject-call', { to: incomingCall.socket });
    }
    setIncomingCall(null);
    setRemoteUser(null);
  };

  const endCall = () => {
    console.log('Ending call');
    setIsInCall(false);
    setRemoteUser(null);
    setIncomingCall(null);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <img src={user.avatar} alt={user.username} className="user-avatar" />
            <span>{user.username}</span>
          </div>
          <button onClick={onLogout} className="logout-button">
            Logout
          </button>
        </div>
        
        <div className="active-users">
          <h3>Online Users ({activeUsers.length})</h3>
          <ul className="user-list">
            {activeUsers.map((activeUser) => (
              <li key={activeUser.id} className="user-item">
                <img src={activeUser.avatar} alt={activeUser.username} />
                <span>{activeUser.username}</span>
                {activeUser.id === user.id ? (
                  <span> (You)</span>
                ) : (
                  <button 
                    className="call-btn"
                    onClick={() => startCall(activeUser)}
                    disabled={isInCall}
                  >
                    📞
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <h2>💬 Chat Room</h2>
        </div>

        <div className="messages-container">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`message ${message.userId === user.id ? 'own' : ''}`}
            >
              <img 
                src={message.avatar} 
                alt={message.username} 
                className="message-avatar"
              />
              <div className="message-content">
                <div className="message-header">
                  <span>{message.username}</span>
                  <span>{formatTime(message.timestamp)}</span>
                </div>
                <div className="message-text">{message.text}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="message-input-container">
          <button
            type="button"
            className="emoji-button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😊
          </button>
          
          <textarea
            className="message-input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            rows={1}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          
          <button type="submit" className="send-button">
            ➤
          </button>
        </form>

        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        
        {incomingCall && (
          <CallNotification 
            caller={incomingCall.from}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}
        
        {socket && (
          <VideoCall 
            socket={socket}
            user={user}
            isInCall={isInCall}
            onEndCall={endCall}
            remoteUser={remoteUser}
            incomingCall={incomingCall || null}
          />
        )}
      </div>
    </div>
  );
};

export default Chat;