// ====== FIREBASE IMPORTS ======
import { auth, db } from "../firebase/firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  setDoc,
  doc,
  getDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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


// ====== NAVBAR SCROLL BG TOGGLE ======
window.addEventListener("scroll", () => {
  const navbar = document.getElementById("navbar");
  if (window.scrollY > 50) {
    navbar.classList.add("scrolled");
    navbar.style.padding = "10px 20px";
  } else {
    navbar.classList.remove("scrolled");
    navbar.style.padding = "15px 30px";
  }
});


// ====== SMOOTH SCROLL + ACTIVE NAV LINK ======
const navLinks = document.querySelectorAll(".nav-link");
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navLinks.forEach((link) => link.classList.remove("active"));
    link.classList.add("active");
    const target = document.getElementById(link.getAttribute("href").substring(1));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// ====== MODAL OPEN/CLOSE HANDLING ======
const getStartedBtn = document.getElementById("getStartedBtn");
const loginModal = document.getElementById("loginModal");
const signupModal = document.getElementById("signupModal");

if (getStartedBtn) {
  getStartedBtn.addEventListener("click", () => {
    if (loginModal) loginModal.classList.remove("hidden");
  });
}


window.closeModal = function (modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("hidden");
};

window.openModal = function (modalId) {
  if (loginModal) loginModal.classList.add("hidden");
  if (signupModal) signupModal.classList.add("hidden");
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("hidden");
};

// ====== LOGIN FUNCTION ======
window.loginUser = async function () {
  const input = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const message = document.getElementById("loginMessage");

  if (!input || !password) {
    message.style.color = "red";
    message.innerText = "All fields are required.";
    return;
  }

  message.style.color = "#C6FF00";
  message.innerText = "Checking credentials...";

  // ✅ Try logging in as email (Firebase Auth)
  if (input.includes("@")) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, input, password);
      const uid = userCredential.user.uid;
      const docSnap = await getDoc(doc(db, "users", uid));

      if (docSnap.exists()) {
        const role = docSnap.data().role;
        message.style.color = "green";
        message.innerText = "✅ Login successful! Redirecting...";
        setTimeout(() => {
          if (role === "player") window.location.href = "player-home.html";
          else if (role === "fan") window.location.href = "fan-home.html";
          else if (role === "admin") window.location.href = "admin-dashboard.html";
          else message.innerText = "Unknown user role.";
        }, 1000);
        return;
      } else {
        message.style.color = "red";
        message.innerText = "❌ User not found.";
      }
    } catch (err) {
      console.warn("Firebase login failed:", err.message);
    }
  }

  // ✅ Fallback: check Firestore admins collection (by phone + password)
  try {
    const adminSnap = await getDocs(collection(db, "admins"));
    let matched = false;

    adminSnap.forEach(doc => {
      const data = doc.data();
      if (
        data.phone?.trim() === input &&
        data.password?.trim() === password
      ) {
        matched = true;
      }
    });

    if (matched) {
      message.style.color = "green";
      message.innerText = "✅ Admin login successful!";
        // ✅ Save fake session to prevent redirect
  localStorage.setItem("adminLoggedIn", "true");
      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 1000);
    } else {
      message.style.color = "red";
      message.innerText = "❌ Invalid phone or password.";
    }
  } catch (err) {
    console.error("Admin login error:", err.message);
    message.style.color = "red";
    message.innerText = "❌ Login failed. Try again.";
  }
};


// ====== SIGN UP FUNCTION ======
window.signupUser = async function () {
  const name = document.getElementById("signupName").value.trim();
  const age = document.getElementById("signupAge").value.trim();
  const city = document.getElementById("signupCity").value;
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const pass = document.getElementById("signupPassword").value;
  const confirm = document.getElementById("signupConfirm").value;
  const role = document.getElementById("signupRole").value;
  const message = document.getElementById("signupMessage");

  if (!name || !age || !city || !email || !phone || !pass || !confirm || !role) {
    message.style.color = "red";
    message.innerText = "All fields are required.";
    return;
  }

  if (phone.length !== 11 || isNaN(phone)) {
    message.style.color = "red";
    message.innerText = "Phone number must be 11 digits.";
    return;
  }

  if (pass.length < 6) {
    message.style.color = "red";
    message.innerText = "Password must be at least 6 characters.";
    return;
  }

  if (pass !== confirm) {
    message.style.color = "red";
    message.innerText = "Passwords do not match.";
    return;
  }

  message.style.color = "#C6FF00";
  message.innerText = "Creating account... ⏳";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;

    await setDoc(doc(db, "users", uid), {
      fullName: name,
      age: age,
      city: city,
      email: email,
      phone: phone,
      role: role,
      points: 0,
      teammates: []
    });

    message.style.color = "green";
    message.innerText = "✅ Account created successfully!";
    
    setTimeout(() => {
      closeModal('signupModal');
      openModal('loginModal');
    }, 1500);
  } catch (error) {
    console.error("Signup error:", error);
    message.style.color = "red";
    message.innerText = "❌ " + error.message;
  }
};
window.addEventListener("orientationchange", () => {
  document.body.style.height = window.innerHeight + "px";
});
async function loadUpcomingChampionships() {
  const container = document.getElementById("upcomingEventsContainer");
  const snapshot = await getDocs(collection(db, "championship_upcoming"));

  snapshot.forEach(doc => {
    const data = doc.data();
    const card = document.createElement("div");
    card.className = "event-card";

    card.innerHTML = `
      <img src="${data.image}" alt="${data.title}" class="event-image" />
      <h3 class="event-title">${data.title}</h3>
    `;

    container.appendChild(card);
  });
}

window.addEventListener("DOMContentLoaded", loadUpcomingChampionships);