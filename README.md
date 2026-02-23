# Pixel-Board 🕹️

A dynamic, real-time collaborative whiteboard built with the MERN stack and wrapped in a stunning 8-bit retro RPG aesthetic.

Pixel-Board offers simultaneous drawing, real-time chat, WebRTC screen sharing, and an integrated **AI math solver** powered by the Groq API (`llama-3.2-90b-vision-preview`).

---

## ✦ Key Features ✦

- **Real-Time Synchronized Drawing**: Draw together with zero lag using Socket.io.
- **Pixel Tools**: Includes standard pencil, eraser, path clearing, and color picker tools.
- **AI Vision Math Solver**: Draw an equation on the board, click "Solve", and the Groq AI model will recognize and solve the math problem using Base64 image payload processing.
- **In-Room Chat & Screen Sharing**: Communicate via live text chat and share your screen within the browser using WebRTC.
- **Secure Private Rooms**: Generate unique Room IDs for isolated, secure collaboration spaces.
- **Retro 8-Bit HUD**: Immersive gaming aesthetic featuring pixel typography (`Press Start 2P`, `VT323`), CSS glassmorphism HUDs, physical button press animations, and DiceBear generated pixel avatars.
- **Secure Authentication**: Firebase Auth paired with JWT verification and MongoDB state persistence.

---

## ✦ Tech Stack ✦

**Frontend (Client)**

- React.js + Vite
- Vanilla CSS (Custom Design System, CSS Variables, Animations)
- Context API (Socket, Auth, Theme)
- MathJax (LaTeX Rendering)
- Framer Motion

**Backend (Server)**

- Node.js + Express
- MongoDB Atlas & Mongoose
- Socket.io (WebSockets)
- Firebase Admin SDK
- JSON Web Tokens (JWT)

**AI Microservice (AI-Server)**

- Python + FastAPI
- Groq SDK (`llama-3.2-90b-vision-preview`)
- Pillow (Image Processing)

---

## ✦ Setup & Installation ✦

### Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- MongoDB Atlas URI
- Firebase Service Account Key
- Groq API Key

### 1. Clone the Repository

```bash
git clone https://github.com/Ankit-Basu/Pixel-Board.git
cd Pixel-Board
```

### 2. Install Dependencies

The project is set up as a monorepo.

**Client:**

```bash
cd client
npm install
```

**Server:**

```bash
cd server
npm install
```

**AI Server:**

```bash
cd ai-server
python -m venv venv
# Activate venv: .\venv\Scripts\activate (Windows) or source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
```

### 3. Environment Variables

You will need to create `.env` files in all three directories (`client/`, `server/`, `ai-server/`). Refer to the respective directories for configuration requirements (MONGO_URI, GROQ_API_KEY, FIREBASE credentials).

### 4. Running the Ecosystem

From the root directory, you can run everything concurrently (requires `concurrently` installed globally or setup in root package.json if configured):

```bash
# If configured with concurrently:
npm run dev:all

# Alternatively, run them separately:
# Terminal 1: cd client && npm run dev
# Terminal 2: cd server && npm run dev
# Terminal 3: cd ai-server && uvicorn main:app --host 127.0.0.1 --port 8900 --reload
```

---

## ✦ Future Enhancements ✦

- In-room File Sharing UI.
- Whiteboard Session Recording logic.
- Expand AI capabilities (graphing, physics solvers).

---

© 2024 Pixel-Nexus. Crafted for the 8-bit collaborative web.
