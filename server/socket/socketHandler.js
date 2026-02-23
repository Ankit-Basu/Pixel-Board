import Message from "../models/Message.js";

const onlineUsers = new Map(); // roomId -> Set of {userId, userName, socketId}

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a whiteboard room
    socket.on("join-room", ({ roomId, userId, userName }) => {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.userName = userName;

      if (!onlineUsers.has(roomId)) {
        onlineUsers.set(roomId, new Map());
      }
      onlineUsers
        .get(roomId)
        .set(userId, { userId, userName, socketId: socket.id });

      // Broadcast updated user list
      const users = Array.from(onlineUsers.get(roomId).values());
      io.to(roomId).emit("user-presence", users);

      // Notify others
      socket.to(roomId).emit("user-joined", { userId, userName });
      console.log(`${userName} joined room ${roomId}`);
    });

    // Real-time drawing sync
    socket.on("draw", (data) => {
      // data: { roomId, line: { startX, startY, endX, endY, color, brushSize } }
      socket.to(data.roomId).emit("draw", data);
    });

    // Drawing action sync (for undo/redo consistency)
    socket.on("draw-action-start", (data) => {
      socket.to(data.roomId).emit("draw-action-start", data);
    });

    socket.on("draw-action-end", (data) => {
      socket.to(data.roomId).emit("draw-action-end", data);
    });

    // Remote cursor sync
    socket.on("cursor-move", (data) => {
      socket.to(data.roomId).emit("cursor-move", data);
    });

    socket.on("cursor-leave", (data) => {
      socket.to(data.roomId).emit("cursor-leave", data);
    });

    // Undo event
    socket.on("undo", (data) => {
      socket.to(data.roomId).emit("undo", data);
    });

    // Clear canvas
    socket.on("clear-canvas", (data) => {
      socket.to(data.roomId).emit("clear-canvas", data);
    });

    // Chat messages
    socket.on("chat-message", async (data) => {
      // data: { roomId, userId, userName, content, type }
      try {
        const message = await Message.create({
          roomId: data.roomId,
          sender: data.userId,
          senderName: data.userName,
          content: data.content,
          type: data.type || "text",
          fileUrl: data.fileUrl || "",
        });

        io.to(data.roomId).emit("chat-message", {
          _id: message._id,
          roomId: data.roomId,
          sender: { _id: data.userId, name: data.userName },
          senderName: data.userName,
          content: data.content,
          type: data.type || "text",
          fileUrl: data.fileUrl || "",
          createdAt: message.createdAt,
        });
      } catch (error) {
        console.error("Chat message error:", error);
      }
    });

    // WebRTC signaling for screen sharing
    socket.on("screen-share-offer", (data) => {
      socket.to(data.roomId).emit("screen-share-offer", {
        offer: data.offer,
        from: socket.id,
        userName: socket.userName,
      });
    });

    socket.on("screen-share-answer", (data) => {
      io.to(data.to).emit("screen-share-answer", {
        answer: data.answer,
        from: socket.id,
      });
    });

    socket.on("ice-candidate", (data) => {
      socket.to(data.roomId).emit("ice-candidate", {
        candidate: data.candidate,
        from: socket.id,
      });
    });

    socket.on("screen-share-stop", (data) => {
      socket.to(data.roomId).emit("screen-share-stop", {
        from: socket.id,
        userName: socket.userName,
      });
    });

    // File sharing event
    socket.on("file-share", (data) => {
      io.to(data.roomId).emit("file-share", {
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        from: socket.userName,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      const { roomId, userId, userName } = socket;
      if (roomId && onlineUsers.has(roomId)) {
        onlineUsers.get(roomId).delete(userId);
        const users = Array.from(onlineUsers.get(roomId).values());
        io.to(roomId).emit("user-presence", users);
        socket.to(roomId).emit("user-left", { userId, userName });

        if (onlineUsers.get(roomId).size === 0) {
          onlineUsers.delete(roomId);
        }
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

export default setupSocket;
