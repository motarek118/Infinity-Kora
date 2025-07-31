import { auth, db, storage } from "../firebase/firebase-config.js";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ====== DOM Elements
const teamNameInput = document.getElementById("teamNameInput");
const teamLogoInput = document.getElementById("teamLogoInput");
const teamLogoPreview = document.getElementById("teamLogoPreview");
const saveBtn = document.getElementById("saveTeamInfoBtn");

let currentUserId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUserId = user.uid;
  const docRef = doc(db, "teams", currentUserId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    teamNameInput.value = data.teamName || "";
    if (data.teamLogoURL) {
      teamLogoPreview.src = data.teamLogoURL;
    }
  }
});

// ====== Save Team Info
saveBtn.addEventListener("click", async () => {
  const teamName = teamNameInput.value.trim();

  if (!teamName) {
    alert("Please enter a team name.");
    return;
  }

  try {
    let logoURL = teamLogoPreview.src;

    if (teamLogoInput.files.length > 0) {
      const file = teamLogoInput.files[0];
      const storageRef = ref(storage, `team_logos/${currentUserId}`);
      await uploadBytes(storageRef, file);
      logoURL = await getDownloadURL(storageRef);
    }

    await setDoc(doc(db, "teams", currentUserId), {
      teamName: teamName,
      teamLogoURL: logoURL,
      updatedAt: Date.now()
    });

    alert("✅ Team info saved successfully!");
  } catch (err) {
    console.error("Error saving team info:", err);
    alert("❌ Failed to save team info.");
  }
});
import { auth, db } from "../firebase/firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// === Auto-load team data if exists ===
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  const uid = user.uid;
  const teamRef = doc(db, "teams", uid);
  const teamSnap = await getDoc(teamRef);

  if (teamSnap.exists()) {
    const data = teamSnap.data();
    if (data.teamName) {
      document.getElementById("teamName").value = data.teamName;
    }
    if (data.logoURL) {
      document.getElementById("teamLogoImage").src = data.logoURL;
    }
  }
});
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { storage } from "../firebase/firebase-config.js";

document.getElementById("saveTeamBtn").addEventListener("click", async () => {
  const teamName = document.getElementById("teamName").value.trim();
  const logoFile = document.getElementById("logoInput").files[0];

  if (!teamName) {
    alert("Please enter a team name.");
    return;
  }

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  let logoURL = "";

  // If a new logo was uploaded
  if (logoFile) {
    const storageRef = ref(storage, `team-logos/${uid}`);
    await uploadBytes(storageRef, logoFile);
    logoURL = await getDownloadURL(storageRef);
  } else {
    // Try to get existing logo if exists
    const teamDoc = await getDoc(doc(db, "teams", uid));
    if (teamDoc.exists()) {
      logoURL = teamDoc.data().logoURL || "";
    }
  }

  await setDoc(doc(db, "teams", uid), {
    teamName,
    logoURL,
  });

  alert("✅ Team data saved successfully!");
});
import { db, storage } from "../firebase/firebase-config.js";
import {
  doc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { auth } from "../firebase/firebase-config.js";

// === SAVE TEAM DATA ===
window.saveTeamData = async function () {
  const teamName = document.getElementById("teamNameInput").value.trim();
  const logoInput = document.getElementById("teamLogoInput");
  const message = document.getElementById("teamSaveMessage");
  message.textContent = "Saving...";
  message.style.color = "#fff";

  try {
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);

    let logoURL = "";

    if (logoInput.files.length > 0) {
      const file = logoInput.files[0];
      const storageRef = ref(storage, `team-logos/${user.uid}`);
      await uploadBytes(storageRef, file);
      logoURL = await getDownloadURL(storageRef);
    }

    await updateDoc(userDocRef, {
      teamName: teamName,
      teamLogo: logoURL || null,
    });

    message.textContent = "✅ Saved successfully!";
    message.style.color = "#39ff14";
    setTimeout(() => {
      document.getElementById("teamPopup").classList.add("hidden");
    }, 1500);
  } catch (err) {
    console.error("Save error:", err);
    message.textContent = "❌ Error saving data.";
    message.style.color = "red";
  }
};
window.openTeamPopup = function () {
  document.getElementById("teamPopup").classList.remove("hidden");
};

window.closeTeamPopup = function () {
  document.getElementById("teamPopup").classList.add("hidden");
};

document.getElementById("teamLogoInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      document.getElementById("teamLogoPreview").src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});
