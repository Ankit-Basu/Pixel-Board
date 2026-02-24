import express from "express";
import {
  register,
  login,
  getMe,
  firebaseSync,
  updateProfile,
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import firebaseAuth from "../middleware/firebaseAuth.js";

const router = express.Router();

// Legacy JWT auth routes
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

// Update user profile (name or avatar)
router.put("/profile", protect, updateProfile);

// Firebase auth route — syncs Firebase user into MongoDB
router.post("/firebase-sync", firebaseAuth, firebaseSync);

export default router;
