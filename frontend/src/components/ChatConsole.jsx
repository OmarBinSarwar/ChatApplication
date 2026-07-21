import {
  Image,
  LogOut,
  Menu,
  Plus,
  Send,
  X,
  MessageSquare,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { BASE_URL, fetchApi } from "../lib/api";

export default function ChatConsole({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]); // All users to start chat with
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [callState, setCallState] = useState({
    incoming: null,
    active: false,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isVideoOff: false,
  });

  const socketRef = useRef();
  const messagesEndRef = useRef();
  const typingTimeoutRef = useRef();
  const chatAreaRef = useRef();
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Handle mobile virtual keyboard
  useEffect(() => {
    const handleVisualViewportResize = () => {
      if (chatAreaRef.current && window.visualViewport) {
        const vh = window.visualViewport.height;
        const headerHeight = window.innerWidth <= 480 ? 52 : 56;
        chatAreaRef.current.style.height = `${vh - headerHeight}px`;

        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    const handleFocus = () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener(
        "resize",
        handleVisualViewportResize,
      );
    }

    const inputElements = document.querySelectorAll(".chat-input");
    inputElements.forEach((input) => {
      input.addEventListener("focus", handleFocus);
    });

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener(
          "resize",
          handleVisualViewportResize,
        );
      }
      inputElements.forEach((input) => {
        input.removeEventListener("focus", handleFocus);
      });
    };
  }, []);

  useEffect(() => {
    // Connect to socket
    socketRef.current = io(BASE_URL, {
      withCredentials: true,
    });

    socketRef.current.emit("register", user.id);

    socketRef.current.on("new_message", (msg) => {
      setMessages((prev) => {
        // Check if message belongs to active conversation
        if (
          activeConversation &&
          msg.conversation_id === activeConversation.id
        ) {
          return [...prev, msg];
        }
        return prev;
      });
      fetchConversations();
    });

    socketRef.current.on("user_typing", (uId) => {
      // Find user name if needed, here we just show typing...
      setTypingUser("typing...");
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    });

    socketRef.current.on("user_stop_typing", () => {
      setTypingUser(null);
    });

    socketRef.current.on("incoming_call", async (data) => {
      setCallState((prev) => ({
        ...prev,
        incoming: {
          from: data.from,
          offer: data.offer,
        },
      }));
    });

    socketRef.current.on("call_answered", async (data) => {
      const peerConnection = peerConnectionRef.current;
      if (peerConnection && data.answer) {
        try {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer),
          );
        } catch (error) {
          console.error("Failed to set remote description", error);
        }
      }
    });

    socketRef.current.on("call_rejected", () => {
      setCallState((prev) => ({ ...prev, incoming: null, active: false }));
    });

    socketRef.current.on("call_ice_candidate", async (data) => {
      const peerConnection = peerConnectionRef.current;
      if (peerConnection && data.candidate) {
        await peerConnection.addIceCandidate(data.candidate);
      }
    });

    socketRef.current.on("call_ended", () => {
      endLocalCall();
    });

    fetchConversations();
    fetchAllUsers();

    return () => {
      socketRef.current.disconnect();
    };
  }, [user.id, activeConversation]);

  useEffect(() => {
    if (activeConversation) {
      socketRef.current.emit("join_conversation", activeConversation.id);
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }

    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.localStream, callState.remoteStream]);

  const fetchConversations = async () => {
    try {
      const data = await fetchApi("/api/conversations");
      setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const data = await fetchApi("/api/users");
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
      const conv = await fetchApi("/api/conversations", {
        method: "POST",
        body: { participantId: otherUserId },
      });
      await fetchConversations();
      const updatedConv = await fetchApi("/api/conversations").then((res) =>
        res.find((c) => c.id === conv.id),
      );
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
      payload.append("text", newMessage);
      payload.append("receiverId", activeConversation.other_user.id);
      if (file) payload.append("attachment", file);

      const msg = await fetchApi(`/api/messages/${activeConversation.id}`, {
        method: "POST",
        body: payload,
      });

      socketRef.current.emit("send_message", msg);
      socketRef.current.emit("stop_typing", {
        conversationId: activeConversation.id,
        userId: user.id,
      });
      setNewMessage("");
      setFile(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (activeConversation) {
      socketRef.current.emit("typing", {
        conversationId: activeConversation.id,
        userId: user.id,
      });
    }
  };

  const createPeerConnection = async (remoteUserId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnectionRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("send_ice_candidate", {
          toUserId: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        setCallState((prev) => ({
          ...prev,
          remoteStream,
          active: true,
        }));
      }
    };

    return peerConnection;
  };

  const startCall = async (remoteUserId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const peerConnection = await createPeerConnection(remoteUserId);
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      setCallState((prev) => ({
        ...prev,
        localStream: stream,
        active: true,
      }));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socketRef.current.emit("call_user", {
        toUserId: remoteUserId,
        fromUserId: user.id,
        offer,
      });
    } catch (error) {
      console.error("Unable to start call", error);
    }
  };

  const acceptCall = async () => {
    try {
      const incoming = callState.incoming;
      if (!incoming) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const peerConnection = await createPeerConnection(incoming.from);
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      setCallState((prev) => ({
        ...prev,
        localStream: stream,
        active: true,
        incoming: null,
      }));

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(incoming.offer),
      );
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socketRef.current.emit("answer_call", {
        toUserId: incoming.from,
        answer,
      });
    } catch (error) {
      console.error("Unable to accept call", error);
    }
  };

  const rejectCall = () => {
    if (callState.incoming?.from) {
      socketRef.current.emit("reject_call", {
        toUserId: callState.incoming.from,
      });
    }
    setCallState((prev) => ({ ...prev, incoming: null, active: false }));
  };

  const endLocalCall = () => {
    if (callState.localStream) {
      callState.localStream.getTracks().forEach((track) => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCallState((prev) => ({
      ...prev,
      active: false,
      incoming: null,
      localStream: null,
      remoteStream: null,
    }));
  };

  const toggleMute = () => {
    if (callState.localStream) {
      const audioTrack = callState.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  };

  const toggleVideo = () => {
    if (callState.localStream) {
      const videoTrack = callState.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState((prev) => ({ ...prev, isVideoOff: !videoTrack.enabled }));
      }
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header glass">
        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="mobile-title">OBS ChatApp</h1>
        <LogOut size={20} className="logout-icon" onClick={onLogout} />
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar glass ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <MessageSquare size={18} className="sidebar-brand-icon" />
          <h2>OBS ChatApp</h2>
        </div>
        <div className="sidebar-header">
          <img
            src={
              user.avatar
                ? `${BASE_URL}${user.avatar}`
                : "https://ui-avatars.com/api/?name=" + user.name
            }
            alt="avatar"
            className="avatar"
          />
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1rem", margin: 0 }}>{user.name}</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Online
            </span>
          </div>
          <button
            className="close-sidebar-btn desktop-only"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: "1rem",
            borderBottom: "1px solid var(--panel-border)",
          }}
        >
          <button
            className="btn new-chat-btn"
            onClick={() => setShowUsersPanel(!showUsersPanel)}
          >
            <Plus size={18} /> <span>New Chat</span>
          </button>
        </div>

        {showUsersPanel ? (
          <div className="conversations-list">
            <h4
              style={{
                margin: "1rem 1rem 0.5rem 1rem",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              Available Users
            </h4>
            {users.map((u) => (
              <div
                key={u.id}
                className="conversation-item"
                onClick={() => {
                  handleStartChat(u.id);
                  setSidebarOpen(false);
                }}
              >
                <img
                  src={
                    u.avatar
                      ? `${BASE_URL}${u.avatar}`
                      : "https://ui-avatars.com/api/?name=" + u.name
                  }
                  className="avatar"
                  style={{ width: 40, height: 40 }}
                  alt=""
                />
                <span>{u.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="conversations-list">
            <h4
              style={{
                margin: "1rem 1rem 0.5rem 1rem",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              Recent
            </h4>
            {conversations.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  color: "var(--text-muted)",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}
              >
                No conversations yet
              </div>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className={`conversation-item ${activeConversation?.id === c.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveConversation(c);
                    setSidebarOpen(false);
                  }}
                >
                  <img
                    src={
                      c.other_user.avatar
                        ? `${BASE_URL}${c.other_user.avatar}`
                        : "https://ui-avatars.com/api/?name=" +
                          c.other_user.name
                    }
                    className="avatar"
                    style={{ width: 40, height: 40 }}
                    alt=""
                  />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div
                      style={{
                        fontWeight: 500,
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.other_user.name}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        <div className="sidebar-footer">
          <span>OBS ChatApp &bull; &copy; {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Main Chat Area */}
      {activeConversation ? (
        <div className="chat-area glass" ref={chatAreaRef}>
          <div className="chat-header">
            <img
              src={
                activeConversation.other_user.avatar
                  ? `${BASE_URL}${activeConversation.other_user.avatar}`
                  : "https://ui-avatars.com/api/?name=" +
                    activeConversation.other_user.name
              }
              className="avatar"
              alt=""
            />
            <div className="chat-header-info">
              <h3>{activeConversation.other_user.name}</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Active now
              </span>
            </div>
            <button
              className="btn"
              style={{ marginLeft: "auto" }}
              onClick={() => startCall(activeConversation.other_user.id)}
              type="button"
            >
              <Video size={18} />
            </button>
          </div>

          {callState.incoming && (
            <div className="call-banner">
              <span>Incoming video call from {callState.incoming.from}</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn" onClick={acceptCall} type="button">
                  Accept
                </button>
                <button className="btn" onClick={rejectCall} type="button">
                  Reject
                </button>
              </div>
            </div>
          )}

          {callState.active && (
            <div className="call-panel">
              <div className="call-video-wrap">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="call-video"
                />
                <span className="call-label">You</span>
              </div>

              <div className="call-video-wrap">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="call-video"
                />
                <span className="call-label">Remote</span>
              </div>

              <div className="call-controls">
                <button className="btn" onClick={toggleMute} type="button">
                  {callState.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button className="btn" onClick={toggleVideo} type="button">
                  {callState.isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    endLocalCall();
                    socketRef.current.emit("end_call", {
                      toUserId: activeConversation.other_user.id,
                    });
                  }}
                  type="button"
                >
                  <PhoneOff size={18} />
                </button>
              </div>
            </div>
          )}

          <div className="messages-container">
            {messages.map((m) => {
              const isSent = m.sender_id === user.id;
              return (
                <div
                  key={m.id}
                  className={`message-wrapper ${isSent ? "sent" : "received"}`}
                >
                  {m.text && <div className="message-bubble">{m.text}</div>}
                  {m.attachment && (
                    <img
                      src={`${BASE_URL}${m.attachment}`}
                      className="message-attachment"
                      alt="attachment"
                    />
                  )}
                  <span className="message-time">
                    {new Date(m.date_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
            {typingUser && <div className="typing-indicator">{typingUser}</div>}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-container" onSubmit={handleSendMessage}>
            <label className="file-input-label" title="Attach image">
              <Image size={20} />
              <input
                type="file"
                style={{ display: "none" }}
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file && <span className="file-badge">1</span>}
            </label>
            <input
              type="text"
              className="chat-input"
              placeholder="Message..."
              value={newMessage}
              onChange={handleTyping}
              maxLength="500"
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!newMessage.trim() && !file}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <div className="chat-area glass empty-state">
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div className="empty-state-icon-wrapper">
              <MessageSquare size={48} className="empty-state-icon" />
            </div>
            <div>
              <h2
                style={{
                  marginBottom: "0.5rem",
                  color: "var(--text-main)",
                  fontSize: "1.8rem",
                  fontWeight: 700,
                  letterSpacing: "-0.5px"
                }}
              >
                OBS ChatApp
              </h2>
              <p style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
                Select a conversation or start a new one
              </p>
            </div>
          </div>
          <div className="empty-state-footer">
            <p>&copy; {new Date().getFullYear()} OBS ChatApp &bull; Designed & Developed by Omar Bin Sarwar</p>
          </div>
        </div>
      )}
    </div>
  );
}
