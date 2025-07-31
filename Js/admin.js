
import { db, storage } from "../firebase/firebase-config.js";
import {
  collection, addDoc, deleteDoc, getDocs, doc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "../firebase/firebase-config.js";

// === Public Buttons ===
async function uploadVideo() {
  const title = document.getElementById("videoTitle").value;
  const videoURL = document.getElementById("videoURL").value;
  const duration = document.getElementById("videoDuration").value;
  const thumbnail = document.getElementById("videoThumbnail").value;
  const msg = document.getElementById("videoMsg");

  if (!title || !videoURL || !duration || !thumbnail) {
    msg.style.color = "red";
    msg.textContent = "Please fill in all fields.";
    return;
  }

  try {
    await addDoc(collection(db, "videos"), { title, videoURL, duration, thumbnail });
    msg.style.color = "#0f0";
    msg.textContent = "✅ Video uploaded.";
  } catch {
    msg.style.color = "red";
    msg.textContent = "Upload failed.";
  }
}

async function deleteAllVideos() {
  const snap = await getDocs(collection(db, "videos"));
  snap.forEach(async (docSnap) => await deleteDoc(doc(db, "videos", docSnap.id)));
  document.getElementById("videoMsg").textContent = "🗑️ All videos deleted.";
}

async function uploadChampionship() {
  const title = document.getElementById("champTitle").value;
  const image = document.getElementById("champImage").value;
  const msg = document.getElementById("champMsg");

  if (!title || !image) {
    msg.style.color = "red";
    msg.textContent = "All fields required.";
    return;
  }

  try {
    await addDoc(collection(db, "championship_upcoming"), { title, image });
    msg.style.color = "#0f0";
    msg.textContent = "✅ Championship added.";
  } catch {
    msg.style.color = "red";
    msg.textContent = "Failed to add.";
  }
}

async function deleteAllChampionships() {
  const snap = await getDocs(collection(db, "championship_upcoming"));
  snap.forEach(async (docSnap) => await deleteDoc(doc(db, "championship_upcoming", docSnap.id)));
  document.getElementById("champMsg").textContent = "🗑️ All championships deleted.";
}

async function saveNextMatch() {
  const team1 = document.getElementById("team1").value;
  const team2 = document.getElementById("team2").value;
  const location = document.getElementById("location").value;
  const datetime = document.getElementById("matchDatetime").value;
  const msg = document.getElementById("matchMsg");

  if (!team1 || !team2 || !location || !datetime) {
    msg.style.color = "red";
    msg.textContent = "Fill all fields.";
    return;
  }

  const matchTime = new Date(datetime);
  await setDoc(doc(db, "next match", "scheduled"), {
    team1, team2, location, datetime: matchTime
  });
  msg.style.color = "#0f0";
  msg.textContent = "✅ Next match saved.";
}

async function deleteNextMatch() {
  await deleteDoc(doc(db, "next match", "scheduled"));
  document.getElementById("matchMsg").textContent = "🗑️ Match deleted.";
}

async function uploadMediaFile() {
  const fileInput = document.getElementById("mediaUploadInput");
  const msg = document.getElementById("mediaUploadMsg");
  const out = document.getElementById("uploadedMediaURL");
  const file = fileInput.files[0];

  if (!file) {
    msg.style.color = "red";
    msg.textContent = "No file selected.";
    return;
  }

  msg.style.color = "#ccc";
  msg.textContent = "Uploading...";
  const path = `uploads/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  msg.style.color = "#0f0";
  msg.textContent = "✅ Uploaded!";
  out.innerText = url;
}

async function loadUserSelect(role, selectId) {
  const usersRef = collection(db, "users");
  const querySnap = await getDocs(usersRef);
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">-- Select --</option>';
  querySnap.forEach((docSnap) => {
    const d = docSnap.data();
    if (d.role === role) {
      const opt = document.createElement("option");
      opt.value = docSnap.id;
      opt.textContent = d.fullName || d.email || docSnap.id;
      select.appendChild(opt);
    }
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user && localStorage.getItem("adminLoggedIn") !== "true") return location.href = "index.html";
  await loadUserSelect("player", "playerSelect");
  await loadUserSelect("fan", "fanSelect");
});

// Expose functions to global scope since defer doesn't use modules
window.uploadVideo = uploadVideo;
window.deleteAllVideos = deleteAllVideos;
window.uploadChampionship = uploadChampionship;
window.deleteAllChampionships = deleteAllChampionships;
window.saveNextMatch = saveNextMatch;
window.deleteNextMatch = deleteNextMatch;
window.uploadMediaFile = uploadMediaFile;
