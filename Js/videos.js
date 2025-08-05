// js/videos.js
import { auth, db } from "../firebase/firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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

const videoGrid = document.getElementById("videosGrid");
const popup = document.getElementById("videoPopup");
const popupVideo = document.getElementById("popupVideo");
const popupTitle = document.getElementById("popupTitle");
const popupViews = document.getElementById("popupViews");
const popupLikes = document.getElementById("popupLikes");
const popupComments = document.getElementById("popupComments");
const commentInput = document.getElementById("commentInput");
const sendComment = document.getElementById("sendComment");
const commentsList = document.getElementById("commentsList");
const closeVideo = document.getElementById("closeVideo");

let currentUser;
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "index.html";
  currentUser = user;

  const userRef = await getDoc(doc(db, "users", user.uid));
  const role = userRef.exists() ? userRef.data().role : "fan";
  loadNavbar(role);
  loadVideosWithAds();
});

function loadNavbar(role) {
  const navUrl = role === "player" ? "player-home.html" : "fan-home.html";
  const cssHref = role === "player" ? "css/player-style.css" : "css/fan.css";

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssHref;
  document.head.appendChild(link);

  fetch(navUrl).then(res => res.text()).then(html => {
    const dom = new DOMParser().parseFromString(html, "text/html");
    const nav = dom.querySelector("nav");
    const profilePopup = dom.getElementById("edit-profile-popup");
    document.getElementById("navbar-container").innerHTML = nav.outerHTML;
    if (profilePopup) document.body.appendChild(profilePopup);

    const links = document.querySelectorAll(".nav-link");
    links.forEach(link => link.classList.remove("active"));
    const videosLink = [...links].find(link => link.textContent.includes("Videos"));
    if (videosLink) {
      videosLink.classList.add("active");
      videosLink.style.color = "#00FF7F";
    }

    const homeLink = [...links].find(link => link.textContent.includes("Home"));
    if (homeLink) homeLink.href = role === "player" ? "player-home.html" : "fan-home.html";

    const profileIcon = document.getElementById("user-avatar");
    const dropdownMenu = document.querySelector(".dropdown-menu");
    if (profileIcon && dropdownMenu) {
      profileIcon.addEventListener("click", () => dropdownMenu.classList.toggle("hidden"));
      document.addEventListener("click", (e) => {
        if (!profileIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.classList.add("hidden");
        }
      });
    }

    const editProfileBtn = document.getElementById("edit-profile-btn");
    if (editProfileBtn) {
      editProfileBtn.addEventListener("click", async () => {
        const data = (await getDoc(doc(db, "users", currentUser.uid))).data();
        document.getElementById("edit-fullname").value = data.fullName || "";
        document.getElementById("edit-age").value = data.age || "";
        document.getElementById("edit-city").value = data.city || "";
        document.getElementById("edit-email").value = currentUser.email || "";
        document.getElementById("edit-phone").value = data.phone || "";
        document.getElementById("edit-profile-pic").src = data.profile || "images/user-placeholder.png";
        document.getElementById("edit-profile-popup").classList.remove("hidden");
      });
    }

    document.getElementById("close-edit-popup")?.addEventListener("click", () => {
      document.getElementById("edit-profile-popup").classList.add("hidden");
    });
    document.getElementById("cancel-edit-btn")?.addEventListener("click", () => {
      document.getElementById("edit-profile-popup").classList.add("hidden");
    });

    document.getElementById("save-profile-btn")?.addEventListener("click", async () => {
      const fullName = document.getElementById("edit-fullname").value.trim();
      const age = document.getElementById("edit-age").value.trim();
      const city = document.getElementById("edit-city").value.trim();
      const phone = document.getElementById("edit-phone").value.trim();
      const profile = document.getElementById("edit-profile-pic").src;

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          fullName,
          age,
          city,
          phone,
          profile
        });
        alert("Profile updated successfully!");
        document.getElementById("edit-profile-popup").classList.add("hidden");
      } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to update profile.");
      }
    });
  });
}

function loadVideosWithAds() {
  onSnapshot(collection(db, "videos"), (snapshot) => {
    videoGrid.innerHTML = "";
    if (snapshot.empty) return videoGrid.innerHTML = "<p>No videos uploaded yet.</p>";
    const docs = snapshot.docs;
    docs.forEach((doc, index) => {
      renderVideo(doc.id, doc.data());
      if ((index + 1) % 3 === 0) insertAdBanner();
    });
  });
}

function insertAdBanner() {
  const ad = document.createElement("div");
  ad.className = "ad-banner";
  ad.innerHTML = `<img src="images/ad-placeholder.jpg" alt="Ad Banner">`;
  videoGrid.appendChild(ad);
}

function renderVideo(id, data) {
  const card = document.createElement("div");
  card.className = "video-card";
  card.innerHTML = `
    <img src="${data.thumbnail}" class="video-thumb" alt="${data.title}" />
    <div class="video-meta">
      <div class="video-title">${data.title}</div>
      <div class="video-sub">
        <img src="images/user-placeholder.png" class="uploader-icon" />
        <span>Uploaded by Admin</span>
      </div>
      <div class="video-stats">
        <div>
          <span>▶ ${data.views || 0}</span>
          <span class="like-btn" data-id="${id}">❤️ ${data.likes?.length || 0}</span>
          <span class="comment-btn" data-id="${id}">💬 ${data.comments?.length || 0}</span>
        </div>
        <span class="video-duration">${data.duration || "--:--"}</span>
      </div>
    </div>
  `;

  card.querySelector(".video-thumb").onclick = () => openPopup(id, data);
  card.querySelector(".like-btn").onclick = (e) => handleLike(e, id, data);
  card.querySelector(".comment-btn").onclick = () => openPopup(id, data);
  videoGrid.appendChild(card);
}

function handleLike(e, videoId, data) {
  e.stopPropagation();
  const likes = data.likes || [];
  const liked = likes.includes(currentUser.uid);

  const videoRef = doc(db, "videos", videoId);
  const updatedLikes = liked
    ? likes.filter(uid => uid !== currentUser.uid)
    : [...likes, currentUser.uid];

  updateDoc(videoRef, { likes: updatedLikes });
}

function openPopup(id, data) {
  popup.classList.remove("hidden");
  popupVideo.src = data.videoURL;
  popupTitle.textContent = data.title;
  popupVideo.play();

  const videoRef = doc(db, "videos", id);
  updateDoc(videoRef, { views: increment(1) });

  onSnapshot(videoRef, (docSnap) => {
    const newData = docSnap.data();
    popupViews.textContent = `${newData.views || 0} Views`;
    popupLikes.textContent = `${newData.likes?.length || 0} Likes`;
    popupComments.textContent = `${newData.comments?.length || 0} Comments`;
    renderComments(newData.comments || []);
  });

  sendComment.onclick = async () => {
    const text = commentInput.value.trim();
    if (!text) return;
    const newComment = `${currentUser.email}: ${text}`;
    await updateDoc(videoRef, {
      comments: arrayUnion(newComment)
    });
    commentInput.value = "";
  };
}

function renderComments(comments) {
  commentsList.innerHTML = "";
  comments.forEach((comment) => {
    const p = document.createElement("p");
    p.textContent = comment;
    commentsList.appendChild(p);
  });
}

closeVideo.onclick = () => {
  popup.classList.add("hidden");
  popupVideo.pause();
  popupVideo.src = "";
};