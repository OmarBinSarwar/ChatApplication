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
  Phone,
  Heart,
  ThumbsUp,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  Smile,
  Search,
  Play,
  Pause,
  Settings,
  Pin,
  PinOff,
  CornerUpRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { BASE_URL, fetchApi } from "../lib/api";
import ProfileSettings from "./ProfileSettings";

const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    icon: "😊",
    emojis: ["😀", "😃", "😄", "😁", "😆", "🥹", "😅", "😂", "🤣", "🥲", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🫡", "🤔", "🫣", "🫢", "🤫", "🤥", "😶", "😐", "😑", "😬", "🫠", "🫥"]
  },
  {
    name: "Gestures",
    icon: "👍",
    emojis: ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "🖐️", "✋", "🖖", "👋", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "💪", "🦾", "🧠", "🫀", "🫁"]
  },
  {
    name: "Hearts & Fire",
    icon: "❤️",
    emojis: ["❤️", "🩷", "🧡", "💛", "💚", "💙", "🩵", "💜", "🤎", "🖤", "🩶", "🤍", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💯", "🔥", "✨", "🌟", "⭐", "💥", "🎉", "🎊", "⚡", "💫"]
  },
  {
    name: "Animals",
    icon: "🐶",
    emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🦄", "🐝", "🦋"]
  },
  {
    name: "Food & Drinks",
    icon: "🍕",
    emojis: ["🍕", "🍔", "🍟", "🌭", "🍿", "🥓", "🥞", "🧇", "🍳", "🥪", "🥗", "🥣", "🌮", "🌯", "🥐", "🍞", "🥖", "🥨", "🧀", "🍖", "🍗", "🥩", "🍺", "🍻", "🥂", "🍾", "🍷", "🥃", "🍸", "🍹", "🧃", "☕", "🍩", "🎂"]
  }
];

const getAttachmentUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url}`;
};

const isAudioAttachment = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  const audioExtensions = [".mp3", ".wav", ".webm", ".ogg", ".m4a", ".aac", ".flac"];
  return audioExtensions.some((ext) => lower.includes(ext)) || lower.includes("voice_message") || lower.includes("/video/upload/");
};

function VoiceMessagePlayer({ src, duration, isSender }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error("Audio playback error:", err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && (!totalDuration || isNaN(totalDuration))) {
      setTotalDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = totalDuration ? (currentTime / totalDuration) * 100 : 0;
  const barHeights = [45, 65, 30, 85, 50, 90, 45, 70, 100, 60, 40, 80, 55, 95, 35, 75, 50, 85];

  return (
    <div className={`voice-message-player ${isSender ? "sender" : "receiver"}`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button type="button" className="voice-play-btn" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: "2px" }} />}
      </button>

      <div className="voice-player-body">
        <div className="voice-wave-container">
          {barHeights.map((height, idx) => {
            const barProgress = (idx / barHeights.length) * 100;
            const isActive = barProgress <= progressPercent;
            return (
              <div
                key={idx}
                className={`voice-wave-bar ${isActive ? "active" : ""}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <input
          type="range"
          min="0"
          max={totalDuration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="voice-seek-slider"
        />
        <div className="voice-time-row">
          <span>{formatTime(currentTime)} / {formatTime(totalDuration)}</span>
        </div>
      </div>

      <button type="button" className="voice-speed-btn" onClick={cycleSpeed} title="Playback speed">
        {playbackRate}x
      </button>
    </div>
  );
}

const isSameId = (a, b) => {
  if (!a || !b) return false;
  const idA = typeof a === 'object' ? (a.id || a._id) : a;
  const idB = typeof b === 'object' ? (b.id || b._id) : b;
  if (!idA || !idB) return false;
  return String(idA) === String(idB);
};

const formatLastSeen = (isOnline, lastSeenInput) => {
  if (isOnline) return "Online";
  if (!lastSeenInput) return "Offline";

  const date = new Date(lastSeenInput);
  if (isNaN(date.getTime())) return "Offline";

  const now = new Date();
  const diffMs = Math.max(0, now - date);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  if (diffHours < 24 && now.getDate() === date.getDate()) {
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Last seen Today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.getDate() === date.getDate() && yesterday.getMonth() === date.getMonth()) {
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Last seen Yesterday at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `Last seen ${dateStr} at ${timeStr}`;
};

export default function ChatConsole({ user, onLogout, onUserUpdate }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]); // All users to start chat with
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null); // { id, text }
  const [errorMessage, setErrorMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [activeEmojiCat, setActiveEmojiCat] = useState(0);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [selectedForwardTargetIds, setSelectedForwardTargetIds] = useState([]);

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

    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

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
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!lightboxImage) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setLightboxImage(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxImage]);

  const isUserOnline = (userId, defaultIsOnline = false) => {
    if (!userId) return false;
    const idStr = String(userId);
    if (onlineUserIds.has(idStr)) return true;
    return defaultIsOnline;
  };

  const getUserLastSeen = (userId, defaultLastSeen = null) => {
    if (!userId) return defaultLastSeen;
    const idStr = String(userId);
    return lastSeenMap[idStr] || defaultLastSeen;
  };

  useEffect(() => {
    // Connect to socket
    socketRef.current = io(BASE_URL, {
      withCredentials: true,
    });

    socketRef.current.emit("register", user.id);

    socketRef.current.on("get_online_users", (ids) => {
      if (Array.isArray(ids)) {
        setOnlineUserIds(new Set(ids.map(String)));
      }
    });

    socketRef.current.on("user_online", (uId) => {
      if (!uId) return;
      const strId = String(uId);
      setOnlineUserIds((prev) => new Set([...prev, strId]));
    });

    socketRef.current.on("user_offline", (data) => {
      const uId = typeof data === "object" ? data.userId : data;
      const lastSeen = typeof data === "object" ? data.lastSeen : new Date();
      if (!uId) return;
      const strId = String(uId);
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(strId);
        return next;
      });
      setLastSeenMap((prev) => ({ ...prev, [strId]: lastSeen }));
    });

    socketRef.current.on("new_message", (msg) => {
      setMessages((prev) => {
        // Check if message belongs to active conversation
        if (
          activeConversationRef.current &&
          msg.conversation_id === activeConversationRef.current.id
        ) {
          // Prevent duplicate messages if already appended locally
          if (prev.some((m) => isSameId(m, msg))) {
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

    socketRef.current.on("message_liked", (updatedMsg) => {
      setMessages(prev => prev.map(m =>
        isSameId(m, updatedMsg) ? { ...m, like_count: updatedMsg.like_count, liked_by: updatedMsg.liked_by } : m
      ));
    });

    socketRef.current.on("message_edited", (updatedMsg) => {
      setMessages(prev => prev.map(m =>
        isSameId(m, updatedMsg) ? updatedMsg : m
      ));
    });

    socketRef.current.on("message_deleted", (updatedMsg) => {
      setMessages(prev => prev.map(m =>
        isSameId(m, updatedMsg) ? updatedMsg : m
      ));
    });

    socketRef.current.on("message_pinned", (data) => {
      const { conversationId, pinnedMessage } = data;
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, pinnedMessage } : c))
      );
      setActiveConversation((prev) => {
        if (prev && prev.id === conversationId) {
          return { ...prev, pinnedMessage };
        }
        return prev;
      });
    });

    socketRef.current.on("message_unpinned", (data) => {
      const { conversationId } = data;
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, pinnedMessage: null } : c))
      );
      setActiveConversation((prev) => {
        if (prev && prev.id === conversationId) {
          return { ...prev, pinnedMessage: null };
        }
        return prev;
      });
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

  const handleLike = async (msg) => {
    try {
      const msgId = msg.id || msg._id;
      const updated = await fetchApi(`/api/messages/${msgId}/like`, { method: "POST" });
      setMessages(prev => prev.map(m =>
        isSameId(m, msgId) ? { ...m, like_count: updated.like_count, liked_by: updated.liked_by } : m
      ));
      // broadcast to others in conversation
      socketRef.current.emit("message_liked", {
        conversationId: activeConversationRef.current?.id,
        updatedMessage: updated
      });
    } catch (e) {
      console.error("Failed to like message", e);
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

  const handleStartEdit = (msg) => {
    if (msg.is_deleted || msg.isDeleted) return;
    const msgId = msg.id || msg._id;
    if (!msgId) return;
    setEditingMessage({ id: msgId, text: msg.text || "" });
    setNewMessage(msg.text || "");
    setErrorMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setNewMessage("");
    setErrorMessage(null);
  };

  const handleDeleteMessage = async (msg) => {
    const msgId = msg.id || msg._id;
    if (!msgId) return;
    if (!window.confirm("Are you sure you want to delete this message?")) return;

    try {
      const updated = await fetchApi(`/api/messages/${msgId}`, {
        method: "DELETE",
      });

      setMessages((prev) =>
        prev.map((m) => (isSameId(m, msgId) ? updated : m))
      );

      socketRef.current.emit("message_deleted", {
        conversationId: activeConversationRef.current?.id,
        updatedMessage: updated,
      });

      if (editingMessage && isSameId(editingMessage.id, msgId)) {
        handleCancelEdit();
      }
    } catch (err) {
      console.error("Failed to delete message", err);
      setErrorMessage(err.message || "Failed to delete message");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handlePinMessage = async (msg) => {
    if (!activeConversation) return;
    const msgId = msg.id || msg._id;
    if (!msgId) return;

    try {
      const res = await fetchApi(`/api/conversations/${activeConversation.id}/pin/${msgId}`, {
        method: "PUT",
      });

      setActiveConversation((prev) => ({ ...prev, pinnedMessage: res.pinnedMessage }));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, pinnedMessage: res.pinnedMessage } : c))
      );

      socketRef.current.emit("message_pinned", {
        conversationId: activeConversation.id,
        pinnedMessage: res.pinnedMessage,
      });
    } catch (err) {
      console.error("Failed to pin message", err);
      setErrorMessage(err.message || "Failed to pin message");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleUnpinMessage = async () => {
    if (!activeConversation) return;

    try {
      await fetchApi(`/api/conversations/${activeConversation.id}/pin`, {
        method: "DELETE",
      });

      setActiveConversation((prev) => ({ ...prev, pinnedMessage: null }));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, pinnedMessage: null } : c))
      );

      socketRef.current.emit("message_unpinned", {
        conversationId: activeConversation.id,
      });
    } catch (err) {
      console.error("Failed to unpin message", err);
      setErrorMessage(err.message || "Failed to unpin message");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const scrollToPinnedMessage = (msgId) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "background 0.3s";
      const origBg = el.style.background;
      el.style.background = "rgba(167, 139, 250, 0.3)";
      setTimeout(() => {
        el.style.background = origBg;
      }, 2000);
    }
  };

  const handleOpenForwardModal = (msg) => {
    setForwardingMessage(msg);
    setSelectedForwardTargetIds([]);
  };

  const handleExecuteForward = async () => {
    if (!forwardingMessage || selectedForwardTargetIds.length === 0) return;
    const srcId = forwardingMessage.id || forwardingMessage._id;

    try {
      const res = await fetchApi("/api/messages/forward", {
        method: "POST",
        body: JSON.stringify({
          sourceMessageId: srcId,
          targetConversationIds: selectedForwardTargetIds,
        }),
      });

      if (res.messages && Array.isArray(res.messages)) {
        res.messages.forEach((msg) => {
          socketRef.current.emit("send_message", {
            msg,
            notifyUsers: [],
          });
        });
      }

      setForwardingMessage(null);
      setSelectedForwardTargetIds([]);
      fetchConversations();
    } catch (err) {
      console.error("Failed to forward message", err);
      setErrorMessage(err.message || "Failed to forward message");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [file]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (editingMessage) {
      if (!newMessage.trim()) return;
      try {
        const updated = await fetchApi(`/api/messages/${editingMessage.id}`, {
          method: "PUT",
          body: { text: newMessage.trim() },
        });

        setMessages((prev) =>
          prev.map((m) =>
            isSameId(m, editingMessage.id) ? updated : m
          )
        );

        socketRef.current.emit("message_edited", {
          conversationId: activeConversationRef.current?.id,
          updatedMessage: updated,
        });

        setEditingMessage(null);
        setNewMessage("");
        setErrorMessage(null);
      } catch (err) {
        console.error("Failed to edit message", err);
        setErrorMessage(err.message || "Failed to edit message");
        setTimeout(() => setErrorMessage(null), 4000);
      }
      return;
    }

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
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendLike = async () => {
    if (!activeConversation) return;
    try {
      const payload = new FormData();
      payload.append("text", "👍");
      if (!activeConversation.isGroup) {
        payload.append("receiverId", activeConversation.other_user._id || activeConversation.other_user.id);
      }
      const msg = await fetchApi(`/api/messages/${activeConversation.id}`, {
        method: "POST",
        body: payload,
      });
      setMessages((prev) => [...prev, msg]);
      const notifyUsers = activeConversation.isGroup
        ? activeConversation.participants || []
        : [activeConversation.other_user._id || activeConversation.other_user.id];
      socketRef.current.emit("send_message", { msg, notifyUsers });
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

  const startAudioCall = async (roomId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });

      localStreamRef.current = stream;
      setCallState((prev) => ({
        ...prev,
        localStream: stream,
        active: true,
        incoming: null,
        isVideoOff: true,
      }));
      setIsInCallRoom(true);

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
      console.error("Unable to start audio call", error);
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
                ? getAttachmentUrl(user.avatar)
                : "https://ui-avatars.com/api/?name=" + user.name
            }
            alt="avatar"
            className="avatar sidebar-avatar-clickable"
            onClick={() => setShowProfileSettings(true)}
            title="Edit profile"
          />
          <div
            style={{ flex: 1, cursor: "pointer" }}
            onClick={() => setShowProfileSettings(true)}
            title="Edit profile"
          >
            <h3 style={{ fontSize: "1rem", margin: 0 }}>{user.name}</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {user.statusMessage || "Online"}
            </span>
          </div>
          <button
            className="close-sidebar-btn profile-settings-btn"
            onClick={() => setShowProfileSettings(true)}
            title="Profile settings"
          >
            <Settings size={18} />
          </button>
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
            {users.map((u) => {
              const uId = u.id || u._id;
              const online = isUserOnline(uId, u.isOnline);
              return (
                <div
                  key={uId}
                  className="conversation-item"
                  onClick={() => {
                    handleStartChat(uId);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="avatar-badge-wrapper" style={{ marginRight: "0.75rem" }}>
                    <img
                      src={
                        u.avatar
                          ? getAttachmentUrl(u.avatar)
                          : "https://ui-avatars.com/api/?name=" + u.name
                      }
                      className="avatar"
                      style={{ width: 40, height: 40 }}
                      alt=""
                    />
                    <span className={`status-badge-dot ${online ? "online" : "offline"}`} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {formatLastSeen(online, getUserLastSeen(uId, u.lastSeen))}
                    </span>
                  </div>
                </div>
              );
            })}
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
                const name = c.isGroup ? c.groupName : c.other_user?.name;
                const avatarUrl = !c.isGroup && c.other_user?.avatar ? getAttachmentUrl(c.other_user.avatar) : null;
                const otherUserId = !c.isGroup && c.other_user ? (c.other_user.id || c.other_user._id) : null;
                const isOnline = !c.isGroup && otherUserId ? isUserOnline(otherUserId, c.other_user.isOnline) : false;

                return (
                  <div
                    key={c.id}
                    className={`conversation-item ${activeConversation?.id === c.id ? "active" : ""}`}
                    onClick={() => handleConversationClick(c)}
                  >
                    <div className="avatar-badge-wrapper" style={{ marginRight: "0.75rem" }}>
                      {avatarUrl ? (
                        <img src={avatarUrl} className="avatar" style={{ width: 40, height: 40 }} alt="" />
                      ) : (
                        <div className="avatar" style={{ width: 40, height: 40, background: "var(--accent-purple)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1rem", borderRadius: "50%" }}>
                          {name ? name.substring(0, 2).toUpperCase() : "US"}
                        </div>
                      )}
                      {!c.isGroup && (
                        <span className={`status-badge-dot ${isOnline ? "online" : "offline"}`} />
                      )}
                    </div>
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
                      {!c.isGroup && c.other_user && (
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {formatLastSeen(isOnline, getUserLastSeen(otherUserId, c.other_user.lastSeen))}
                        </div>
                      )}
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
            <div className="avatar-badge-wrapper" style={{ marginRight: "0.75rem" }}>
              {(!activeConversation.isGroup && activeConversation.other_user?.avatar) ? (
                <img
                  src={getAttachmentUrl(activeConversation.other_user.avatar)}
                  className="avatar"
                  style={{ width: 40, height: 40 }}
                  alt=""
                />
              ) : (
                <div className="avatar" style={{ width: 40, height: 40, background: "var(--accent-purple)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1rem", borderRadius: "50%" }}>
                  {(activeConversation.isGroup ? activeConversation.groupName : (activeConversation.other_user?.name || "User")).substring(0, 2).toUpperCase()}
                </div>
              )}
              {!activeConversation.isGroup && activeConversation.other_user && (
                <span className={`status-badge-dot ${isUserOnline(activeConversation.other_user.id || activeConversation.other_user._id, activeConversation.other_user.isOnline) ? "online" : "offline"}`} />
              )}
            </div>
            <div className="chat-header-info">
              <h3>{activeConversation.isGroup ? activeConversation.groupName : activeConversation.other_user?.name}</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {activeConversation.isGroup 
                  ? `${activeConversation.participants?.length || 0} participants` 
                  : formatLastSeen(
                      isUserOnline(activeConversation.other_user?.id || activeConversation.other_user?._id, activeConversation.other_user?.isOnline),
                      getUserLastSeen(activeConversation.other_user?.id || activeConversation.other_user?._id, activeConversation.other_user?.lastSeen)
                    )
                }
              </span>
            </div>
            <button
              title="Audio Call"
              style={{
                marginLeft: "auto",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#4ade80",
                marginRight: "0.4rem",
              }}
              onClick={() => startAudioCall(activeConversation.id)}
              type="button"
            >
              <Phone size={17} />
            </button>
            <button
              title="Video Call"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#a78bfa",
              }}
              onClick={() => startCall(activeConversation.id)}
              type="button"
            >
              <Video size={17} />
            </button>
          </div>

          {activeConversation.pinnedMessage && (
            <div
              className="pinned-banner"
              onClick={() => scrollToPinnedMessage(activeConversation.pinnedMessage.id || activeConversation.pinnedMessage._id)}
            >
              <Pin size={16} className="pinned-banner-icon" />
              <div className="pinned-banner-content">
                <strong>Pinned: </strong>
                <span>
                  {activeConversation.pinnedMessage.text
                    ? activeConversation.pinnedMessage.text
                    : activeConversation.pinnedMessage.attachment
                    ? "Attachment"
                    : "Pinned message"}
                </span>
              </div>
              <button
                type="button"
                className="pinned-banner-unpin"
                title="Unpin message"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnpinMessage();
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}

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
              const isDeleted = m.is_deleted || m.isDeleted;
              const isEdited = (m.edited_at || m.editedAt) && !isDeleted;

              let senderName = "User";
              if (!isSent && activeConversation.isGroup) {
                const participant = activeConversation.participants?.find(p => p.id === m.sender_id || p._id === m.sender_id);
                if (participant) senderName = participant.name;
              }

              return (
                <div
                  id={`msg-${m.id || m._id}`}
                  key={m.id || m._id}
                  className={`message-wrapper ${isSent ? "sent" : "received"}`}
                >
                  {!isSent && activeConversation.isGroup && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem", display: "block", fontWeight: "600" }}>
                      {senderName}
                    </span>
                  )}
                  {(m.is_forwarded || m.isForwarded) && (
                    <div className="forwarded-tag">
                      <CornerUpRight size={12} />
                      <span>Forwarded</span>
                    </div>
                  )}
                  {isDeleted ? (
                    <div className="message-bubble" style={{ opacity: 0.7 }}>
                      <div className="message-deleted">
                        <Trash2 size={14} />
                        <span>This message was deleted</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {m.text && (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
                          <div className="message-actions-trigger" style={{ flexShrink: 0 }}>
                            {isSent && (
                              <>
                                <button
                                  onClick={() => handleStartEdit(m)}
                                  className="message-action-btn"
                                  title="Edit message"
                                  type="button"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(m)}
                                  className="message-action-btn delete-btn"
                                  title="Delete message"
                                  type="button"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handlePinMessage(m)}
                              className="message-action-btn"
                              title="Pin message"
                              type="button"
                            >
                              <Pin size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenForwardModal(m)}
                              className="message-action-btn"
                              title="Forward message"
                              type="button"
                            >
                              <CornerUpRight size={13} />
                            </button>
                          </div>

                          <div className="message-bubble">{m.text}</div>

                          <button
                            onClick={() => handleLike(m)}
                            title="Like"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "2px 4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                              color: m.liked_by && m.liked_by.includes(user.id) ? "#ef4444" : "rgba(255,255,255,0.3)",
                              fontSize: "0.72rem",
                              flexShrink: 0,
                              transition: "color 0.2s",
                            }}
                          >
                            <Heart size={13} fill={m.liked_by && m.liked_by.includes(user.id) ? "#ef4444" : "none"} />
                            {m.like_count > 0 && <span>{m.like_count}</span>}
                          </button>
                        </div>
                      )}
                      {m.attachment && (
                        isAudioAttachment(m.attachment) ? (
                          <VoiceMessagePlayer
                            src={getAttachmentUrl(m.attachment)}
                            duration={m.audio_duration || m.audioDuration}
                            isSender={isSent}
                          />
                        ) : (
                          <img
                            src={getAttachmentUrl(m.attachment)}
                            className="message-attachment"
                            alt="Shared image"
                            onClick={() => setLightboxImage(getAttachmentUrl(m.attachment))}
                          />
                        )
                      )}
                    </>
                  )}
                  <span className="message-time">
                    {new Date(m.date_time || m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isEdited && <span className="edited-tag">(edited)</span>}
                  </span>
                </div>
              );
            })}
            {typingUser && <div className="typing-indicator">{typingUser}</div>}
            <div ref={messagesEndRef} />
          </div>

          {errorMessage && (
            <div className="error-banner">
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
              <button className="edit-banner-cancel" onClick={() => setErrorMessage(null)}>
                <X size={16} />
              </button>
            </div>
          )}

          {editingMessage && (
            <div className="edit-banner">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Pencil size={15} style={{ color: "var(--accent-purple)" }} />
                <span>Editing message</span>
              </div>
              <button className="edit-banner-cancel" onClick={handleCancelEdit} title="Cancel editing">
                <X size={16} />
              </button>
            </div>
          )}

          <form className="chat-input-container" onSubmit={handleSendMessage}>
            {file && filePreviewUrl && !editingMessage && (
              <div className="attachment-preview">
                <div className="attachment-preview-item">
                  <img src={filePreviewUrl} alt="Attached image preview" />
                  <button
                    type="button"
                    className="attachment-preview-remove"
                    onClick={handleRemoveFile}
                    title="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="chat-input-row">
            {!editingMessage && (
              <label className="file-input-label" title="Attach image">
                <Image size={20} />
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            )}

            <div className="emoji-picker-container" ref={emojiPickerRef}>
              <button
                type="button"
                className="emoji-btn"
                title="Choose emoji"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
              >
                <Smile size={20} />
              </button>

              {showEmojiPicker && (
                <div className="emoji-picker-popover glass">
                  <div className="emoji-search-bar">
                    <Search size={14} />
                    <input
                      type="text"
                      placeholder="Search emoji..."
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                    />
                  </div>

                  {!emojiSearch && (
                    <div className="emoji-categories">
                      {EMOJI_CATEGORIES.map((cat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`emoji-cat-btn ${activeEmojiCat === idx ? "active" : ""}`}
                          onClick={() => setActiveEmojiCat(idx)}
                          title={cat.name}
                        >
                          {cat.icon}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="emoji-grid">
                    {(emojiSearch.trim()
                      ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
                      : EMOJI_CATEGORIES[activeEmojiCat].emojis
                    ).map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        className="emoji-item"
                        onClick={() => setNewMessage((prev) => prev + emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              type="text"
              className="chat-input"
              placeholder={editingMessage ? "Edit message..." : "Message..."}
              value={newMessage}
              onChange={handleTyping}
              maxLength="500"
            />
            {editingMessage ? (
              <button
                type="submit"
                className="send-btn"
                title="Save edit"
                style={{ background: "var(--accent-purple)" }}
              >
                <Check size={18} />
              </button>
            ) : newMessage.trim() || file ? (
              <button
                type="submit"
                className="send-btn"
                title="Send message"
              >
                <Send size={18} />
              </button>
            ) : (
              <button
                type="button"
                className="send-btn"
                onClick={handleSendLike}
                title="Send like"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
              >
                <ThumbsUp size={18} />
              </button>
            )}
            </div>
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
      {lightboxImage && (
        <div
          className="image-lightbox"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className="image-lightbox-close"
            onClick={() => setLightboxImage(null)}
            title="Close"
          >
            <X size={22} />
          </button>
          <img
            src={lightboxImage}
            alt="Full size preview"
            className="image-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {showProfileSettings && (
        <ProfileSettings
          user={user}
          onClose={() => setShowProfileSettings(false)}
          onUserUpdate={(updatedUser) => {
            onUserUpdate(updatedUser);
          }}
        />
      )}

      {/* Forward Modal */}
      {forwardingMessage && (
        <div className="forward-modal-overlay" onClick={() => setForwardingMessage(null)}>
          <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600 }}>Forward Message</h3>
              <button
                type="button"
                onClick={() => setForwardingMessage(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{
              background: "rgba(255,255,255,0.05)",
              padding: "0.75rem",
              borderRadius: "8px",
              fontSize: "0.85rem",
              marginBottom: "1rem",
              color: "var(--text-muted)"
            }}>
              "{forwardingMessage.text || (forwardingMessage.attachment ? "Attachment" : "Audio message")}"
            </div>

            <h4 style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Select Destination Chats
            </h4>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {conversations.map((c) => {
                const cId = c.id;
                const isSelected = selectedForwardTargetIds.includes(cId);
                const name = c.isGroup ? c.groupName : c.other_user?.name || "User";
                return (
                  <label
                    key={cId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "8px",
                      background: isSelected ? "rgba(138,43,226,0.2)" : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      transition: "background 0.2s"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForwardTargetIds((prev) => [...prev, cId]);
                        } else {
                          setSelectedForwardTargetIds((prev) => prev.filter((id) => id !== cId));
                        }
                      }}
                    />
                    <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{name}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn"
                disabled={selectedForwardTargetIds.length === 0}
                onClick={handleExecuteForward}
                style={{ flex: 1 }}
              >
                Forward ({selectedForwardTargetIds.length})
              </button>
              <button
                type="button"
                className="btn"
                style={{ flex: 1, background: "rgba(255,255,255,0.05)" }}
                onClick={() => setForwardingMessage(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
