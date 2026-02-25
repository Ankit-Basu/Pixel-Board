# Pixel-Board Deployment Guide 🚀

This guide explains how to properly deploy the MERN + Python architecture of Pixel-Board.

Because Pixel-Board uses real-time WebSockets (Socket.io) for continuous drawing and chat, **you cannot host the backend on Vercel**. Vercel uses stateless "Serverless Functions" which terminate WebSocket connections after 10-15 seconds.

Instead, we will use **Vercel** for the React Frontend, and **Render.com** (or Railway) for the continuous Node.js and Python backend servers.

---

## 🟢 Part 1: Deploying the Frontend to Vercel

Vercel is the absolute best place to host Vite/React applications.

### Option A: Using the Vercel Dashboard (Easiest)

1. Push your latest code to your GitHub Repository.
2. Go to [Vercel.com](https://vercel.com/) and Log In to your account.
3. Click the **Add New...** > **Project** button.
4. Click **Import** next to your `Pixel-Board` GitHub repository.
5. Under **Project Settings**, configure the following:
   - **Framework Preset**: Verify it says `Vite`.
   - **Root Directory**: Click the "Edit" button and select the `client` folder.
   - **Environment Variables**: Add your `VITE_BACKEND_URL` pointing to your deployed Render URL (you will get this in Part 2, so you may need to come back and add this later).
6. Click **Deploy**. Vercel will automatically read the `vercel.json` file we created earlier to handle your React routing.

### Option B: Using the Vercel CLI

If you want to deploy straight from your terminal right now:

1. Open a terminal and run: `npm i -g vercel`
2. Navigate to your client folder: `cd client`
3. Run the deployment command: `vercel`
4. The CLI will ask you to log in. Follow the browser prompt.
5. Answer the CLI prompts:
   - Set up and deploy? `Y`
   - Which scope? `[Select your account]`
   - Link to existing project? `N`
   - What's your project's name? `pixel-board-client`
   - In which directory is your code located? `./`
   - Want to modify these settings? `N`

---

## 🟣 Part 2: Deploying the Backends to Render.com

Render is an excellent free-tier platform that supports continuous long-running servers required for WebSockets. I have already created a `render.yaml` Blueprint file in your project to automate this process.

### Steps to Deploy:

1. Push your latest code to GitHub (ensure the `render.yaml` file is pushed).
2. Go to [Render.com](https://render.com/) and Sign Up / Log In using GitHub.
3. Click the **New +** button in the dashboard.
4. Select **Blueprint** from the dropdown menu.
5. Connect your GitHub account and select your `Pixel-Board` repository.
6. Render will read the `render.yaml` file and automatically detect that you need **two** web services:
   - `pixel-board-server` (The Node.js Socket.io backend)
   - `pixel-board-ai-server` (The Python Groq AI backend)
7. Render will ask you to input the values for your Environment Variables. You must paste in all of your keys from your local `.env` files:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `ALLOWED_ORIGIN` (Set this to your newly deployed Vercel frontend URL!)
   - `GROQ_API_KEY`
8. Click **Apply**.

Render will now automatically build and spin up both of your servers.

---

## 🔗 Part 3: Connecting Them Together

Once Vercel and Render finish building, you need to make sure they can talk to each other.

1. **Update Frontend Environment:**
   Go to your Vercel Dashboard > Project Settings > Environment Variables.
   Add `VITE_BACKEND_URL` and set its value to your new Node.js Render URL (e.g., `https://pixel-board-server.onrender.com`). Redeploy the Vercel app to apply the new variable.

2. **Update Backend CORS Policy:**
   Go to your Render Dashboard > Node.js Service > Environment.
   Ensure `ALLOWED_ORIGIN` is exactly equal to your Vercel frontend URL (e.g., `https://pixel-board-client.vercel.app`) so the backend accepts socket connections from your deployed website.

Congratulations! Your entire ecosystem is now live on the internet! 🎉
