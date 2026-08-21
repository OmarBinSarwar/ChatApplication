import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Users,
  MessageSquare,
  Activity,
  Trash2,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Eye
} from 'lucide-react';
import { fetchApi, BASE_URL } from '../lib/api';

const getAvatarUrl = (avatar, name) => {
  if (avatar) {
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    return `${BASE_URL}${avatar}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}`;
};

export default function SuperAdminDashboard({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'conversations' | 'inspector'
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [conversationsList, setConversationsList] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [inspectorMessages, setInspectorMessages] = useState([]);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadOverviewData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const showNotification = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage({ type: '', text: '' });
    }, 4000);
  };

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [overviewData, usersData, conversationsData] = await Promise.all([
        fetchApi('/api/admin/overview'),
        fetchApi('/api/admin/users'),
        fetchApi('/api/admin/conversations')
      ]);
      setStats(overviewData);
      setUsersList(usersData);
      setConversationsList(conversationsData);
    } catch (err) {
      showNotification('error', err.message || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await fetchApi(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: { role: newRole }
      });
      showNotification('success', `User role changed to ${newRole}`);
      // Update local state
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      showNotification('error', err.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userName}"? This cannot be undone.`)) {
      return;
    }
    try {
      await fetchApi(`/api/admin/users/${userId}`, { method: 'DELETE' });
      showNotification('success', `User "${userName}" deleted successfully`);
      setUsersList(prev => prev.filter(u => u.id !== userId));
      loadOverviewData();
    } catch (err) {
      showNotification('error', err.message || 'Failed to delete user');
    }
  };

  const handleInspectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setActiveTab('inspector');
    setInspectorLoading(true);
    try {
      const messages = await fetchApi(`/api/admin/conversations/${conversation.id}/messages`);
      setInspectorMessages(messages);
    } catch (err) {
      showNotification('error', err.message || 'Failed to load conversation messages');
    } finally {
      setInspectorLoading(false);
    }
  };

  const handleModerateMessage = async (messageId) => {
    if (!window.confirm('Moderate this message? It will be cleared and replaced with a notice.')) {
      return;
    }
    try {
      await fetchApi(`/api/admin/messages/${messageId}`, { method: 'DELETE' });
      showNotification('success', 'Message moderated');
      setInspectorMessages(prev =>
        prev.map(m => (m._id === messageId || m.id === messageId) ? { ...m, isDeleted: true, text: 'This message was removed by Super Admin.', attachment: null } : m)
      );
    } catch (err) {
      showNotification('error', err.message || 'Failed to moderate message');
    }
  };

  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phoneNumber && u.phoneNumber.includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const filteredConversations = conversationsList.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (c.isGroup && c.groupName && c.groupName.toLowerCase().includes(q)) return true;
    if (c.creator && (c.creator.name?.toLowerCase().includes(q) || c.creator.phoneNumber?.includes(q))) return true;
    if (c.participant && (c.participant.name?.toLowerCase().includes(q) || c.participant.phoneNumber?.includes(q))) return true;
    return false;
  });

  return (
    <div className="admin-portal-overlay" onClick={onClose}>
      <div className="admin-portal-modal glass" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="admin-portal-header">
          <div className="admin-portal-title">
            <div className="admin-badge-icon">
              <Shield size={24} />
            </div>
            <div>
              <h2>Super Admin Control Center</h2>
              <p>Platform monitoring, global user management, and conversation oversight</p>
            </div>
          </div>
          <div className="admin-header-actions">
            <button
              className="admin-refresh-btn"
              onClick={loadOverviewData}
              title="Refresh Data"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </button>
            <button className="admin-close-btn" onClick={onClose} title="Close Portal">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Alerts */}
        {actionMessage.text && (
          <div className={`admin-alert ${actionMessage.type}`}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="admin-nav-tabs">
          <button
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
          >
            <Activity size={18} />
            <span>Overview & Stats</span>
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
          >
            <Users size={18} />
            <span>All Users ({usersList.length})</span>
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
            onClick={() => { setActiveTab('conversations'); setSearchQuery(''); }}
          >
            <MessageSquare size={18} />
            <span>All Conversations ({conversationsList.length})</span>
          </button>
          {selectedConversation && (
            <button
              className={`admin-tab-btn ${activeTab === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTab('inspector')}
            >
              <Eye size={18} />
              <span>Chat Inspector</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="admin-portal-body">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div className="admin-overview-grid">
              <div className="admin-stat-card">
                <div className="stat-card-icon users">
                  <Users size={28} />
                </div>
                <div className="stat-card-info">
                  <span className="stat-card-label">Total Users</span>
                  <h3 className="stat-card-value">{stats.totalUsers}</h3>
                  <span className="stat-card-sub text-green">
                    <span className="online-pulse-dot" /> {stats.onlineUsers} Online Now
                  </span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-card-icon conversations">
                  <Layers size={28} />
                </div>
                <div className="stat-card-info">
                  <span className="stat-card-label">Total Conversations</span>
                  <h3 className="stat-card-value">{stats.totalConversations}</h3>
                  <span className="stat-card-sub">
                    {stats.directConversations} Direct &bull; {stats.groupConversations} Groups
                  </span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-card-icon messages">
                  <MessageSquare size={28} />
                </div>
                <div className="stat-card-info">
                  <span className="stat-card-label">Total Messages</span>
                  <h3 className="stat-card-value">{stats.totalMessages}</h3>
                  <span className="stat-card-sub">
                    {stats.mediaMessages} with Media/Attachments
                  </span>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-card-icon security">
                  <Shield size={28} />
                </div>
                <div className="stat-card-info">
                  <span className="stat-card-label">Admin Role</span>
                  <h3 className="stat-card-value" style={{ fontSize: '1.2rem' }}>Super Admin</h3>
                  <span className="stat-card-sub text-accent">
                    Full Access Unlocked
                  </span>
                </div>
              </div>

              {/* Quick Summary Tables */}
              <div className="admin-recent-section" style={{ gridColumn: '1 / -1' }}>
                <div className="admin-section-header">
                  <h4>Recently Registered Users</h4>
                  <button className="admin-link-btn" onClick={() => setActiveTab('users')}>
                    View All Users &rarr;
                  </button>
                </div>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Phone Number</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.slice(0, 5).map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="user-cell-meta">
                              <img src={getAvatarUrl(u.avatar, u.name)} alt="" className="admin-avatar-sm" />
                              <span className="user-cell-name">{u.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="phone-badge">
                              <Phone size={12} /> {u.phoneNumber}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                          <td>
                            <span className={`role-pill role-${u.role}`}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <span className={`status-pill ${u.isOnline ? 'online' : 'offline'}`}>
                              {u.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="admin-users-view">
              <div className="admin-search-toolbar">
                <div className="admin-search-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by name, phone number, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-search-input"
                  />
                  {searchQuery && (
                    <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                      <X size={16} />
                    </button>
                  )}
                </div>
                <span className="results-counter">
                  Showing {filteredUsers.length} of {usersList.length} users
                </span>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Phone Number</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Messages</th>
                      <th>Status & Last Seen</th>
                      <th>Joined Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="user-cell-meta">
                              <img src={getAvatarUrl(u.avatar, u.name)} alt="" className="admin-avatar-sm" />
                              <div>
                                <div className="user-cell-name">{u.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Gender: {u.gender || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="phone-badge">
                              <Phone size={12} /> {u.phoneNumber}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                          <td>
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className={`role-select role-${u.role}`}
                              disabled={u.id === currentUser.id}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="superadmin">Super Admin</option>
                            </select>
                          </td>
                          <td style={{ fontWeight: 600 }}>{u.messageCount || 0}</td>
                          <td>
                            <div>
                              <span className={`status-pill ${u.isOnline ? 'online' : 'offline'}`}>
                                {u.isOnline ? 'Online' : 'Offline'}
                              </span>
                              {!u.isOnline && u.lastSeen && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {new Date(u.lastSeen).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            {u.id !== currentUser.id ? (
                              <button
                                className="admin-action-btn delete"
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600 }}>
                                (You)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ALL CONVERSATIONS */}
          {activeTab === 'conversations' && (
            <div className="admin-conversations-view">
              <div className="admin-search-toolbar">
                <div className="admin-search-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search conversations by title, creator, or participant phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-search-input"
                  />
                  {searchQuery && (
                    <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                      <X size={16} />
                    </button>
                  )}
                </div>
                <span className="results-counter">
                  {filteredConversations.length} conversation(s)
                </span>
              </div>

              <div className="admin-conversations-grid">
                {filteredConversations.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No conversations found.
                  </div>
                ) : (
                  filteredConversations.map(c => {
                    const title = c.isGroup ? c.groupName : `${c.creator?.name || 'User'} & ${c.participant?.name || 'User'}`;
                    return (
                      <div key={c.id} className="admin-conversation-card glass">
                        <div className="conv-card-header">
                          <div className="conv-type-badge">
                            {c.isGroup ? (
                              <span className="badge-group">Group Chat</span>
                            ) : (
                              <span className="badge-direct">Direct Chat</span>
                            )}
                          </div>
                          <span className="conv-msg-count">
                            <MessageSquare size={14} /> {c.messageCount} msgs
                          </span>
                        </div>

                        <h4 className="conv-title">{title}</h4>

                        <div className="conv-participants-info">
                          <span className="participants-label">Participants:</span>
                          <div className="participants-tags">
                            {c.isGroup && c.participants ? (
                              c.participants.map(p => (
                                <span key={p._id || p.id} className="p-tag">
                                  {p.name} {p.phoneNumber ? `(${p.phoneNumber})` : ''}
                                </span>
                              ))
                            ) : (
                              <>
                                <span className="p-tag">{c.creator?.name} ({c.creator?.phoneNumber || 'N/A'})</span>
                                <span className="p-tag">{c.participant?.name} ({c.participant?.phoneNumber || 'N/A'})</span>
                              </>
                            )}
                          </div>
                        </div>

                        {c.lastMessage && (
                          <div className="conv-last-msg-preview">
                            <span className="last-msg-sender">{c.lastMessage.senderName}:</span>
                            <span className="last-msg-text">
                              {c.lastMessage.text || (c.lastMessage.attachment ? '[Attachment]' : '')}
                            </span>
                          </div>
                        )}

                        <div className="conv-card-footer">
                          <span className="conv-updated-at">
                            <Clock size={12} /> {new Date(c.lastUpdated).toLocaleString()}
                          </span>
                          <button
                            className="btn-inspect"
                            onClick={() => handleInspectConversation(c)}
                          >
                            <Eye size={14} /> Inspect Chat
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CHAT INSPECTOR */}
          {activeTab === 'inspector' && selectedConversation && (
            <div className="admin-inspector-view">
              <div className="inspector-top-bar">
                <div>
                  <button className="back-btn" onClick={() => setActiveTab('conversations')}>
                    &larr; Back to Conversations
                  </button>
                  <h3 className="inspector-heading">
                    {selectedConversation.isGroup ? selectedConversation.groupName : 'Direct Conversation'}
                  </h3>
                  <span className="inspector-sub">
                    ID: {selectedConversation.id} &bull; Total Messages: {inspectorMessages.length}
                  </span>
                </div>
                <button
                  className="btn-refresh-inspect"
                  onClick={() => handleInspectConversation(selectedConversation)}
                  disabled={inspectorLoading}
                >
                  <RefreshCw size={14} className={inspectorLoading ? 'spin' : ''} /> Refresh Messages
                </button>
              </div>

              <div className="inspector-messages-container">
                {inspectorLoading ? (
                  <div className="inspector-loading">Loading chat history...</div>
                ) : inspectorMessages.length === 0 ? (
                  <div className="inspector-empty">No messages in this conversation.</div>
                ) : (
                  inspectorMessages.map(msg => {
                    const isSenderAdmin = msg.sender?.role === 'superadmin';
                    return (
                      <div key={msg._id || msg.id} className={`inspector-message-row ${msg.isDeleted ? 'deleted' : ''}`}>
                        <img
                          src={getAvatarUrl(msg.sender?.avatar, msg.sender?.name)}
                          alt=""
                          className="inspector-sender-avatar"
                        />
                        <div className="inspector-message-content">
                          <div className="inspector-meta-row">
                            <span className="msg-sender-name">
                              {msg.sender?.name || 'Unknown'} {isSenderAdmin ? '(Super Admin)' : ''}
                            </span>
                            <span className="msg-sender-phone">
                              {msg.sender?.phoneNumber ? `[${msg.sender.phoneNumber}]` : ''}
                            </span>
                            <span className="msg-time">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                            {!msg.isDeleted && (
                              <button
                                className="msg-moderate-btn"
                                onClick={() => handleModerateMessage(msg._id || msg.id)}
                                title="Moderate/Remove Message"
                              >
                                <Trash2 size={12} /> Moderate
                              </button>
                            )}
                          </div>

                          {msg.replyTo && (
                            <div className="inspector-reply-banner">
                              Replying to {msg.replyTo.sender?.name}: {msg.replyTo.text?.substring(0, 40)}...
                            </div>
                          )}

                          <div className={`inspector-text ${msg.isDeleted ? 'deleted-text' : ''}`}>
                            {msg.text || (msg.isDeleted ? '[Message removed]' : '')}
                          </div>

                          {msg.attachment && (
                            <div className="inspector-attachment">
                              {msg.attachmentType === 'image' ? (
                                <img src={msg.attachment} alt="Attachment" className="inspector-image-preview" />
                              ) : (
                                <a href={msg.attachment} target="_blank" rel="noreferrer" className="inspector-file-link">
                                  <FileText size={14} /> {msg.attachmentName || 'View Attachment'}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
