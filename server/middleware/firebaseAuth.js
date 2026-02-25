import admin from "../config/firebaseAdmin.js";
import User from "../models/User.js";

const firebaseAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    // Verify the Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);

    // Find existing user or create new one in MongoDB
    let user = await User.findOne({ email: decoded.email });

    if (!user) {
      user = await User.create({
        name: decoded.name || decoded.email.split("@")[0],
        email: decoded.email,
        password: "firebase-managed-" + Date.now(),
        avatar: decoded.picture || "",
        firebaseUid: decoded.uid,
        authProvider: decoded.firebase?.sign_in_provider || "unknown",
      });
      req.isNewUser = true;
    } else {
      // Update avatar / name if they changed on the provider side
      let needsUpdate = false;
      if (decoded.picture && decoded.picture !== user.avatar) {
        user.avatar = decoded.picture;
        needsUpdate = true;
      }
      if (decoded.name && decoded.name !== user.name) {
        user.name = decoded.name;
        needsUpdate = true;
      }
      if (!user.firebaseUid) {
        user.firebaseUid = decoded.uid;
        needsUpdate = true;
      }
      if (needsUpdate) await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Firebase auth error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default firebaseAuth;
