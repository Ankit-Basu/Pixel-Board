import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBpIPoatWUjw3ZOPk2LnlEjm8j8q2vBxg0",
  authDomain: "collabboard-f84cd.firebaseapp.com",
  projectId: "collabboard-f84cd",
  storageBucket: "collabboard-f84cd.firebasestorage.app",
  messagingSenderId: "429737587011",
  appId: "1:429737587011:web:a17dbd963a701ce5783ff6",
  measurementId: "G-EBLBN6TQFL",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export {
  auth,
  googleProvider,
  githubProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
