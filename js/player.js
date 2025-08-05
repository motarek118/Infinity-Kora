
// ✅ Final player.js - fully loaded with all logic

import { auth, db } from "../firebase/firebase-config.js";
import {
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  collection,
  orderBy,
  limit,
  setDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
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

let currentUser, currentUserData, leaderId = null;
window.viewModal = document.getElementById("viewTeamModal");

// DOM references
const welcomeSpan = document.getElementById("playerName");
const avatar = document.getElementById("user-avatar");
const pointsSpan = document.getElementById("playerPoints");
const goalsSpan = document.getElementById("goalsScored");
const rankSpan = document.getElementById("playerRank");
const matchInfo = document.getElementById("matchInfo");
const teammatesList = document.getElementById("teammatesList");
const dropdownMenu = document.querySelector(".dropdown-menu");
const profileIcon = document.getElementById("user-avatar");

// Profile popup
const editPopup = document.getElementById("edit-profile-popup");
const editForm = document.getElementById("edit-profile-form");
const editMsg = document.getElementById("edit-message");
const imageUpload = document.getElementById("profile-image-upload");
const editPic = document.getElementById("edit-profile-pic");

const fullNameField = document.getElementById("edit-fullname");
const ageField = document.getElementById("edit-age");
const cityField = document.getElementById("edit-city");
const emailField = document.getElementById("edit-email");
const phoneField = document.getElementById("edit-phone");
const currentPassField = document.getElementById("edit-current-password");
const newPassField = document.getElementById("edit-new-password");
const confirmPassField = document.getElementById("edit-confirm-password");

const addModal = document.getElementById("addTeammateModal");
const viewModal = document.getElementById("viewTeamModal");
const teamNameInput = document.getElementById("teamNameInput");
const teamLogo = document.getElementById("teamLogo");
const teamLogoUpload = document.getElementById("uploadTeamLogo");
const teammateInput = document.getElementById("teammateInput");
const teammateMessage = document.getElementById("teammateMessage");
const fullTeamList = document.getElementById("fullTeamList");

// Auth check
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "index.html";
  currentUser = user;

  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (!userDoc.exists()) return;
  currentUserData = userDoc.data();

  welcomeSpan.textContent = currentUserData.fullName || "Player";
  avatar.src = currentUserData.profile || "images/user-placeholder.png";

  const teamsSnap = await getDocs(collection(db, "teams"));
  for (const team of teamsSnap.docs) {
    const members = team.data().members || [];
    if (members.includes(user.uid)) {
      leaderId = team.id;
      break;
    }
  }

  const targetUID = leaderId || user.uid;
  const targetUserDoc = await getDoc(doc(db, "users", targetUID));
  const targetData = targetUserDoc.exists() ? targetUserDoc.data() : {};

  pointsSpan.textContent = targetData.points || 0;
  goalsSpan.textContent = targetData.goals || 0;

  await loadRank(targetUID);
  await loadNextMatch();
  await loadTeammates(targetUID);

  if (!leaderId) loadTeamEditor();
});

// Load rank
async function loadRank(uid) {
  const usersSnap = await getDocs(collection(db, "users"));
  const players = [];
  usersSnap.forEach(doc => {
    const d = doc.data();
    if (d.role === "player") players.push({ id: doc.id, points: d.points || 0 });
  });
  players.sort((a, b) => b.points - a.points);
  const rank = players.findIndex(p => p.id === uid) + 1;
  rankSpan.textContent = `#${rank}`;
}

// Load match
async function loadNextMatch() {
  try {
    const q = query(collection(db, "next match"), orderBy("match date", "asc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return matchInfo.textContent = "No match scheduled";
    const match = snap.docs[0].data();
    const date = match["match date"].toDate();
    matchInfo.innerHTML = `
      <strong>${match["Team 1"]}</strong> VS <strong>${match["Team 2"]}</strong><br>
      ${date.toLocaleDateString()} ${date.toLocaleTimeString()}<br>
      📍 ${match["Location"]}<br>
      ⏳ <span id="matchCountdown">Loading...</span>
    `;
    function updateCountdown() {
  const now = new Date();
  const ms = date - now;
  if (ms <= 0) {
    document.getElementById("matchCountdown").textContent = "00:00:00";
    return;
  }
  const h = String(Math.floor(ms / (1000 * 60 * 60))).padStart(2, '0');
  const m = String(Math.floor((ms / (1000 * 60)) % 60)).padStart(2, '0');
  const s = String(Math.floor((ms / 1000) % 60)).padStart(2, '0');
  document.getElementById("matchCountdown").textContent = `${h}:${m}:${s}`;
}
updateCountdown();
setInterval(updateCountdown, 1000);
  } catch (err) {
    matchInfo.textContent = "Error loading match";
  }
}
function renderTeammate(uid, name, photo = "") {
  const box = document.createElement("div");
  box.className = "teammate";
  box.innerHTML = `
    <img src="${photo || 'images/user-placeholder.png'}" alt="${name}" />
    <span>${name}</span>
  `;
  teammatesList.appendChild(box);
}

// Load teammates
async function loadTeammates(uid) {
  teammatesList.innerHTML = "";
  const teamDoc = await getDoc(doc(db, "teams", uid));
  const team = teamDoc.exists() ? teamDoc.data() : {};
  const members = team.members || [];

  renderTeammate(uid, "You");

  for (const memberId of members) {
    const memberDoc = await getDoc(doc(db, "users", memberId));
    if (memberDoc.exists()) {
      const m = memberDoc.data();
      renderTeammate(memberId, m.fullName, m.profile);
    }
  }

  if (!leaderId) {
    const addBtn = document.createElement("div");
    addBtn.className = "add-member";
    addBtn.innerHTML = '<div class="add-circle" onclick="openTeammateModal()">+</div><div class="add-label">Add Member</div>';
    teammatesList.appendChild(addBtn);
  }
}

// Render teammate UI
function renderTeamMember(uid, name, photo = "", allowDelete = true) {
  const box = document.createElement("div");
  box.className = "member";
  box.innerHTML = `
    <img src="${photo}" onerror="this.src='images/user-placeholder.png'" />
    <span>${name}</span>
    ${
      allowDelete
        ? `<img src="images/icons/icon-delete.png" class="remove-icon" onclick="removeTeammate('${uid}')">`
        : ""
    }
  `;
  fullTeamList.appendChild(box);
}

// Profile dropdown
profileIcon.addEventListener("click", () => {
  dropdownMenu.classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
  if (!profileIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.add("hidden");
  }
});

// Popup profile edit
document.getElementById("edit-profile-btn").addEventListener("click", () => {
  fullNameField.value = currentUserData.fullName || "";
  ageField.value = currentUserData.age || "";
  cityField.value = currentUserData.city || "";
  emailField.value = currentUser.email || "";
  phoneField.value = currentUserData.phone || "";
  editPic.src = currentUserData.profile || "images/user-placeholder.png";
  editPopup.classList.remove("hidden");
});
document.getElementById("close-edit-popup").onclick =
document.getElementById("cancel-edit-btn").onclick = () => {
  editPopup.classList.add("hidden");
};


// Load team popup editor
function loadTeamEditor() {
  document.getElementById("viewAllTeam").addEventListener("click", async () => {
    const snap = await getDoc(doc(db, "teams", currentUser.uid));
    const data = snap.data() || {};
    const members = data.members || [];
    const allUids = [currentUser.uid, ...members];
const logoURL = data.logo && data.logo.trim() !== "" ? data.logo : "images/user-placeholder.png";
const teamName = data.name && data.name.trim() !== "" ? data.name : "team";

document.getElementById("teamLogo").src = logoURL;
document.getElementById("teamNameDisplay").textContent = teamName;
document.getElementById("teamNameInput").value = teamName;


    const usersSnap = await getDocs(collection(db, "users"));
    const players = [];
    usersSnap.forEach(doc => {
      const d = doc.data();
      if (d.role === "player") players.push({ id: doc.id, points: d.points || 0 });
    });
    players.sort((a, b) => b.points - a.points);
    const rank = players.findIndex(p => p.id === currentUser.uid) + 1;
    document.getElementById("teamRankDisplay").textContent = `Rank #${rank}`;

    fullTeamList.innerHTML = "";
    for (const uid of allUids) {
      const uSnap = await getDoc(doc(db, "users", uid));
      if (uSnap.exists()) {
        const u = uSnap.data();
        renderTeamMember(uid, u.fullName, u.profile || "", uid !== currentUser.uid);
      }
    }

    viewModal.classList.remove("hidden");
  });
}

const deleteIconUrl = "images/icons/icon-delete.png";

window.removeTeammate = async (uid) => {
  const teamRef = doc(db, "teams", currentUser.uid);
  const snap = await getDoc(teamRef);
  if (!snap.exists()) return;

  const members = snap.data().members || [];
  const updated = members.filter(id => id !== uid);

  await updateDoc(teamRef, { members: updated });
if (updateData.logo) document.getElementById("teamLogo").src = updateData.logo;
if (updateData.name) document.getElementById("teamNameDisplay").textContent = updateData.name;

  const msgBox = document.getElementById("teamSaveMessage");
  msgBox.textContent = "✅ Member removed successfully!";
  msgBox.className = "popup-message success";

  loadTeamEditor(); // refresh list
};

// Add teammate popup
window.openTeammateModal = () => addModal.classList.remove("hidden");
window.closeTeammateModal = () => {
  addModal.classList.add("hidden");
  teammateMessage.textContent = "";
  teammateInput.value = "";
};

window.addTeammate = async () => {
  const input = teammateInput.value.trim().toLowerCase();
  const q = query(collection(db, "users"));
  const snap = await getDocs(q);

  let foundId = null;
  snap.forEach(doc => {
    const d = doc.data();
    if ((d.email === input || d.phone === input) && d.role === "player") {
      foundId = doc.id;
    }
  });

  if (!foundId) {
    teammateMessage.textContent = "❌ Not found or not a player.";
    return;
  }

  // 🛑 Check if this user is already in a team
  const teamsSnap = await getDocs(collection(db, "teams"));
  for (const team of teamsSnap.docs) {
    const leader = team.id;
    const members = team.data().members || [];
    if (leader === foundId || members.includes(foundId)) {
      teammateMessage.textContent = "❌ This user is already in a team.";
      return;
    }
  }

  // ✅ Passed all checks, proceed to add
  const teamDoc = await getDoc(doc(db, "teams", currentUser.uid));
  const team = teamDoc.data() || {};
  const members = team.members || [];

  if (members.includes(foundId)) {
    teammateMessage.textContent = "✅ Already added.";
    return;
  }

  if (members.length >= 6) {
    teammateMessage.textContent = "❌ Max 7 members allowed.";
    return;
  }

await updateDoc(doc(db, "teams", currentUser.uid), {
  members: arrayUnion(foundId)
});


  teammateMessage.textContent = "✅ Added successfully!";
  loadTeammates(currentUser.uid);
};
// === Edit Dropdown Toggle ===
let selectedOption = null;

document.getElementById("editMenuTrigger").addEventListener("click", () => {
  document.getElementById("editDropdown").classList.toggle("hidden");
});

function markSelectedOption(selectedEl) {
  const options = document.querySelectorAll("#editDropdown p");
  options.forEach(p => p.classList.remove("selected"));
  selectedEl.classList.add("selected");
}

window.enableLogoEdit = (el) => {
  document.getElementById("teamLogoEditor").classList.remove("hidden");
  document.getElementById("teamNameEditor").classList.add("hidden");
  markSelectedOption(el);
};

window.enableNameEdit = (el) => {
  document.getElementById("teamNameEditor").classList.remove("hidden");
  document.getElementById("teamLogoEditor").classList.add("hidden");
  markSelectedOption(el);
};

const editTrigger = document.getElementById("editMenuTrigger");
const editDropdown = document.getElementById("editDropdown");
if (editTrigger && editDropdown) {
  editTrigger.addEventListener("click", () => {
    editDropdown.classList.toggle("show");
  });
}

window.saveTeamChanges = async () => {
  const teamRef = doc(db, "teams", currentUser.uid);
  const updateData = {};
  const messageBox = document.getElementById("teamSaveMessage");
  messageBox.textContent = "";
  messageBox.className = "popup-message";

  try {
    // ✅ Upload logo image if selected
    const logoInput = document.getElementById("uploadTeamLogo");
    if (logoInput.files.length > 0) {
      const file = logoInput.files[0];
      const storage = getStorage();
      const refPath = ref(storage, `teams/${currentUser.uid}`);
      await uploadBytes(refPath, file);
      const logoURL = await getDownloadURL(refPath);
      updateData.logo = logoURL;

      // ✅ Show new logo immediately
      document.getElementById("teamLogo").src = logoURL;
    }

    // ✅ Update team name if changed
    const newName = document.getElementById("teamNameInput").value.trim();
    if (newName) {
      updateData.name = newName;
      document.getElementById("teamNameDisplay").textContent = newName;
    }

    if (Object.keys(updateData).length === 0) {
      messageBox.textContent = "⚠️ No changes made.";
      messageBox.classList.add("error");
      return;
    }

    await updateDoc(teamRef, updateData);
    messageBox.textContent = "✅ Team info updated!";
    messageBox.classList.add("success");

    // ✅ Optionally close after save
    setTimeout(() => {
      viewModal.classList.add("hidden");
    }, 1500);
  } catch (err) {
    console.error("Update failed:", err);
    messageBox.textContent = "❌ Update failed. Try again.";
    messageBox.classList.add("error");
  }
};
