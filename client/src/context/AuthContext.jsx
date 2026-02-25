import { createContext, useContext, useState, useEffect, useRef } from "react";
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
  const syncedUidRef = useRef(null); // track which UID we already synced

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If we already synced this user in this session, just restore from localStorage
        if (
          syncedUidRef.current === firebaseUser.uid ||
          sessionStorage.getItem("wb_synced") === firebaseUser.uid
        ) {
          const cached = localStorage.getItem("wb_user");
          if (cached) {
            const parsed = JSON.parse(cached);
            // Refresh the token silently
            parsed.firebaseToken = await firebaseUser.getIdToken();
            // Always pick up the latest photo from the provider (handles first-login edge case)
            if (!parsed.avatar && firebaseUser.photoURL) {
              parsed.avatar = firebaseUser.photoURL;
              localStorage.setItem("wb_user", JSON.stringify(parsed));
            }
            setUser(parsed);
          }
          syncedUidRef.current = firebaseUser.uid;
          setLoading(false);
          return;
        }

        try {
          // Get Firebase ID token
          const token = await firebaseUser.getIdToken();

          // Sync user with MongoDB backend (sends email — only once)
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

          syncedUidRef.current = firebaseUser.uid;
          sessionStorage.setItem("wb_synced", firebaseUser.uid);
          setUser(userData);
          localStorage.setItem("wb_user", JSON.stringify(userData));
        } catch (error) {
          console.error("Firebase sync error:", error);
          const fallbackUser = {
            _id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL || "",
            authProvider: "firebase",
            firebaseToken: await firebaseUser.getIdToken(),
          };
          syncedUidRef.current = firebaseUser.uid;
          setUser(fallbackUser);
          localStorage.setItem("wb_user", JSON.stringify(fallbackUser));
        }
      } else {
        syncedUidRef.current = null;
        setUser(null);
        localStorage.removeItem("wb_user");
        sessionStorage.removeItem("wb_synced");
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

  // Update Profile Avatar
  const updateProfileAvatar = async (avatarUrl) => {
    if (!user || !auth.currentUser) return;
    try {
      const freshToken = await auth.currentUser.getIdToken();
      const { data } = await axios.put(
        `${API_URL}/profile`,
        { avatar: avatarUrl },
        { headers: { Authorization: `Bearer ${freshToken}` } },
      );
      const updatedUser = {
        ...user,
        avatar: data.avatar,
        firebaseToken: freshToken,
      };
      setUser(updatedUser);
      localStorage.setItem("wb_user", JSON.stringify(updatedUser));
      return data;
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
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
        updateProfileAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
