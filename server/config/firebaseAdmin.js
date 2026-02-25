import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, "serviceAccountKey.json");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Handle potential literal \n characters in the private key environment variable
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

if (projectId && clientEmail && privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("Firebase Admin initialized via Environment Variables");
  } catch (err) {
    console.error("Firebase Admin init failed:", err);
  }
} else if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized via serviceAccountKey.json");
} else {
  // Initialize without service account for development
  // This will use Application Default Credentials if available
  console.warn("⚠️  Firebase Admin credentials missing!");
  console.warn(
    "   Provide FIREBASE environment variables or serviceAccountKey.json",
  );
  admin.initializeApp({
    projectId: "collabboard-f84cd",
  });
}

export default admin;
