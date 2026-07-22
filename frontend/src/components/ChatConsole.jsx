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
  Monitor,
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

  // Group creation state
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // Mesh video calling state
  const [isInCallRoom, setIsInCallRoom] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState([]); // Array of { socketId, userId, name, stream, isScreenSharing }
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callState, setCallState] = useState({
    incoming: null, // { conversationId, callerName, callerId }
    active: false,
    localStream: null,
    isMuted: false,
    isVideoOff: false,
  });

  const socketRef = useRef();
  const messagesEndRef = useRef();
  const typingTimeoutRef = useRef();
  const chatAreaRef = useRef();
  const activeConversationRef = useRef(activeConversation);
  
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);
  
  // Mesh refs
  const pcsRef = useRef({}); // remoteSocketId -> RTCPeerConnection
  const localStreamRef = useRef(null);
  const cameraVideoTrackRef = useRef(null);
  const localVideoRef = useRef(null);

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
          activeConversationRef.current &&
          msg.conversation_id === activeConversationRef.current.id
        ) {
          // Prevent duplicate messages if already appended locally
          if (prev.some((m) => m._id === msg._id || m.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        }
        return prev;
      });
      fetchConversations();
    });

    socketRef.current.on("user_typing", (uId) => {
      setTypingUser("typing...");
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    });

    socketRef.current.on("user_stop_typing", () => {
      setTypingUser(null);
    });

    // Mesh Group Calling Sockets
    socketRef.current.on("group_call_incoming", (data) => {
      setCallState((prev) => ({
        ...prev,
        incoming: {
          conversationId: data.conversationId,
          callerName: data.callerName,
          callerId: data.callerId,
        },
      }));
    });

    socketRef.current.on("group_call_ended", (data) => {
      setCallState((prev) => {
        if (prev.incoming && prev.incoming.conversationId === data.conversationId) {
          return { ...prev, incoming: null };
        }
        return prev;
      });
    });

    socketRef.current.on("user_joined_call", async (data) => {
      const { socketId, userId, name } = data;
      console.log("User joined call:", name, socketId);
      const pc = createPeerConnection(socketId, userId, name);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("send_call_signal", {
          targetSocketId: socketId,
          signalData: offer,
        });
      } catch (err) {
        console.error("Failed to create offer for new user", err);
      }
    });

    socketRef.current.on("receive_call_signal", async (data) => {
      const { fromSocketId, signalData } = data;
      console.log("Received call signal from:", fromSocketId, signalData.type);
      const pc = createPeerConnection(fromSocketId, null, null);
      
      if (signalData.type === "offer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit("send_call_signal", {
            targetSocketId: fromSocketId,
            signalData: answer,
          });
        } catch (err) {
          console.error("Failed to answer offer", err);
        }
      } else if (signalData.type === "answer") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        } catch (err) {
          console.error("Failed to set remote description answer", err);
        }
      }
    });

    socketRef.current.on("receive_call_ice_candidate", async (data) => {
      const { fromSocketId, candidate } = data;
      const pc = pcsRef.current[fromSocketId];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Failed to add ice candidate", err);
        }
      }
    });

    socketRef.current.on("user_left_call", (data) => {
      const { socketId } = data;
      console.log("User left call:", socketId);
      if (pcsRef.current[socketId]) {
        pcsRef.current[socketId].close();
        delete pcsRef.current[socketId];
      }
      setRemoteStreams((prev) => prev.filter((s) => s.socketId !== socketId));
    });

    socketRef.current.on("user_toggled_screenshare", (data) => {
      const { socketId, isSharing } = data;
      setRemoteStreams((prev) =>
        prev.map((s) =>
          s.socketId === socketId ? { ...s, isScreenSharing: isSharing } : s
        )
      );
    });

    fetchConversations();
    fetchAllUsers();

    return () => {
      socketRef.current.disconnect();
    };
  }, [user.id]);

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
  }, [callState.localStream]);

  const fetchConversations = async () => {
    try {
      const data = await fetchApi("/api/conversations");
      const sortedData = data.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));
      setConversations(sortedData);
      
      // Join all conversation rooms so we receive new_message events for background chats!
      data.forEach(c => {
        if (socketRef.current) socketRef.current.emit("join_conversation", c.id);
      });
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

  const handleStartGroupChat = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedParticipants.length === 0) return;

    try {
      const conv = await fetchApi("/api/conversations/group", {
        method: "POST",
        body: {
          groupName: groupName.trim(),
          participantIds: selectedParticipants,
        },
      });
      await fetchConversations();
      const updatedConv = await fetchApi("/api/conversations").then((res) =>
        res.find((c) => c.id === conv.id),
      );
      setActiveConversation(updatedConv);
      setShowUsersPanel(false);
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedParticipants([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConversationClick = async (c) => {
    setActiveConversation(c);
    setSidebarOpen(false);
    if (c.unreadCount > 0) {
      try {
        await fetchApi(`/api/messages/${c.id}/read`, { method: "PUT" });
        setConversations(prev => prev.map(conv => conv.id === c.id ? { ...conv, unreadCount: 0 } : conv));
      } catch (e) {
        console.error("Failed to mark as read", e);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    try {
      const payload = new FormData();
      payload.append("text", newMessage);
      if (activeConversation && !activeConversation.isGroup) {
        payload.append("receiverId", activeConversation.other_user.id);
      }
      if (file) payload.append("attachment", file);

      const msg = await fetchApi(`/api/messages/${activeConversation.id}`, {
        method: "POST",
        body: payload,
      });

      // Instant feedback for sender
      setMessages((prev) => [...prev, msg]);

      const notifyUsers = activeConversation.isGroup 
        ? activeConversation.participants || []
        : [activeConversation.other_user._id || activeConversation.other_user.id];

      socketRef.current.emit("send_message", { msg, notifyUsers });
      socketRef.current.emit("stop_typing", {
        conversationId: activeConversation.id,
        userId: user.id,
      });
      setNewMessage("");
      setFile(null);
      fetchConversations();
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

  const createPeerConnection = (remoteSocketId, remoteUserId, remoteName) => {
    if (pcsRef.current[remoteSocketId]) {
      return pcsRef.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcsRef.current[remoteSocketId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("send_call_ice_candidate", {
          targetSocketId: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams((prev) => {
        if (prev.some((s) => s.socketId === remoteSocketId)) {
          return prev.map((s) =>
            s.socketId === remoteSocketId ? { ...s, stream: remoteStream } : s
          );
        }
        
        let displayName = remoteName;
        if (!displayName && activeConversation) {
          if (activeConversation.isGroup) {
            const participant = activeConversation.participants.find(p => p.id === remoteUserId);
            if (participant) displayName = participant.name;
          } else {
            displayName = activeConversation.other_user.name;
          }
        }
        if (!displayName) displayName = "User";

        return [
          ...prev,
          {
            socketId: remoteSocketId,
            userId: remoteUserId,
            name: displayName,
            stream: remoteStream,
            isScreenSharing: false,
          },
        ];
      });
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    return pc;
  };

  const startCall = async (roomId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      setCallState((prev) => ({
        ...prev,
        localStream: stream,
        active: true,
        incoming: null,
      }));
      setIsInCallRoom(true);

      // Notify other conversation members of call
      socketRef.current.emit("start_group_call", {
        conversationId: roomId,
        callerName: user.name,
        callerId: user.id,
      });

      socketRef.current.emit("join_call_room", {
        roomId,
        userId: user.id,
        name: user.name,
      });
    } catch (error) {
      console.error("Unable to start call", error);
    }
  };

  const acceptCall = async () => {
    const incoming = callState.incoming;
    if (!incoming) return;
    startCall(incoming.conversationId);
  };

  const rejectCall = () => {
    setCallState((prev) => ({ ...prev, incoming: null, active: false }));
  };

  const endLocalCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    for (const socketId in pcsRef.current) {
      pcsRef.current[socketId].close();
    }
    pcsRef.current = {};

    if (activeConversation) {
      socketRef.current.emit("leave_call_room", activeConversation.id);
      socketRef.current.emit("end_group_call", { conversationId: activeConversation.id });
    }

    setCallState((prev) => ({
      ...prev,
      active: false,
      incoming: null,
      localStream: null,
    }));
    setRemoteStreams([]);
    setIsInCallRoom(false);
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        cameraVideoTrackRef.current = localStreamRef.current.getVideoTracks()[0];
        
        for (const socketId in pcsRef.current) {
          const pc = pcsRef.current[socketId];
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }
        
        if (cameraVideoTrackRef.current) {
          localStreamRef.current.removeTrack(cameraVideoTrackRef.current);
          localStreamRef.current.addTrack(screenTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        screenTrack.onended = () => {
          stopScreenShare(screenTrack);
        };
        
        socketRef.current.emit("toggle_screenshare_signal", {
          roomId: activeConversation.id,
          isSharing: true
        });
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Failed to share screen", err);
      }
    } else {
      const screenTrack = localStreamRef.current.getVideoTracks()[0];
      stopScreenShare(screenTrack);
    }
  };

  const stopScreenShare = async (screenTrack) => {
    if (screenTrack) {
      screenTrack.stop();
    }
    
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const cameraTrack = camStream.getVideoTracks()[0];
      
      if (localStreamRef.current) {
        const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (currentVideoTrack) localStreamRef.current.removeTrack(currentVideoTrack);
        localStreamRef.current.addTrack(cameraTrack);
      }
      
      for (const socketId in pcsRef.current) {
        const pc = pcsRef.current[socketId];
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (err) {
      console.error("Failed to restore camera stream", err);
    }
    
    socketRef.current.emit("toggle_screenshare_signal", {
      roomId: activeConversation.id,
      isSharing: false
    });
    setIsScreenSharing(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState((prev) => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
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
            display: "flex",
            gap: "0.5rem",
          }}
        >
          <button
            className="btn new-chat-btn"
            style={{ flex: 1 }}
            onClick={() => {
              setShowUsersPanel(!showUsersPanel);
              setIsCreatingGroup(false);
            }}
          >
            <Plus size={18} /> <span>New Chat</span>
          </button>
          <button
            className="btn new-chat-btn"
            style={{ flex: 1, background: "rgba(255, 255, 255, 0.07)" }}
            onClick={() => {
              setShowUsersPanel(true);
              setIsCreatingGroup(true);
              setSelectedParticipants([]);
              setGroupName("");
            }}
          >
            <Plus size={18} /> <span>New Group</span>
          </button>
        </div>

        {showUsersPanel && isCreatingGroup ? (
          <div className="conversations-list">
            <form onSubmit={handleStartGroupChat} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 600, margin: 0 }}>Create Group</h4>
              <input
                type="text"
                placeholder="Group Name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="chat-input"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--panel-border)", padding: "0.6rem 0.8rem", borderRadius: "8px", color: "white" }}
                required
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto", paddingRight: "0.25rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Select Participants:</span>
                {users.map((u) => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParticipants(prev => [...prev, u.id]);
                        } else {
                          setSelectedParticipants(prev => prev.filter(id => id !== u.id));
                        }
                      }}
                    />
                    <span>{u.name}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>Create</button>
                <button type="button" className="btn" style={{ flex: 1, background: "rgba(255,255,255,0.05)" }} onClick={() => { setIsCreatingGroup(false); setShowUsersPanel(false); }}>Cancel</button>
              </div>
            </form>
          </div>
        ) : showUsersPanel ? (
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
              conversations.map((c) => {
                const name = c.isGroup ? c.groupName : c.other_user.name;
                const avatarUrl = !c.isGroup && c.other_user.avatar ? `${BASE_URL}${c.other_user.avatar}` : null;
                return (
                  <div
                    key={c.id}
                    className={`conversation-item ${activeConversation?.id === c.id ? "active" : ""}`}
                    onClick={() => handleConversationClick(c)}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} className="avatar" style={{ width: 40, height: 40 }} alt="" />
                    ) : (
                      <div className="avatar" style={{ width: 40, height: 40, background: "var(--accent-purple)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1rem", borderRadius: "50%" }}>
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div
                        style={{
                          fontWeight: 500,
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {name}
                      </div>
                    </div>
                    {c.unreadCount > 0 && (
                      <div style={{
                        background: "#ef4444",
                        color: "white",
                        borderRadius: "10px",
                        padding: "2px 6px",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        marginLeft: "auto"
                      }}>
                        {c.unreadCount}
                      </div>
                    )}
                  </div>
                );
              })
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
            {(!activeConversation.isGroup && activeConversation.other_user.avatar) ? (
              <img
                src={`${BASE_URL}${activeConversation.other_user.avatar}`}
                className="avatar"
                alt=""
              />
            ) : (
              <div className="avatar" style={{ width: 40, height: 40, background: "var(--accent-purple)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1rem", borderRadius: "50%", marginRight: "0.75rem" }}>
                {(activeConversation.isGroup ? activeConversation.groupName : activeConversation.other_user.name).substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="chat-header-info">
              <h3>{activeConversation.isGroup ? activeConversation.groupName : activeConversation.other_user.name}</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {activeConversation.isGroup 
                  ? `${activeConversation.participants?.length || 0} participants` 
                  : "Active now"
                }
              </span>
            </div>
            <button
              className="btn"
              style={{ marginLeft: "auto" }}
              onClick={() => startCall(activeConversation.id)}
              type="button"
            >
              <Video size={18} />
            </button>
          </div>

          {callState.incoming && callState.incoming.conversationId === activeConversation.id && (
            <div className="call-banner">
              <span>Active call started by {callState.incoming.callerName}</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn" onClick={acceptCall} type="button">
                  Join Call
                </button>
                <button className="btn" onClick={rejectCall} type="button">
                  Dismiss
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
                <span className="call-label">You {isScreenSharing && "(Sharing Screen)"}</span>
              </div>

              {remoteStreams.map((remote) => (
                <div key={remote.socketId} className="call-video-wrap">
                  <video
                    ref={(el) => {
                      if (el) el.srcObject = remote.stream;
                    }}
                    autoPlay
                    playsInline
                    className="call-video"
                  />
                  <span className="call-label">{remote.name} {remote.isScreenSharing && "(Sharing Screen)"}</span>
                </div>
              ))}

              <div className="call-controls">
                <button className="btn" onClick={toggleMute} type="button" title="Mute Audio">
                  {callState.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button className="btn" onClick={toggleVideo} type="button" title="Toggle Camera">
                  {callState.isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
                <button className="btn" onClick={toggleScreenShare} type="button" title="Share Screen">
                  <Monitor size={18} style={{ color: isScreenSharing ? "var(--accent-purple)" : "white" }} />
                </button>
                <button
                  className="btn"
                  onClick={endLocalCall}
                  type="button"
                  style={{ backgroundColor: "#ef4444" }}
                  title="Hang Up"
                >
                  <PhoneOff size={18} />
                </button>
              </div>
            </div>
          )}

          <div className="messages-container">
            {messages.map((m) => {
              const isSent = m.sender_id === user.id;
              let senderName = "User";
              if (!isSent && activeConversation.isGroup) {
                const participant = activeConversation.participants?.find(p => p.id === m.sender_id || p._id === m.sender_id);
                if (participant) senderName = participant.name;
              }
              return (
                <div
                  key={m.id}
                  className={`message-wrapper ${isSent ? "sent" : "received"}`}
                >
                  {!isSent && activeConversation.isGroup && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem", display: "block", fontWeight: "600" }}>
                      {senderName}
                    </span>
                  )}
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
