import Message from "../models/Message.js";

const onlineUsers = new Map(); // roomId -> Set of {userId, userName, socketId}
const tttQueue = []; // TTT matchmaking queue

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

    // Broadcast solve results to all users in the room
    socket.on("solve-result", (data) => {
      socket.to(data.roomId).emit("solve-result", data);
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

    // ========== Tic-Tac-Toe Matchmaking ==========
    socket.on("ttt-join", ({ userId, userName }) => {
      socket.tttUserId = userId;
      socket.tttUserName = userName;

      // Clean up disconnected sockets from queue
      for (let i = tttQueue.length - 1; i >= 0; i--) {
        if (!tttQueue[i].connected) tttQueue.splice(i, 1);
      }

      // Remove self if already in queue
      const selfIdx = tttQueue.findIndex((s) => s.id === socket.id);
      if (selfIdx > -1) tttQueue.splice(selfIdx, 1);

      // Check if someone is already waiting
      const waitingPlayer = tttQueue.find(
        (s) => s.id !== socket.id && s.connected,
      );
      if (waitingPlayer) {
        tttQueue.splice(tttQueue.indexOf(waitingPlayer), 1);
        const gameRoomId = `ttt-${Date.now()}`;
        waitingPlayer.join(gameRoomId);
        socket.join(gameRoomId);
        waitingPlayer.tttGameRoom = gameRoomId;
        socket.tttGameRoom = gameRoomId;

        console.log(
          `TTT Match: ${waitingPlayer.tttUserName} (X) vs ${userName} (O) in ${gameRoomId}`,
        );

        waitingPlayer.emit("ttt-matched", {
          roomId: gameRoomId,
          symbol: "X",
          opponentName: userName,
        });
        socket.emit("ttt-matched", {
          roomId: gameRoomId,
          symbol: "O",
          opponentName: waitingPlayer.tttUserName,
        });
      } else {
        tttQueue.push(socket);
        console.log(
          `TTT Queue: ${userName} waiting (queue size: ${tttQueue.length})`,
        );
      }
    });

    socket.on("ttt-move", (data) => {
      socket.to(data.roomId).emit("ttt-move", data);
    });

    socket.on("ttt-leave", (data) => {
      if (data && data.roomId) {
        socket.to(data.roomId).emit("ttt-opponent-left");
        socket.leave(data.roomId);
      }
      const idx = tttQueue.indexOf(socket);
      if (idx > -1) tttQueue.splice(idx, 1);
    });

    // ========== Video Call Signaling ==========
    socket.on("video-call-user", (data) => {
      // data: { userToCall, signalData, from, callerName }
      io.to(data.userToCall).emit("video-call-incoming", {
        signal: data.signalData,
        from: data.from,
        callerName: data.callerName,
      });
    });

    socket.on("video-call-accept", (data) => {
      // data: { signal, to }
      io.to(data.to).emit("video-call-accepted", {
        signal: data.signal,
      });
    });

    socket.on("video-call-end", (data) => {
      // data: { to }
      if (data.to) {
        io.to(data.to).emit("video-call-ended");
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      const roomId = socket.roomId;
      const userId = socket.userId;
      const userName = socket.userName;

      // Clean up TTT
      const tttIdx = tttQueue.indexOf(socket);
      if (tttIdx > -1) tttQueue.splice(tttIdx, 1);
      if (socket.tttGameRoom) {
        socket.to(socket.tttGameRoom).emit("ttt-opponent-left");
      }

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
