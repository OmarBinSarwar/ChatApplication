import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, Plus, LogOut } from 'lucide-react';
import { fetchApi, BASE_URL } from '../lib/api';
import { io } from 'socket.io-client';

export default function ChatConsole({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]); // All users to start chat with
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [file, setFile] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  
  const socketRef = useRef();
  const messagesEndRef = useRef();
  const typingTimeoutRef = useRef();

  useEffect(() => {
    // Connect to socket
    socketRef.current = io(BASE_URL, {
      withCredentials: true
    });
    
    socketRef.current.emit('register', user.id);
    
    socketRef.current.on('new_message', (msg) => {
      setMessages((prev) => {
        // Check if message belongs to active conversation
        if (activeConversation && msg.conversation_id === activeConversation.id) {
          return [...prev, msg];
        }
        return prev;
      });
      fetchConversations();
    });

    socketRef.current.on('user_typing', (uId) => {
      // Find user name if needed, here we just show typing...
      setTypingUser('typing...');
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    });

    socketRef.current.on('user_stop_typing', () => {
      setTypingUser(null);
    });

    fetchConversations();
    fetchAllUsers();

    return () => {
      socketRef.current.disconnect();
    };
  }, [user.id, activeConversation]);

  useEffect(() => {
    if (activeConversation) {
      socketRef.current.emit('join_conversation', activeConversation.id);
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const fetchConversations = async () => {
    try {
      const data = await fetchApi('/api/conversations');
      setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const data = await fetchApi('/api/users');
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const data = await fetchApi(`/api/messages/${convId}`);
      setMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartChat = async (otherUserId) => {
    try {
      const conv = await fetchApi('/api/conversations', {
        method: 'POST',
        body: { participantId: otherUserId }
      });
      await fetchConversations();
      const updatedConv = await fetchApi('/api/conversations').then(res => res.find(c => c.id === conv.id));
      setActiveConversation(updatedConv);
      setShowUsersPanel(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    try {
      const payload = new FormData();
      payload.append('text', newMessage);
      payload.append('receiverId', activeConversation.other_user.id);
      if (file) payload.append('attachment', file);

      const msg = await fetchApi(`/api/messages/${activeConversation.id}`, {
        method: 'POST',
        body: payload
      });

      socketRef.current.emit('send_message', msg);
      socketRef.current.emit('stop_typing', { conversationId: activeConversation.id, userId: user.id });
      setNewMessage('');
      setFile(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (activeConversation) {
      socketRef.current.emit('typing', { conversationId: activeConversation.id, userId: user.id });
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar glass">
        <div className="sidebar-header">
          <img 
            src={user.avatar ? `${BASE_URL}${user.avatar}` : 'https://ui-avatars.com/api/?name='+user.name} 
            alt="avatar" 
            className="avatar" 
          />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1rem' }}>{user.name}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Online</span>
          </div>
          <LogOut size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onLogout} />
        </div>

        <div style={{ padding: '1rem', borderBottom: '1px solid var(--panel-border)' }}>
          <button className="btn" onClick={() => setShowUsersPanel(!showUsersPanel)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> New Chat
          </button>
        </div>

        {showUsersPanel ? (
          <div className="conversations-list">
            <h4 style={{ margin: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Available Users</h4>
            {users.map(u => (
              <div key={u.id} className="conversation-item" onClick={() => handleStartChat(u.id)}>
                <img src={u.avatar ? `${BASE_URL}${u.avatar}` : 'https://ui-avatars.com/api/?name='+u.name} className="avatar" style={{width: 40, height: 40}} alt="" />
                <span>{u.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="conversations-list">
            <h4 style={{ margin: '0.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Recent</h4>
            {conversations.map(c => (
              <div 
                key={c.id} 
                className={`conversation-item ${activeConversation?.id === c.id ? 'active' : ''}`}
                onClick={() => setActiveConversation(c)}
              >
                <img src={c.other_user.avatar ? `${BASE_URL}${c.other_user.avatar}` : 'https://ui-avatars.com/api/?name='+c.other_user.name} className="avatar" style={{width: 40, height: 40}} alt="" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 500, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.other_user.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      {activeConversation ? (
        <div className="chat-area glass">
          <div className="chat-header">
            <img src={activeConversation.other_user.avatar ? `${BASE_URL}${activeConversation.other_user.avatar}` : 'https://ui-avatars.com/api/?name='+activeConversation.other_user.name} className="avatar" alt="" />
            <div>
              <h3>{activeConversation.other_user.name}</h3>
            </div>
          </div>
          
          <div className="messages-container">
            {messages.map(m => {
              const isSent = m.sender_id === user.id;
              return (
                <div key={m.id} className={`message-wrapper ${isSent ? 'sent' : 'received'}`}>
                  {m.text && <div className="message-bubble">{m.text}</div>}
                  {m.attachment && (
                    <img src={`${BASE_URL}${m.attachment}`} className="message-attachment" alt="attachment" />
                  )}
                  <span className="message-time">
                    {new Date(m.date_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              );
            })}
            {typingUser && <div className="typing-indicator">{typingUser}</div>}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-container" onSubmit={handleSendMessage}>
            <label style={{ cursor: 'pointer', color: file ? 'var(--accent-color)' : 'var(--text-muted)' }}>
              <Image size={24} />
              <input type="file" style={{ display: 'none' }} accept="image/*" onChange={e => setFile(e.target.files[0])} />
            </label>
            <input 
              type="text" 
              className="chat-input" 
              placeholder="Type a message..." 
              value={newMessage}
              onChange={handleTyping}
            />
            <button type="submit" className="send-btn" disabled={!newMessage.trim() && !file}>
              <Send size={20} />
            </button>
          </form>
        </div>
      ) : (
        <div className="chat-area glass" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Welcome to Antigravity Chat</h2>
            <p>Select a conversation or start a new one.</p>
          </div>
        </div>
      )}
    </div>
  );
}
