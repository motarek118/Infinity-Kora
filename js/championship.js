// championship.js
import { auth, db } from "../firebase/firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDocs,
  getDoc,
  setDoc,
  doc,
  collection,
  query,
  where,
  serverTimestamp
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

let currentUser;

// DOM references
const nowDiv = document.getElementById("nowChampionships");
const upcomingDiv = document.getElementById("upcomingChampionships");
const finishedDiv = document.getElementById("finishedChampionships");
const popup = document.getElementById("applyPopup");
const teamLogo = document.getElementById("applyTeamLogo");
const teamName = document.getElementById("applyTeamName");
const membersInput = document.getElementById("applyMembers");
const videoInput = document.getElementById("applyVideo");
const proofInput = document.getElementById("applyPaymentProof");
const priceField = document.getElementById("applyPrice");
const phoneField = document.getElementById("applyPhone");
const message = document.getElementById("applyMessage");

let currentChampId = null;

// Load all
onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "index.html";
  currentUser = user;

  await loadChampionships("championship_now", nowDiv, "Now");
  await loadChampionships("championship_upcoming", upcomingDiv, "Upcoming");
  await loadChampionships("championship_finished", finishedDiv, "Finished");
});

async function loadChampionships(colName, container, type) {
  const snap = await getDocs(collection(db, colName));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const card = document.createElement("div");
    card.className = "match-card";
    card.innerHTML = `
      <img src="${data.image}" alt="Championship Image" style="width: 100%; border-radius: 10px;">
${type !== "Upcoming" ? `
  <div style="position: absolute; top: 15px; right: 15px; background: white; color: black; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 13px;">
    ${type}
  </div>` : ""
}

      </div>
      <h3 style="margin-top: 10px;">${data.title}</h3>
${type === "Upcoming" ? `<button class="apply-btn" onclick="openApplyPopup('${docSnap.id}', '${colName}')">Apply Now</button>` : ""}
    `;
    container.appendChild(card);
  });
}

window.openApplyPopup = async (champId, colName) => {
  currentChampId = champId;
  popup.classList.remove("hidden");
  message.textContent = "";
  membersInput.value = "";
  videoInput.value = "";
  proofInput.value = "";

  // Load team info
  const teamSnap = await getDoc(doc(db, "teams", currentUser.uid));
  const team = teamSnap.data() || {};
  teamLogo.src = team.logo || "images/user-placeholder.png";
  teamName.textContent = team.name || "Unnamed Team";

  // Load champ info
  const champSnap = await getDoc(doc(db, colName, champId));
  const champ = champSnap.data() || {};
  priceField.value = `${champ.price || 0} EGP`;
  phoneField.value = champ.phone || "No phone";

  // Check if already applied
  const existing = await getDocs(query(collection(db, "applications"), where("userId", "==", currentUser.uid), where("champId", "==", champId)));
  if (!existing.empty) {
    message.textContent = "✅ You already applied to this championship.";
    message.className = "popup-message success";
    proofInput.disabled = true;
    membersInput.disabled = true;
    return;
  }

  proofInput.disabled = false;
  membersInput.disabled = false;
};

window.closeApplyPopup = () => {
  popup.classList.add("hidden");
  message.textContent = "";
};

window.submitApplication = async () => {
  const members = parseInt(membersInput.value);
  if (!members || members <= 0) {
    message.textContent = "❌ Team members count is required.";
    message.className = "popup-message error";
    return;
  }

  if (proofInput.files.length === 0) {
    message.textContent = "❌ Please upload payment proof.";
    message.className = "popup-message error";
    return;
  }

  try {
    message.textContent = "Uploading...";
    const storage = getStorage();

    // Upload payment proof
    const proofFile = proofInput.files[0];
    const proofRef = ref(storage, `applications/${currentUser.uid}_${currentChampId}/payment-proof`);
    await uploadBytes(proofRef, proofFile);
    const proofURL = await getDownloadURL(proofRef);

    // Upload video (if any)
    let videoURL = "";
    if (videoInput.files.length > 0) {
      const videoFile = videoInput.files[0];
      const videoRef = ref(storage, `applications/${currentUser.uid}_${currentChampId}/video`);
      await uploadBytes(videoRef, videoFile);
      videoURL = await getDownloadURL(videoRef);
    }

    await setDoc(doc(db, "applications", `${currentUser.uid}_${currentChampId}`), {
      userId: currentUser.uid,
      champId: currentChampId,
      members: members,
      video: videoURL,
      paymentProof: proofURL,
      submittedAt: serverTimestamp()
    });

    message.textContent = "✅ Application submitted successfully!";
    message.className = "popup-message success";
    proofInput.disabled = true;
    membersInput.disabled = true;
  } catch (err) {
    console.error(err);
    message.textContent = "❌ Failed to submit application.";
    message.className = "popup-message error";
  }
};
// Apply Popup Step Navigation
let currentStep = 1;

window.nextStep = () => {
  document.getElementById("stepContainer").style.transform = "translateX(-50%)";
  document.getElementById("stepDot1").classList.remove("active");
  document.getElementById("stepDot2").classList.add("active");
  currentStep = 2;
};

window.backStep = () => {
  document.getElementById("stepContainer").style.transform = "translateX(0%)";
  document.getElementById("stepDot1").classList.add("active");
  document.getElementById("stepDot2").classList.remove("active");
  currentStep = 1;
};

window.closeApplyPopup = () => {
  document.getElementById("applyPopup").classList.add("hidden");
  backStep();
  document.getElementById("applyMessage").textContent = "";
};
