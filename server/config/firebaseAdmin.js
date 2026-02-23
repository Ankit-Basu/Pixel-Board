import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = join(__dirname, "serviceAccountKey.json");

if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized with service account");
} else {
  // Initialize without service account for development
  // This will use Application Default Credentials if available
  console.warn("⚠️  serviceAccountKey.json not found in server/config/");
  console.warn("   Firebase token verification will not work.");
  console.warn(
    "   Download it from Firebase Console → Project Settings → Service Accounts",
  );
  admin.initializeApp({
    projectId: "collabboard-f84cd",
  });
}

export default admin;
