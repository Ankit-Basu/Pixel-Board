import express from "express";
import { getMessages } from "../controllers/chatController.js";
import firebaseAuth from "../middleware/firebaseAuth.js";

const router = express.Router();

router.get("/:roomId", firebaseAuth, getMessages);

export default router;
