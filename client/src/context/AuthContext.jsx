import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import {
  auth,
  googleProvider,
  githubProvider,
  signInWithPopup,
  signInWithEmailAndPassword as firebaseEmailLogin,
  createUserWithEmailAndPassword as firebaseEmailRegister,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from "../config/firebase.js";

const AuthContext = createContext(null);

const API_URL = "http://localhost:5000/api/auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get Firebase ID token
          const token = await firebaseUser.getIdToken();

          // Sync user with MongoDB backend
          const { data } = await axios.post(
            `${API_URL}/firebase-sync`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );

          const userData = {
            _id: data._id,
            name:
              data.name ||
              firebaseUser.displayName ||
              firebaseUser.email.split("@")[0],
            email: data.email || firebaseUser.email,
            avatar: data.avatar || firebaseUser.photoURL || "",
            authProvider: data.authProvider || "firebase",
            firebaseToken: token,
          };

          setUser(userData);
          localStorage.setItem("wb_user", JSON.stringify(userData));
        } catch (error) {
          console.error("Firebase sync error:", error);
          // If backend is down, still allow the user to see the app with Firebase data
          const fallbackUser = {
            _id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL || "",
            authProvider: "firebase",
            firebaseToken: await firebaseUser.getIdToken(),
          };
          setUser(fallbackUser);
          localStorage.setItem("wb_user", JSON.stringify(fallbackUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem("wb_user");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Register with Email/Password
  const register = async (name, email, password) => {
    const cred = await firebaseEmailRegister(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // onAuthStateChanged will handle the rest
    return cred.user;
  };

  // Login with Email/Password
  const login = async (email, password) => {
    const cred = await firebaseEmailLogin(auth, email, password);
    return cred.user;
  };

  // Sign in with Google
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  // Sign in with GitHub
  const loginWithGithub = async () => {
    const result = await signInWithPopup(auth, githubProvider);
    return result.user;
  };

  // Logout
  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    localStorage.removeItem("wb_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        loginWithGoogle,
        loginWithGithub,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
