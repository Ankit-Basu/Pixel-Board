import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    firebaseUid: {
      type: String,
      default: "",
    },
    authProvider: {
      type: String,
      default: "email",
      enum: [
        "email",
        "google.com",
        "github.com",
        "firebase-managed",
        "unknown",
      ],
    },
  },
  { timestamps: true },
);

// Hash password before saving (only for email/password signups)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // Don't hash firebase-managed passwords
  if (this.password.startsWith("firebase-managed-")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password method (for legacy JWT auth)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
