// fan.js — FINAL FULL VERSION WITH MATCH & MENU FIXED
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, setDoc,
  collection, getDocs, query, limit
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB2J7vJquGsw2U4bgxL_7XvVWijT78wEpw",
  authDomain: "infinity-koraa.firebaseapp.com",
  projectId: "infinity-koraa",
  storageBucket: "infinity-koraa.appspot.com",
  messagingSenderId: "232347807276",
  appId: "1:232347807276:web:ecdc01b341a2ace0cceb89"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Elements
const usernameEl = document.getElementById("username");
const watchedEl = document.getElementById("videos-watched");
const votesEl = document.getElementById("correct-votes");
const pointsEl = document.getElementById("total-points");
const editForm = document.getElementById("edit-profile-form");
const editMsg = document.getElementById("edit-message");
const editPic = document.getElementById("edit-profile-pic");
const imageUpload = document.getElementById("profile-image-upload");

const fullNameField = document.getElementById("edit-fullname");
const ageField = document.getElementById("edit-age");
const cityField = document.getElementById("edit-city");
const emailField = document.getElementById("edit-email");
const phoneField = document.getElementById("edit-phone");
const currentPassField = document.getElementById("edit-current-password");
const newPassField = document.getElementById("edit-new-password");
const confirmPassField = document.getElementById("edit-confirm-password");

// Cities
["Cairo", "Alexandria", "Giza", "Port Said", "Mansoura", "Zagazig"].forEach(city => {
  const opt = document.createElement("option");
  opt.value = city;
  opt.textContent = city;
  cityField.appendChild(opt);
});

// Auth Listener
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "index.html";

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    usernameEl.textContent = data.fullName || "Fan";
    watchedEl.textContent = data.videowatched || 0;
    votesEl.textContent = data.correctvotes || 0;
    pointsEl.textContent = data.totalpoints || 0;
    editPic.src = data.profile || "images/user-placeholder.png";
  } else {
    await setDoc(userRef, {
      fullName: "Fan",
      videowatched: 0,
      correctvotes: 0,
      totalpoints: 0,
      role: "fan"
    });
  }

  loadNextMatch(user.uid);
  loadEditPopup(user.uid);
});

// Load Next Match
async function loadNextMatch(userId) {
  const matchInfo = document.getElementById("match-info");
  const q = query(collection(db, "next match"), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    matchInfo.innerHTML = "<p style='color:white;'>No match scheduled.</p>";
    return;
  }

  const match = snap.docs[0].data();
  const matchId = snap.docs[0].id;
  const matchTime = match["match date"].toDate();

  matchInfo.innerHTML = `
    <div class="teams">
      <div>
        <img src="${match.Team1Logo}" class="team-logo" />
        <div class="team-name">${match["Team 1"]}</div>
      </div>
      <div class="vs">VS</div>
      <div>
        <img src="${match.Team2Logo}" class="team-logo" />
        <div class="team-name">${match["Team 2"]}</div>
      </div>
    </div>
    <div class="match-info">
      <p>${match.Location}</p>
      <p>${matchTime.toLocaleString()}</p>
    </div>
    <div class="countdown">${convertTime(matchTime - new Date())}</div>
    <div class="remaining">remaining</div>
    <div id="vote-message" style="margin-top: 15px;"></div>
    <div id="vote-button-container"></div>
  `;

  // Update countdown every second
  setInterval(() => {
    document.querySelector(".countdown").textContent = convertTime(match["match date"].toDate() - new Date());
  }, 1000);

  const voteId = `${userId}_${matchId}`;
  const voteRef = doc(db, "votes", voteId);
  const voteSnap = await getDoc(voteRef);

  const voteMsg = document.getElementById("vote-message");
  const voteBtnContainer = document.getElementById("vote-button-container");

  if (voteSnap.exists()) {
    voteMsg.innerHTML = `<div style="color: #00e676; font-weight: bold;">✅ You voted for ${voteSnap.data().votedTeam}</div>`;
  } else {
    const voteBtn = document.createElement("button");
    voteBtn.className = "vote-btn";
    voteBtn.textContent = "Vote Now";
    voteBtn.onclick = () => openVotePopup(match, userId, matchId);
    voteBtnContainer.appendChild(voteBtn);
  }
}

// Convert Time
function convertTime(ms) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

// Vote Popup
const votePopup = document.getElementById("vote-popup");
const voteOptions = document.getElementById("vote-options");
const closeBtn = document.querySelector(".close-popup");

closeBtn.addEventListener("click", () => votePopup.classList.add("hidden"));

function openVotePopup(match, userId, matchId) {
  voteOptions.innerHTML = `
    <button onclick="handleVote('${match["Team 1"]}', '${userId}', '${matchId}')">${match["Team 1"]}</button>
    <button onclick="handleVote('${match["Team 2"]}', '${userId}', '${matchId}')">${match["Team 2"]}</button>
  `;
  votePopup.classList.remove("hidden");
}

window.handleVote = async function (team, userId, matchId) {
  const voteRef = doc(db, "votes", `${userId}_${matchId}`);
  await setDoc(voteRef, { userId, matchId, votedTeam: team });
  votePopup.classList.add("hidden");
  document.getElementById("vote-button-container").innerHTML = "";
  document.getElementById("vote-message").innerHTML = `<div style="color: #00e676; font-weight: bold;">✅ You voted for ${team}</div>`;
};

// Profile Dropdown Menu
const profileIcon = document.getElementById("user-avatar");
const dropdownMenu = document.querySelector(".dropdown-menu");
profileIcon.addEventListener("click", () => dropdownMenu.classList.toggle("hidden"));
document.addEventListener("click", (e) => {
  if (!profileIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.add("hidden");
  }
});

// Edit Popup
function loadEditPopup(uid) {
  document.getElementById("edit-profile-btn").addEventListener("click", async () => {
    const userSnap = await getDoc(doc(db, "users", uid));
    const data = userSnap.data();
    fullNameField.value = data.fullName || "";
    ageField.value = data.age || "";
    cityField.value = data.city || "";
    emailField.value = auth.currentUser.email || "";
    phoneField.value = data.phone || "";
    editPic.src = data.profile || "images/user-placeholder.png";
    document.getElementById("edit-profile-popup").classList.remove("hidden");
  });

  document.getElementById("close-edit-popup").addEventListener("click", () => {
    document.getElementById("edit-profile-popup").classList.add("hidden");
  });

  document.getElementById("cancel-edit-btn").addEventListener("click", () => {
    document.getElementById("edit-profile-popup").classList.add("hidden");
  });
}

// Submit Profile Form
editForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = fullNameField.value.trim();
  const age = parseInt(ageField.value);
  const city = cityField.value;
  const email = emailField.value.trim();
  const phone = phoneField.value.trim();
  const currentPass = currentPassField.value.trim();
  const newPass = newPassField.value.trim();
  const confirmPass = confirmPassField.value.trim();
  const uid = auth.currentUser.uid;

  if (!fullName || !age || !city || !email || !phone || !currentPass) {
    return showEditMessage("❌ All fields are required", "error");
  }

  if (!email.includes("@") || phone.length !== 11 || !/^\d+$/.test(phone)) {
    return showEditMessage("❌ Invalid email or phone", "error");
  }

  if (newPass && newPass !== confirmPass) {
    return showEditMessage("❌ Passwords do not match", "error");
  }

  try {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
    await reauthenticateWithCredential(auth.currentUser, cred);
    if (newPass) await updatePassword(auth.currentUser, newPass);

    let photoURL = editPic.src;

    if (imageUpload.files.length > 0) {
      const file = imageUpload.files[0];
      const storageRef = ref(storage, `profiles/${uid}`);
      await uploadBytes(storageRef, file);
      photoURL = await getDownloadURL(storageRef);
    }

    await updateDoc(doc(db, "users", uid), {
      fullName, age, city, phone, profile: photoURL
    });

    showEditMessage("✅ Profile updated. Logging out...", "success");

    setTimeout(() => {
      auth.signOut().then(() => location.href = "index.html");
    }, 2000);

  } catch (err) {
    console.error("❌", err.message);
    showEditMessage(err.code === "auth/wrong-password" ? "❌ Incorrect password" : "❌ Update failed", "error");
  }
});

function showEditMessage(msg, type) {
  editMsg.textContent = msg;
  editMsg.className = type === "error" ? "error" : "success";
}
