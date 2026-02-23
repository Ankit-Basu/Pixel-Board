# CollabBoard — MongoDB & Firebase Setup Guide

Complete step-by-step instructions to set up **MongoDB Atlas** (cloud database) and **Firebase Authentication** (Email/Password + Google/Gmail sign-in) for the CollabBoard whiteboard project.

---

## Part 1: MongoDB Atlas Setup

### Step 1 — Create a MongoDB Atlas Account

1. Go to **[https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)**
2. Click **"Try Free"** → Sign up with Google or Email
3. Choose the **M0 Free Tier** (free forever, 512 MB)
4. Select provider: **AWS**, Region: **Mumbai (ap-south-1)** (or closest to you)
5. Click **"Create Deployment"**

### Step 2 — Create a Database User

1. In the Atlas dashboard, go to **Security → Database Access**
2. Click **"Add New Database User"**
3. Choose **Password** authentication
4. Set:
   - **Username:** `collabboard_admin`
   - **Password:** (generate or set your own — **copy this, you'll need it**)
5. Under **Database User Privileges**, select **"Read and write to any database"**
6. Click **"Add User"**

### Step 3 — Whitelist Your IP Address

1. Go to **Security → Network Access**
2. Click **"Add IP Address"**
3. Choose one of:
   - **"Add Current IP Address"** — for local development only
   - **"Allow Access from Anywhere"** (`0.0.0.0/0`) — for development convenience
     > ⚠️ Not recommended for production. Use specific IPs in production.
4. Click **"Confirm"**

### Step 4 — Get Your Connection String

1. Go to **Deployment → Database**
2. Click **"Connect"** on your cluster
3. Choose **"Drivers"** (Node.js)
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://collabboard_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with the password you created in Step 2
6. **Add the database name** before the `?`:
   ```
   mongodb+srv://collabboard_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/whiteboard?retryWrites=true&w=majority
   ```

### Step 5 — Update Your `.env` File

Open `server/.env` and update the `MONGO_URI`:

```env
PORT=5000
MONGO_URI=mongodb+srv://collabboard_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/whiteboard?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_change_this
CLIENT_URL=http://localhost:5173
```

> [!TIP]
> For local MongoDB instead of Atlas, use: `MONGO_URI=mongodb://127.0.0.1:27017/whiteboard`
> This requires MongoDB Community Server installed locally.

### Step 6 — Verify MongoDB Connection

```bash
cd server
node server.js
```

You should see:

```
MongoDB connected: cluster0-shard-00-00.xxxxx.mongodb.net
Server running on port 5000
```

---

## Part 2: Firebase Project Setup

### Step 1 — Create a Firebase Project

1. Go to **[https://console.firebase.google.com/](https://console.firebase.google.com/)**
2. Click **"Create a project"** (or "Add project")
3. Enter project name: **`collabboard`**
4. **Disable** Google Analytics (optional, not needed for auth)
5. Click **"Create Project"** → Wait for it to spin up → Click **"Continue"**

### Step 2 — Register a Web App

1. On the Firebase project dashboard, click the **Web icon** (`</>`) to add a web app
2. App nickname: **`collabboard-web`**
3. ❌ Do NOT check "Firebase Hosting" (we don't need it)
4. Click **"Register App"**
5. You'll see the Firebase config object. **Copy it** — it looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "collabboard.firebaseapp.com",
  projectId: "collabboard",
  storageBucket: "collabboard.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};
```

6. Click **"Continue to Console"**

---

## Part 3: Enable Firebase Authentication Providers

### Step 1 — Enable Email/Password Provider

1. In Firebase Console, go to **Build → Authentication**
2. Click **"Get Started"**
3. Go to the **"Sign-in method"** tab
4. Click **"Email/Password"**
5. Toggle **"Enable"** → ON
6. (Optional) Toggle **"Email link (passwordless sign-in)"** → ON if you want magic link login
7. Click **"Save"**

### Step 2 — Enable Google (Gmail) Provider

1. Still in **Authentication → Sign-in method**
2. Click **"Add new provider"** → Select **"Google"**
3. Toggle **"Enable"** → ON
4. Set **Project support email**: select your Gmail address from the dropdown
5. Click **"Save"**

> [!NOTE]
> The Google provider automatically handles Gmail sign-in. No separate OAuth client setup is needed — Firebase manages it.

### Step 3 — (Optional) Enable GitHub Provider

1. Click **"Add new provider"** → Select **"GitHub"**
2. Toggle **"Enable"** → ON
3. You need a **GitHub OAuth App**:
   - Go to [https://github.com/settings/developers](https://github.com/settings/developers)
   - Click **"New OAuth App"**
   - **Application name:** `CollabBoard`
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** Copy this from the Firebase console (looks like `https://collabboard.firebaseapp.com/__/auth/handler`)
   - Click **"Register application"**
   - Copy the **Client ID** and generate a **Client Secret**
4. Paste the Client ID and Client Secret into Firebase
5. Click **"Save"**

---

## Part 4: Install Firebase in Frontend

### Step 1 — Install the Firebase SDK

```bash
cd client
npm install firebase
```

### Step 2 — Create Firebase Config File

Create `client/src/config/firebase.js`:

```javascript
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
```

> [!IMPORTANT]
> Replace all `PASTE_YOUR_...` values with the actual config from Firebase Console → Project Settings → General → Your apps → Web app.

### Step 3 — Authorized Domains

1. In Firebase Console → **Authentication → Settings**
2. Go to **"Authorized domains"**
3. Ensure `localhost` is listed (it should be by default)
4. For production, add your deployed domain here

---

## Part 5: Connect Firebase Auth with Backend

### How It Works

```
┌─────────┐   Firebase Auth    ┌──────────┐   JWT Token    ┌──────────┐
│  React   │ ────────────────→ │ Firebase │ ─────────────→ │ Express  │
│  Client  │ ← ID Token ───── │  Server  │                │ Backend  │
└─────────┘                    └──────────┘                └──────────┘
```

**Flow:**

1. User signs in via Firebase (Email/Password or Google popup)
2. Firebase returns an **ID Token** (JWT)
3. Frontend sends this token to your Express backend
4. Backend **verifies** the token using Firebase Admin SDK
5. Backend creates/finds the user in MongoDB and returns a session JWT

### Step 1 — Install Firebase Admin SDK on Server

```bash
cd server
npm install firebase-admin
```

### Step 2 — Generate Service Account Key

1. Go to Firebase Console → **⚙️ Project Settings → Service Accounts**
2. Click **"Generate new private key"**
3. Save the downloaded JSON file as `server/config/serviceAccountKey.json`

> [!CAUTION]
> **Never commit this file to Git!** Add it to `.gitignore`:
>
> ```
> # server/.gitignore
> serviceAccountKey.json
> ```

### Step 3 — Initialize Firebase Admin on Server

Create `server/config/firebaseAdmin.js`:

```javascript
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "serviceAccountKey.json"), "utf-8"),
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
```

### Step 4 — Create Firebase Auth Middleware

Create `server/middleware/firebaseAuth.js`:

```javascript
import admin from "../config/firebaseAdmin.js";
import User from "../models/User.js";

const firebaseAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify the Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);

    // Find or create user in MongoDB
    let user = await User.findOne({ email: decoded.email });

    if (!user) {
      user = await User.create({
        name: decoded.name || decoded.email.split("@")[0],
        email: decoded.email,
        password: "firebase-auth-" + Date.now(), // placeholder
        avatar: decoded.picture || "",
        firebaseUid: decoded.uid,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid Firebase token" });
  }
};

export default firebaseAuth;
```

---

## Part 6: Quick Reference — All Required Credentials

| Credential                     | Where to Get                                         | Where to Put                           |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------- |
| MongoDB Atlas URI              | Atlas → Connect → Drivers                            | `server/.env` → `MONGO_URI`            |
| JWT Secret                     | Generate any random string                           | `server/.env` → `JWT_SECRET`           |
| Firebase Config (apiKey, etc.) | Firebase Console → Project Settings                  | `client/src/config/firebase.js`        |
| Firebase Service Account Key   | Firebase → Project Settings → Service Accounts       | `server/config/serviceAccountKey.json` |
| Groq API Key                   | [https://console.groq.com](https://console.groq.com) | `ai-server/.env` → `GROQ_API_KEY`      |

---

## Part 7: `.gitignore` Checklist

Make sure these are in your `.gitignore` before pushing to GitHub:

```gitignore
# Dependencies
node_modules/
venv/

# Environment variables
.env
*.env

# Firebase credentials
serviceAccountKey.json

# Build output
dist/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

---

## Troubleshooting

| Issue                                     | Solution                                                              |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `MongoServerError: bad auth`              | Wrong password in connection string. Re-check Database Access user.   |
| `MongoNetworkError: connect ECONNREFUSED` | IP not whitelisted. Go to Network Access → Add your IP.               |
| `auth/configuration-not-found`            | Firebase provider not enabled. Check Authentication → Sign-in method. |
| `auth/popup-closed-by-user`               | User closed the Google sign-in popup. Normal behavior.                |
| `auth/unauthorized-domain`                | Add your domain to Firebase → Auth → Settings → Authorized domains.   |
| Google sign-in not working                | Make sure Google provider is enabled and support email is set.        |
| CORS errors                               | Ensure `CLIENT_URL` in `server/.env` matches your frontend URL.       |
