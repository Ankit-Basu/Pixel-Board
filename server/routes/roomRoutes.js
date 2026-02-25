import express from "express";
import {
  createRoom,
  joinRoom,
  getRoomDetails,
  getUserRooms,
  saveCanvasData,
  deleteRoom,
} from "../controllers/roomController.js";
import firebaseAuth from "../middleware/firebaseAuth.js";

const router = express.Router();

router.post("/create", firebaseAuth, createRoom);
router.post("/join", firebaseAuth, joinRoom);
router.get("/", firebaseAuth, getUserRooms);
router.get("/:roomId", firebaseAuth, getRoomDetails);
router.put("/:roomId/canvas", firebaseAuth, saveCanvasData);
router.delete("/:roomId", firebaseAuth, deleteRoom);

export default router;
