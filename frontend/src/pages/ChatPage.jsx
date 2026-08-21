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
  FileText,
  Sparkles,
  Paperclip,
  Clock,
  Shield,
  ShieldCheck,
  Download,
  File,
  FileSpreadsheet,
  Presentation,
  AtSign,
  Calendar,
  Bell,
  BellOff,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { BASE_URL, fetchApi } from "../lib/api";
import ProfileSettings from "../components/ProfileSettings";
import SuperAdminDashboard from "../components/SuperAdminDashboard";
import { encryptMessage, decryptMessage, isEncrypted } from "../lib/encryption";

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

const isAudioAttachment = (url, type) => {
  if (type === 'audio') return true;
  if (!url) return false;
  const lower = url.toLowerCase();
  const audioExtensions = [".mp3", ".wav", ".webm", ".ogg", ".m4a", ".aac", ".flac"];
  return audioExtensions.some((ext) => lower.includes(ext)) || lower.includes("voice_message") || lower.includes("/video/upload/");
};

const isImageAttachment = (url, type) => {
  if (type === 'image') return true;
  if (type && type !== 'image') return false;
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/) || lower.includes('/image/upload/');
};

const isDocumentAttachment = (url, type) => {
  if (type === 'document') return true;
  if (!url || type === 'image' || type === 'audio' || type === 'video') return false;
  const lower = url.toLowerCase();
  return lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)(\?|$)/);
};

const getDocumentIcon = (name, url) => {
  const ext = (name || url || '').toLowerCase().split('.').pop();
  if (['xls', 'xlsx'].includes(ext)) return FileSpreadsheet;
  if (['ppt', 'pptx'].includes(ext)) return Presentation;
  if (['pdf'].includes(ext)) return FileText;
  return File;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Feature 2: Quick reaction emojis
const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];


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

  // Feature 2: Emoji Reactions
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState(null);

  // Feature 3: Message Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);

  // Feature 4: @Mention
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionToast, setMentionToast] = useState(null);

  // Feature 5: File/Document type
  const [fileType, setFileType] = useState(null); // 'image' | 'document'
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Feature 7: Message Scheduling
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [showScheduledPanel, setShowScheduledPanel] = useState(false);

  // Feature 7: E2E Encryption
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);

  // Super Admin & Phone Search states
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [phoneSearchLoading, setPhoneSearchLoading] = useState(false);
  const [phoneSearchError, setPhoneSearchError] = useState('');

  // AI Summarize state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

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

    // Feature 2: Emoji Reactions
    socketRef.current.on("message_reacted", (updatedMsg) => {
      setMessages(prev => prev.map(m =>
        isSameId(m, updatedMsg) ? updatedMsg : m
      ));
    });

    // Feature 4: @Mention toast
    socketRef.current.on("you_were_mentioned", (data) => {
      setMentionToast(`${data.senderName} mentioned you in ${data.conversationName || 'a conversation'}`);
      setTimeout(() => setMentionToast(null), 5000);
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

  const handleSearchByPhone = async (e) => {
    if (e) e.preventDefault();
    if (!phoneSearchQuery.trim()) return;
    setPhoneSearchLoading(true);
    setPhoneSearchError('');
    setSearchedUser(null);
    try {
      const result = await fetchApi(`/api/users/search-phone?phone=${encodeURIComponent(phoneSearchQuery.trim())}`);
      setSearchedUser(result);
    } catch (err) {
      setPhoneSearchError(err.message || 'No user found with this phone number');
    } finally {
      setPhoneSearchLoading(false);
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

  // Feature 2: Emoji Reaction handler
  const handleReact = async (msg, emoji) => {
    try {
      const msgId = msg.id || msg._id;
      const updated = await fetchApi(`/api/messages/${msgId}/react`, {
        method: "POST",
        body: { emoji },
      });
      setMessages(prev => prev.map(m => isSameId(m, msgId) ? updated : m));
      socketRef.current.emit("message_reacted", {
        conversationId: activeConversationRef.current?.id,
        updatedMessage: updated,
      });
      setReactionPickerMsgId(null);
    } catch (e) {
      console.error("Failed to react to message", e);
    }
  };

  // Legacy handleLike (still works for backward compat)
  const handleLike = async (msg) => {
    try {
      const msgId = msg.id || msg._id;
      const updated = await fetchApi(`/api/messages/${msgId}/like`, { method: "POST" });
      setMessages(prev => prev.map(m =>
        isSameId(m, msgId) ? { ...m, like_count: updated.like_count, liked_by: updated.liked_by } : m
      ));
      socketRef.current.emit("message_liked", {
        conversationId: activeConversationRef.current?.id,
        updatedMessage: updated
      });
    } catch (e) {
      console.error("Failed to like message", e);
    }
  };

  // Feature 3: Message Search
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim() || !activeConversation) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await fetchApi(`/api/messages/${activeConversation.id}/search?q=${encodeURIComponent(q)}`);
      setSearchResults(results);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setSearchLoading(false);
    }
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "background 0.3s";
      el.style.background = "rgba(167, 139, 250, 0.25)";
      setTimeout(() => { el.style.background = ""; }, 2000);
    }
  };

  // Feature 4: @Mention — detect @ in input
  const handleMentionInput = (value) => {
    if (!activeConversation?.isGroup) return;
    const atIdx = value.lastIndexOf('@');
    if (atIdx !== -1) {
      const query = value.slice(atIdx + 1).toLowerCase();
      const participants = activeConversation.participants || [];
      const matches = participants.filter(p => p.name.toLowerCase().startsWith(query));
      if (matches.length > 0) {
        setMentionSuggestions(matches);
        setMentionQuery(query);
        setShowMentionSuggestions(true);
        return;
      }
    }
    setShowMentionSuggestions(false);
    setMentionSuggestions([]);
  };

  const insertMention = (participant) => {
    const atIdx = newMessage.lastIndexOf('@');
    const before = newMessage.slice(0, atIdx);
    setNewMessage(before + `@${participant.name} `);
    setShowMentionSuggestions(false);
    setMentionSuggestions([]);
  };

  // Feature 5: File select handler
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const mime = selectedFile.type || '';
      if (mime.startsWith('image/')) setFileType('image');
      else setFileType('document');
    }
  };

  // Feature 7: Fetch scheduled messages
  const fetchScheduledMessages = async () => {
    if (!activeConversation) return;
    try {
      const data = await fetchApi(`/api/messages/${activeConversation.id}/scheduled`);
      setScheduledMessages(data);
    } catch (e) {
      console.error("Failed to fetch scheduled messages", e);
    }
  };

  const handleCancelScheduled = async (msgId) => {
    try {
      await fetchApi(`/api/messages/${msgId}/scheduled`, { method: "DELETE" });
      setScheduledMessages(prev => prev.filter(m => (m.id || m._id) !== msgId));
    } catch (e) {
      console.error("Failed to cancel scheduled message", e);
    }
  };

  // Get min datetime for scheduling (at least 1 minute in future)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
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

  const handleSummarize = async () => {
    if (!activeConversation) return;
    setSummaryText("");
    setSummaryError("");
    setSummaryLoading(true);
    setShowSummaryModal(true);
    try {
      const res = await fetchApi(`/api/messages/${activeConversation.id}/summarize`, {
        method: "POST",
      });
      setSummaryText(res.summary);
    } catch (err) {
      setSummaryError(err.message || "Failed to generate summary. Please try again.");
    } finally {
      setSummaryLoading(false);
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


  const handleRemoveFile = () => {
    setFile(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";
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

      // Feature 7: Encrypt message if enabled
      let textToSend = newMessage;
      if (encryptionEnabled && newMessage.trim() && activeConversation) {
        textToSend = await encryptMessage(newMessage, activeConversation.id);
      }

      payload.append("text", textToSend);
      if (activeConversation && !activeConversation.isGroup) {
        payload.append("receiverId", activeConversation.other_user.id);
      }
      if (file) payload.append("attachment", file);

      // Feature 7: Scheduling
      if (showScheduler && scheduledFor) {
        payload.append("scheduledFor", scheduledFor);
      }

      const msg = await fetchApi(`/api/messages/${activeConversation.id}`, {
        method: "POST",
        body: payload,
      });

      if (showScheduler && scheduledFor) {
        // Scheduled message — just update scheduled list
        setScheduledMessages(prev => [...prev, msg]);
        setShowScheduler(false);
        setScheduledFor('');
        setNewMessage('');
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Instant feedback for sender
      setMessages((prev) => [...prev, msg]);

      const notifyUsers = activeConversation.isGroup
        ? (activeConversation.participants || []).map(p => p.id || p._id)
        : [activeConversation.other_user._id || activeConversation.other_user.id];

      socketRef.current.emit("send_message", { msg, notifyUsers });

      // Feature 4: Emit mention notifications
      if (msg.mentions && msg.mentions.length > 0) {
        msg.mentions.forEach(mentionedUserId => {
          socketRef.current.emit("user_mentioned", {
            mentionedUserId,
            conversationId: activeConversation.id,
            senderName: user.name,
            conversationName: activeConversation.isGroup ? activeConversation.groupName : user.name,
          });
        });
      }

      socketRef.current.emit("stop_typing", {
        conversationId: activeConversation.id,
        userId: user.id,
      });
      setNewMessage("");
      setFile(null);
      setFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (docInputRef.current) docInputRef.current.value = "";
      setShowMentionSuggestions(false);
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
    const value = e.target.value;
    setNewMessage(value);
    // Feature 4: @Mention detection
    handleMentionInput(value);
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {(user.role === 'superadmin' || user.role === 'admin') && (
            <button
              className="menu-btn"
              onClick={() => setShowSuperAdmin(true)}
              title="Super Admin Panel"
              style={{ color: "var(--accent-color)" }}
            >
              <Shield size={20} />
            </button>
          )}
          <LogOut size={20} className="logout-icon" onClick={onLogout} />
        </div>
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
          {(user.role === 'superadmin' || user.role === 'admin') && (
            <span
              className="superadmin-badge-pill"
              onClick={() => setShowSuperAdmin(true)}
              title="Open Super Admin Portal"
            >
              ADMIN
            </span>
          )}
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
              {user.phoneNumber ? `📞 ${user.phoneNumber}` : (user.statusMessage || "Online")}
            </span>
          </div>
          {(user.role === 'superadmin' || user.role === 'admin') && (
            <button
              className="close-sidebar-btn super-admin-header-btn"
              onClick={() => setShowSuperAdmin(true)}
              title="Super Admin Panel"
              style={{ color: "var(--accent-color)" }}
            >
              <Shield size={18} />
            </button>
          )}
          <button
            className="close-sidebar-btn profile-settings-btn"
            onClick={() => setShowProfileSettings(true)}
            title="Profile settings"
          >
            <Settings size={18} />
          </button>
          <button
            className="close-sidebar-btn"
            onClick={onLogout}
            title="Log out"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={18} />
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
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{u.name}</span>
                      {u.phoneNumber && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          ({u.phoneNumber})
                        </span>
                      )}
                    </span>
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
            <div style={{ padding: "0.75rem 1rem 0.25rem 1rem" }}>
              <h4
                style={{
                  margin: "0 0 0.5rem 0",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                }}
              >
                Find by Phone Number
              </h4>
              <form onSubmit={handleSearchByPhone} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Phone size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="tel"
                    placeholder="Enter phone number..."
                    value={phoneSearchQuery}
                    onChange={(e) => {
                      setPhoneSearchQuery(e.target.value);
                      setPhoneSearchError('');
                    }}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.5rem 0.45rem 2rem",
                      fontSize: "0.82rem",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--panel-border)",
                      borderRadius: "6px",
                      color: "white"
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn"
                  style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
                  disabled={phoneSearchLoading}
                >
                  {phoneSearchLoading ? "..." : "Find"}
                </button>
              </form>

              {phoneSearchError && (
                <div style={{ fontSize: "0.75rem", color: "#f87171", marginBottom: "0.5rem" }}>
                  {phoneSearchError}
                </div>
              )}

              {searchedUser && (
                <div
                  className="glass"
                  style={{
                    padding: "0.6rem 0.75rem",
                    borderRadius: "8px",
                    marginBottom: "0.75rem",
                    border: "1px solid var(--accent-color)",
                    background: "rgba(20, 184, 166, 0.08)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <img
                        src={searchedUser.avatar ? getAttachmentUrl(searchedUser.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(searchedUser.name)}`}
                        style={{ width: 34, height: 34, borderRadius: "50%" }}
                        alt=""
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{searchedUser.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--accent-color)", display: "flex", alignItems: "center", gap: "3px" }}>
                          <Phone size={10} /> {searchedUser.phoneNumber}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn"
                      style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                      onClick={() => {
                        handleStartChat(searchedUser.id || searchedUser._id);
                        setSearchedUser(null);
                        setPhoneSearchQuery('');
                      }}
                    >
                      Chat
                    </button>
                  </div>
                </div>
              )}
            </div>

            <h4
              style={{
                margin: "0.5rem 1rem 0.5rem 1rem",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                textTransform: "uppercase",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              All Contacts
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
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                      {u.phoneNumber && (
                        <span style={{ fontSize: "0.72rem", color: "var(--accent-color)", display: "flex", alignItems: "center", gap: "2px" }}>
                          <Phone size={10} /> {u.phoneNumber}
                        </span>
                      )}
                    </div>
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
            <button
              title="Summarize Conversation"
              style={{
                marginLeft: "0.4rem",
                background: "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(139,92,246,0.35))",
                border: "1px solid rgba(167,139,250,0.4)",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#c4b5fd",
                transition: "all 0.2s",
              }}
              onClick={handleSummarize}
              type="button"
            >
              <Sparkles size={17} />
            </button>
            {/* Feature 3: Search */}
            <button
              title="Search Messages"
              style={{
                marginLeft: "0.4rem",
                background: showSearch ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.07)",
                border: `1px solid ${showSearch ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: "50%",
                width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                color: showSearch ? "#c4b5fd" : "rgba(255,255,255,0.7)",
              }}
              onClick={() => { setShowSearch(s => !s); setSearchQuery(''); setSearchResults([]); }}
              type="button"
            >
              <Search size={17} />
            </button>
            {/* Feature 7: Encryption Toggle */}
            <button
              title={encryptionEnabled ? "Encryption ON — click to disable" : "Enable E2E Encryption"}
              style={{
                marginLeft: "0.4rem",
                background: encryptionEnabled ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)",
                border: `1px solid ${encryptionEnabled ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: "50%",
                width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                color: encryptionEnabled ? "#4ade80" : "rgba(255,255,255,0.5)",
              }}
              onClick={() => setEncryptionEnabled(e => !e)}
              type="button"
            >
              {encryptionEnabled ? <ShieldCheck size={17} /> : <Shield size={17} />}
            </button>
            {/* Feature 7: Scheduled Messages */}
            <button
              title="Scheduled Messages"
              style={{
                marginLeft: "0.4rem",
                background: showScheduledPanel ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.07)",
                border: `1px solid ${showScheduledPanel ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.12)"}`,
                borderRadius: "50%",
                width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                color: showScheduledPanel ? "#fbbf24" : "rgba(255,255,255,0.5)",
              }}
              onClick={() => { setShowScheduledPanel(s => !s); fetchScheduledMessages(); }}
              type="button"
            >
              <Clock size={17} />
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

          {/* Feature 7: Encryption Banner */}
          {encryptionEnabled && (
            <div style={{ background: "rgba(34,197,94,0.1)", borderBottom: "1px solid rgba(34,197,94,0.2)", padding: "0.4rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem", color: "#4ade80" }}>
              <ShieldCheck size={14} /> End-to-End Encryption is ON for this conversation
            </div>
          )}

          {/* Feature 3: Search Bar */}
          {showSearch && (
            <div style={{ padding: "0.6rem 1rem", borderBottom: "1px solid var(--panel-border)", background: "rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", borderRadius: "8px", padding: "0.4rem 0.75rem", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Search size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: "0.9rem" }}
                  autoFocus
                />
                {searchLoading && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Searching...</span>}
                {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}><X size={14} /></button>}
              </div>
              {searchResults.length > 0 && (
                <div style={{ marginTop: "0.5rem", maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{searchResults.length} result(s)</span>
                  {searchResults.map(r => (
                    <div
                      key={r.id || r._id}
                      onClick={() => { scrollToMessage(r.id || r._id); setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
                      style={{ padding: "0.4rem 0.6rem", background: "rgba(167,139,250,0.1)", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", border: "1px solid rgba(167,139,250,0.2)" }}
                    >
                      <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        {new Date(r.date_time || r.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div style={{ color: "white", marginTop: "2px" }}>{r.text}</div>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && !searchLoading && searchResults.length === 0 && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>No messages found for "{searchQuery}"</div>
              )}
            </div>
          )}

          {/* Feature 7: Scheduled Messages Panel */}
          {showScheduledPanel && (
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--panel-border)", background: "rgba(251,191,36,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Clock size={14} style={{ color: "#fbbf24" }} />
                <span style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: 600 }}>Scheduled Messages ({scheduledMessages.length})</span>
              </div>
              {scheduledMessages.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No scheduled messages</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "150px", overflowY: "auto" }}>
                  {scheduledMessages.map(m => (
                    <div key={m.id || m._id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.4rem 0.6rem" }}>
                      <Calendar size={13} style={{ color: "#fbbf24", flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: "0.82rem" }}>
                        <div style={{ color: "white" }}>{m.text || '[Attachment]'}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Sends at {new Date(m.scheduledFor || m.scheduled_for).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button type="button" onClick={() => handleCancelScheduled(m.id || m._id)} style={{ background: "rgba(239,68,68,0.2)", border: "none", borderRadius: "6px", color: "#f87171", padding: "3px 8px", cursor: "pointer", fontSize: "0.75rem" }}>
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Feature 4: @Mention Toast */}
          {mentionToast && (
            <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 9999, background: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "white", padding: "0.75rem 1rem", borderRadius: "10px", display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: "0.9rem", maxWidth: "320px" }}>
              <AtSign size={16} />
              <span>{mentionToast}</span>
              <button type="button" onClick={() => setMentionToast(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", marginLeft: "auto", padding: 0 }}><X size={14} /></button>
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

                          <div className="message-bubble">
                            {/* Feature 4: Render @mentions highlighted */}
                            {m.text.split(/(@\w+)/g).map((part, idx) =>
                              part.startsWith('@') ? (
                                <span key={idx} style={{ color: "#c4b5fd", fontWeight: 600 }}>{part}</span>
                              ) : (
                                <span key={idx}>{part}</span>
                              )
                            )}
                          </div>

                          {/* Feature 2: Emoji Reaction Picker */}
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <button
                              onClick={() => setReactionPickerMsgId(prev => prev === (m.id || m._id) ? null : (m.id || m._id))}
                              title="React"
                              style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: "2px 4px", fontSize: "0.85rem",
                                color: "rgba(255,255,255,0.3)",
                                transition: "color 0.2s",
                              }}
                            >
                              {m.reactions && m.reactions.find(r => r.userId === user.id || (r.userId && r.userId.toString() === user.id))
                                ? m.reactions.find(r => r.userId === user.id || (r.userId && r.userId.toString() === user.id)).emoji
                                : '😊'}
                            </button>
                            {reactionPickerMsgId === (m.id || m._id) && (
                              <div style={{
                                position: "absolute", bottom: "100%", right: isSent ? 0 : "auto", left: isSent ? "auto" : 0,
                                background: "var(--panel-bg, #1e1b4b)", border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "20px", padding: "4px 8px", display: "flex", gap: "4px",
                                zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                              }}>
                                {QUICK_REACTIONS.map(emoji => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => handleReact(m, emoji)}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "2px", borderRadius: "50%", transition: "transform 0.1s" }}
                                    onMouseEnter={e => e.target.style.transform = "scale(1.3)"}
                                    onMouseLeave={e => e.target.style.transform = "scale(1)"}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Feature 2: Show reaction counts */}
                      {m.reactions && m.reactions.length > 0 && (() => {
                        const reactionMap = {};
                        m.reactions.forEach(r => {
                          reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1;
                        });
                        return (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                            {Object.entries(reactionMap).map(([emoji, count]) => (
                              <span
                                key={emoji}
                                onClick={() => handleReact(m, emoji)}
                                style={{
                                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                                  borderRadius: "10px", padding: "1px 6px", fontSize: "0.78rem",
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: "3px",
                                }}
                              >
                                {emoji} <span style={{ color: "var(--text-muted)" }}>{count}</span>
                              </span>
                            ))}
                          </div>
                        );
                      })()}

                      {m.attachment && (
                        isAudioAttachment(m.attachment, m.attachment_type || m.attachmentType) ? (
                          <VoiceMessagePlayer
                            src={getAttachmentUrl(m.attachment)}
                            duration={m.audio_duration || m.audioDuration}
                            isSender={isSent}
                          />
                        ) : isDocumentAttachment(m.attachment, m.attachment_type || m.attachmentType) ? (
                          // Feature 1: Document attachment
                          <div style={{
                            display: "flex", alignItems: "center", gap: "0.75rem",
                            background: "rgba(255,255,255,0.07)", borderRadius: "10px",
                            padding: "0.6rem 0.9rem", marginTop: m.text ? "0.4rem" : 0,
                            border: "1px solid rgba(255,255,255,0.12)", maxWidth: "260px",
                          }}>
                            {(() => { const DocIcon = getDocumentIcon(m.attachment_name || m.attachmentName, m.attachment); return <DocIcon size={28} style={{ color: "#a78bfa", flexShrink: 0 }} />; })()}
                            <div style={{ flex: 1, overflow: "hidden" }}>
                              <div style={{ fontSize: "0.85rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {m.attachment_name || m.attachmentName || "Document"}
                              </div>
                              {(m.attachment_size || m.attachmentSize) && (
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                  {formatFileSize(m.attachment_size || m.attachmentSize)}
                                </div>
                              )}
                            </div>
                            <a href={getAttachmentUrl(m.attachment)} target="_blank" rel="noopener noreferrer" download
                              style={{ color: "#a78bfa", display: "flex", alignItems: "center", flexShrink: 0 }}
                              title="Download"
                            >
                              <Download size={16} />
                            </a>
                          </div>
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
            {file && filePreviewUrl && !editingMessage && fileType === 'image' && (
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

            {/* Feature 1: Document preview */}
            {file && fileType === 'document' && !editingMessage && (
              <div style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(167,139,250,0.1)", borderTop: "1px solid rgba(167,139,250,0.2)" }}>
                <FileText size={16} style={{ color: "#a78bfa" }} />
                <span style={{ fontSize: "0.85rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatFileSize(file.size)}</span>
                <button type="button" onClick={handleRemoveFile} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}><X size={14} /></button>
              </div>
            )}

            {/* Feature 7: Scheduler datetime picker */}
            {showScheduler && (
              <div style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(251,191,36,0.1)", borderTop: "1px solid rgba(251,191,36,0.2)" }}>
                <Calendar size={15} style={{ color: "#fbbf24", flexShrink: 0 }} />
                <span style={{ fontSize: "0.82rem", color: "#fbbf24", flexShrink: 0 }}>Schedule for:</span>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)}
                  min={getMinDateTime()}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: "6px", color: "white", padding: "3px 8px", fontSize: "0.82rem", flex: 1 }}
                />
                <button type="button" onClick={() => { setShowScheduler(false); setScheduledFor(''); }} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}><X size={14} /></button>
              </div>
            )}

            {/* Feature 4: @Mention autocomplete */}
            {showMentionSuggestions && mentionSuggestions.length > 0 && (
              <div style={{ padding: "0.3rem 0.5rem", background: "rgba(30,27,75,0.98)", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {mentionSuggestions.map(p => (
                  <button
                    key={p.id || p._id}
                    type="button"
                    onClick={() => insertMention(p)}
                    style={{
                      background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)",
                      borderRadius: "16px", padding: "3px 10px", color: "#c4b5fd",
                      cursor: "pointer", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem",
                    }}
                  >
                    <AtSign size={12} /> {p.name}
                  </button>
                ))}
              </div>
            )}

            <div className="chat-input-row">
            {!editingMessage && (
              <>
                {/* Feature 1: Image attach */}
                <label className="file-input-label" title="Attach image">
                  <Image size={20} />
                  <input
                    ref={imageInputRef}
                    type="file"
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
                {/* Feature 1: Document attach */}
                <label className="file-input-label" title="Attach document (PDF, Word, Excel…)" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <Paperclip size={20} />
                  <input
                    ref={docInputRef}
                    type="file"
                    style={{ display: "none" }}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    onChange={handleFileSelect}
                  />
                </label>
              </>
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
              <>
                <button
                  type="submit"
                  className="send-btn"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
                {/* Feature 7: Schedule button */}
                <button
                  type="button"
                  title="Schedule message"
                  onClick={() => setShowScheduler(s => !s)}
                  style={{
                    background: showScheduler ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${showScheduler ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "50%",
                    width: 36, height: 36,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    color: showScheduler ? "#fbbf24" : "rgba(255,255,255,0.4)",
                    marginLeft: "4px",
                  }}
                >
                  <Calendar size={16} />
                </button>
              </>
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

      {showSuperAdmin && (
        <SuperAdminDashboard
          currentUser={user}
          onClose={() => setShowSuperAdmin(false)}
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

      {/* AI Summary Modal */}
      {showSummaryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #1a1040 50%, #0f0a2e 100%)",
              border: "1px solid rgba(167,139,250,0.3)",
              borderRadius: "20px",
              padding: "2rem",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(167,139,250,0.1)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "12px",
                background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <Sparkles size={20} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "white", fontWeight: 700 }}>
                  AI Conversation Summary
                </h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#a78bfa" }}>
                  Powered by Gemini AI
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                style={{
                  marginLeft: "auto", background: "rgba(255,255,255,0.08)",
                  border: "none", borderRadius: "50%", width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "white", flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(167,139,250,0.15)",
              borderRadius: "12px",
              padding: "1.25rem",
              minHeight: "100px",
            }}>
              {summaryLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "1rem 0" }}>
                  <div style={{
                    width: 40, height: 40, border: "3px solid rgba(167,139,250,0.2)",
                    borderTopColor: "#a78bfa", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <p style={{ color: "#a78bfa", margin: 0, fontSize: "0.9rem" }}>
                    Generating summary...
                  </p>
                </div>
              ) : summaryError ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171" }}>
                  <AlertCircle size={18} />
                  <span style={{ fontSize: "0.9rem" }}>{summaryError}</span>
                </div>
              ) : (
                <p style={{
                  margin: 0, color: "rgba(255,255,255,0.9)",
                  lineHeight: 1.75, fontSize: "0.95rem",
                }}>
                  {summaryText}
                </p>
              )}
            </div>

            {/* Footer */}
            {!summaryLoading && (
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                {summaryError && (
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 1 }}
                    onClick={handleSummarize}
                  >
                    Try Again
                  </button>
                )}
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, background: "rgba(255,255,255,0.06)" }}
                  onClick={() => setShowSummaryModal(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
