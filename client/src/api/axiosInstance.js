import axios from "axios";
import { auth } from "../config/firebase.js";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* ignore token errors */
  }
  return config;
});

export const aiApi = axios.create({
  baseURL: "http://localhost:8900",
});

export default api;
