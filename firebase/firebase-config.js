// firebase/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2J7vJquGsw2U4bgxL_7XvVWijT78wEpw",
  authDomain: "infinity-koraa.firebaseapp.com",
  databaseURL: "https://infinity-koraa-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "infinity-koraa",
  storageBucket: "infinity-koraa.firebasestorage.app",
  messagingSenderId: "232347807276",
  appId: "1:232347807276:web:ecdc01b341a2ace0cceb89"
};
// ✅ Cloudinary upload function
async function uploadToCloudinary(file, folder = "infinity-kora") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "Infinity Kora"); // ✅ Exact name from your preset
  formData.append("folder", folder);

  const res = await fetch("https://api.cloudinary.com/v1_1/dgvqm1x8i/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url; // ✅ Direct Cloudinary URL
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
