import Room from "../models/Room.js";

// POST /api/rooms/create
export const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    const room = await Room.create({
      name: name || "Untitled Whiteboard",
      host: req.user._id,
      participants: [req.user._id],
    });

    const populated = await Room.findById(room._id)
      .populate("host", "name email")
      .populate("participants", "name email");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/rooms/join
export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (!room.participants.includes(req.user._id)) {
      room.participants.push(req.user._id);
      await room.save();
    }

    const populated = await Room.findById(room._id)
      .populate("host", "name email")
      .populate("participants", "name email");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/rooms/:roomId
export const getRoomDetails = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate("host", "name email")
      .populate("participants", "name email");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/rooms  (user's rooms)
export const getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [{ host: req.user._id }, { participants: req.user._id }],
    })
      .populate("host", "name email")
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/rooms/:roomId/canvas
export const saveCanvasData = async (req, res) => {
  try {
    const { canvasData } = req.body;
    const room = await Room.findOneAndUpdate(
      { roomId: req.params.roomId },
      { canvasData },
      { new: true },
    );

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({ message: "Canvas saved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
