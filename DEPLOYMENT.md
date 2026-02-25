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

### Why didn't we use the `render.yaml` Blueprint?

Render.com recently updated its free tier policies: while hosting Web Services is 100% free, their automated "Blueprint" creation tool now requires a credit card on file to prevent spam accounts from spinning up thousands of servers. By clicking "New > Web Service" manually as described below, you completely bypass the credit card requirement and stay on the free tier!

### Steps to Deploy Manually (No Credit Card Required):

1. Push your latest code to GitHub.
2. Go to [Render.com](https://render.com/) and Sign Up / Log In using GitHub.
3. Click the **New +** button and select **Web Service**.
4. Choose **Build and deploy from a Git repository**.
5. Connect your GitHub account and select your `Pixel-Board` repository.

**Create the Node.js Server:**

- **Name**: `pixel-nexus-server` (or whatever you prefer)
- **Root Directory**: `server`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- Select the `Free` instance type.
- Click **Add Environment Variable** and paste in all your keys from `server/.env`:
  - `MONGO_URI`
  - `JWT_SECRET`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
  - `ALLOWED_ORIGIN` (Set this to your Vercel frontend URL!)
- Click **Deploy Web Service**.

**Create the AI Server (Optional):**

- Click **New +** > **Web Service** again and select your repo.
- **Name**: `pixel-nexus-ai`
- **Root Directory**: `ai-server`
- **Environment**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Select the `Free` instance type.
- Add your Environment Variables from `ai-server/.env`:
  - `GROQ_API_KEY`
  - `PYTHON_VERSION` = `3.10.0`
- Click **Deploy Web Service**.

Render will now build and spin up your free servers! It may take a few minutes for the first deployment.

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
