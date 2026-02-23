import Message from "../models/Message.js";

// GET /api/chat/:roomId
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 })
      .limit(200);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
