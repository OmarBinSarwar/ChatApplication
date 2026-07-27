const socketIo = require("socket.io");
const User = require("../models/User");

const userSockets = new Map(); // Map user.id to socket.id
const callRooms = new Map(); // Map roomId to Map of participants

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
    socket.on("register", async (userId) => {
      if (!userId) return;
      const strUserId = userId.toString();
      userSockets.set(strUserId, socket.id);

      try {
        await User.findByIdAndUpdate(strUserId, { isOnline: true });
      } catch (err) {
        console.error("Error updating user online status:", err);
      }

      // Send currently online user IDs to newly connected client
      socket.emit("get_online_users", Array.from(userSockets.keys()));

      // Broadcast online status to all connected users
      io.emit("user_online", strUserId);
    });

    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    socket.on("join_room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
    });

    socket.on("send_message", (data) => {
      const message = data.msg || data;
      const notifyUsers = data.notifyUsers || [];

      let emitter = io.to(`conversation_${message.conversation_id}`);

      if (message.receiver_id) {
        const receiverSocketId = userSockets.get(message.receiver_id.toString());
        if (receiverSocketId) emitter = emitter.to(receiverSocketId);
      }

      for (const uId of notifyUsers) {
        const sId = userSockets.get(uId.toString());
        if (sId) emitter = emitter.to(sId);
      }

      emitter.emit("new_message", message);
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

    socket.on("message_liked", (data) => {
      // data: { conversationId, updatedMessage }
      io.to(`conversation_${data.conversationId}`).emit("message_liked", data.updatedMessage);
    });

    socket.on("message_edited", (data) => {
      // data: { conversationId, updatedMessage }
      io.to(`conversation_${data.conversationId}`).emit("message_edited", data.updatedMessage);
    });

    socket.on("message_deleted", (data) => {
      // data: { conversationId, updatedMessage }
      io.to(`conversation_${data.conversationId}`).emit("message_deleted", data.updatedMessage);
    });

    socket.on("call_user", (data) => {
      const { toUserId, fromUserId, offer } = data;
      const recipientSocketId = userSockets.get(toUserId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("incoming_call", {
          from: fromUserId,
          offer,
        });
      }
    });

    socket.on("answer_call", (data) => {
      const { toUserId, answer } = data;
      const callerSocketId = userSockets.get(toUserId);

      if (callerSocketId) {
        io.to(callerSocketId).emit("call_answered", {
          answer,
        });
      }
    });

    socket.on("reject_call", (data) => {
      const { toUserId } = data;
      const callerSocketId = userSockets.get(toUserId);

      if (callerSocketId) {
        io.to(callerSocketId).emit("call_rejected");
      }
    });

    socket.on("send_ice_candidate", (data) => {
      const { toUserId, candidate } = data;
      const recipientSocketId = userSockets.get(toUserId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call_ice_candidate", {
          candidate,
        });
      }
    });

    socket.on("end_call", (data) => {
      const { toUserId } = data;
      const recipientSocketId = userSockets.get(toUserId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call_ended");
      }
    });

    // Room-based WebRTC signaling for group calls
    socket.on("join_call_room", (data) => {
      const { roomId, userId, name } = data;
      socket.join(`call_${roomId}`);
      
      if (!callRooms.has(roomId)) {
        callRooms.set(roomId, new Map());
      }
      
      const roomParticipants = callRooms.get(roomId);
      const existingParticipants = Array.from(roomParticipants.values());
      
      roomParticipants.set(socket.id, {
        socketId: socket.id,
        userId,
        name,
        isScreenSharing: false
      });
      
      console.log(`User ${name} (${userId}) joined call room ${roomId}`);
      
      socket.to(`call_${roomId}`).emit("user_joined_call", {
        socketId: socket.id,
        userId,
        name
      });
      
      socket.emit("current_call_participants", existingParticipants);
    });
    
    socket.on("send_call_signal", (data) => {
      const { targetSocketId, signalData, isScreenSharing } = data;
      io.to(targetSocketId).emit("receive_call_signal", {
        fromSocketId: socket.id,
        signalData,
        isScreenSharing
      });
    });
    
    socket.on("send_call_ice_candidate", (data) => {
      const { targetSocketId, candidate } = data;
      io.to(targetSocketId).emit("receive_call_ice_candidate", {
        fromSocketId: socket.id,
        candidate
      });
    });
    
    socket.on("leave_call_room", (roomId) => {
      socket.leave(`call_${roomId}`);
      
      const roomParticipants = callRooms.get(roomId);
      if (roomParticipants) {
        const participantInfo = roomParticipants.get(socket.id);
        if (participantInfo) {
          roomParticipants.delete(socket.id);
          socket.to(`call_${roomId}`).emit("user_left_call", {
            socketId: socket.id,
            userId: participantInfo.userId
          });
        }
        
        if (roomParticipants.size === 0) {
          callRooms.delete(roomId);
        }
      }
      console.log(`User left call room ${roomId}`);
    });
    
    socket.on("toggle_screenshare_signal", (data) => {
      const { roomId, isSharing } = data;
      const roomParticipants = callRooms.get(roomId);
      if (roomParticipants && roomParticipants.has(socket.id)) {
        roomParticipants.get(socket.id).isScreenSharing = isSharing;
        socket.to(`call_${roomId}`).emit("user_toggled_screenshare", {
          socketId: socket.id,
          isSharing
        });
      }
    });

    socket.on("start_group_call", (data) => {
      // data: { conversationId, callerName, callerId }
      socket.to(`conversation_${data.conversationId}`).emit("group_call_incoming", data);
    });

    socket.on("end_group_call", (data) => {
      // data: { conversationId }
      socket.to(`conversation_${data.conversationId}`).emit("group_call_ended", data);
    });

    socket.on("disconnect", () => {
      // Clean up call rooms
      for (const [roomId, roomParticipants] of callRooms.entries()) {
        if (roomParticipants.has(socket.id)) {
          const participantInfo = roomParticipants.get(socket.id);
          roomParticipants.delete(socket.id);
          socket.to(`call_${roomId}`).emit("user_left_call", {
            socketId: socket.id,
            userId: participantInfo.userId
          });
          
          if (roomParticipants.size === 0) {
            callRooms.delete(roomId);
          }
        }
      }

      // Find and remove user from map
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          const lastSeen = new Date();
          User.findByIdAndUpdate(userId, { isOnline: false, lastSeen }).catch(err =>
            console.error("Error updating lastSeen on disconnect:", err)
          );
          io.emit("user_offline", { userId, lastSeen });
          break;
        }
      }
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = setupSocket;
