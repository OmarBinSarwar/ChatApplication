const socketIo = require("socket.io");

const userSockets = new Map(); // Map user.id to socket.id

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User registers their socket ID on login/connect
    socket.on("register", (userId) => {
      userSockets.set(userId, socket.id);
      io.emit("user_online", userId);
    });

    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    socket.on("send_message", (message) => {
      // Broadcast to everyone in the conversation
      io.to(`conversation_${message.conversation_id}`).emit(
        "new_message",
        message,
      );
    });

    socket.on("typing", (data) => {
      // data: { conversationId, userId }
      socket
        .to(`conversation_${data.conversationId}`)
        .emit("user_typing", data.userId);
    });

    socket.on("stop_typing", (data) => {
      socket
        .to(`conversation_${data.conversationId}`)
        .emit("user_stop_typing", data.userId);
    });

    socket.on("disconnect", () => {
      // Find and remove user from map
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          io.emit("user_offline", userId);
          break;
        }
      }
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
