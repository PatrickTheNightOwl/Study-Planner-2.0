import {
  getCurrentUser,
  logOut,
  changeEmail,
  changePassword,
} from "./firebaseConfig.js";

// ========================================
// ELEMENTS
// ========================================

const currentEmail = document.getElementById("current-email");
const currentPasswordDisplay = document.getElementById("current-password");

const changeEmailButton = document.getElementById("change-email-btn");
const changePasswordButton = document.getElementById("change-password-btn");
const logOutButton = document.getElementById("logout-btn");

const modalOverlay = document.getElementById("modal-overlay");
const closeModalButton = document.getElementById("cancel-btn");
const saveNewInfoButton = document.getElementById("save-btn");

const currentInfomation = document.getElementById("current-information");

const newInfoInput = document.getElementById("new-info-input");
const currentPasswordInput = document.getElementById("current-password-input");
if (
  !currentEmail ||
  !currentPasswordDisplay ||
  !changeEmailButton ||
  !changePasswordButton ||
  !logOutButton ||
  !modalOverlay ||
  !closeModalButton ||
  !saveNewInfoButton ||
  !currentInfomation ||
  !newInfoInput ||
  !currentPasswordInput
) {
  throw new Error("Settings UI elements not found!");
}
// ========================================
// STATE
// ========================================

let currentUserEmail = null;

// ========================================
// INITIALIZATION
// ========================================

async function initializeSettings() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      console.log("No authenticated user");
      return;
    }

    currentUserEmail = user.email;

    renderInformations();
  } catch (error) {
    console.error("Failed to initialize settings:", error);
    alert("Failed to load user information.");
  }
}

function renderInformations() {
  currentEmail.textContent = `Email: ${currentUserEmail}`;
  currentPasswordDisplay.textContent = "Password: hidden";
}

await initializeSettings();

// ========================================
// VALIDATION
// ========================================

function emailFilter(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return "Please enter a valid email!";
  }

  return true;
}

function passwordFilter(password) {
  const passwordLength = password.length;

  const hasUpper = (str) => /[A-Z]/.test(str);
  const hasLower = (str) => /[a-z]/.test(str);
  const hasUnderscore = (str) => /_/.test(str);
  const hasRestricted = (str) => /[^a-zA-Z0-9_]/.test(str);

  if (passwordLength < 8 || passwordLength > 12) {
    return "Password must contain 8-12 characters!";
  }

  if (!hasUpper(password)) {
    return "Password must contain at least 1 uppercase!";
  }

  if (!hasLower(password)) {
    return "Password must contain at least 1 lowercase!";
  }

  if (!hasUnderscore(password)) {
    return "Password must contain at least 1 underscore (_)";
  }

  if (hasRestricted(password)) {
    return "Password must not contain any character except letters, numbers, and underscore!";
  }

  return true;
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function openModal(type) {
  currentInfomation.dataset.info = type;

  currentPasswordInput.classList.remove("hidden");
  currentPasswordInput.value = "";

  newInfoInput.value = "";

  if (type === "email") {
    currentInfomation.textContent = `Current Email: ${currentUserEmail}`;

    newInfoInput.type = "email";
    newInfoInput.placeholder = "Enter a new email address";
  } else {
    currentInfomation.textContent = "Change your account password";

    newInfoInput.type = "password";
    newInfoInput.placeholder = "Enter a new password";
  }

  modalOverlay.classList.remove("hidden");
  currentPasswordInput.focus();
}

function closeModal() {
  modalOverlay.classList.add("hidden");

  currentPasswordInput.value = "";
  currentPasswordInput.classList.add("hidden");

  newInfoInput.value = "";
}

// ========================================
// EVENT LISTENERS
// ========================================

changeEmailButton.addEventListener("click", () => {
  openModal("email");
});

changePasswordButton.addEventListener("click", () => {
  openModal("password");
});

closeModalButton.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

// ========================================
// SAVE NEW INFORMATION
// ========================================

saveNewInfoButton.addEventListener("click", async () => {
  const type = currentInfomation.dataset.info;

  const newValue = newInfoInput.value.trim();
  const currentPassword = currentPasswordInput.value;

  if (!type) {
    alert("Please select an action first.");
    return;
  }

  if (!currentPassword) {
    alert("Please enter your current password!");
    return;
  }

  if (!newValue) {
    alert(
      type === "email"
        ? "Please enter new email address!"
        : "Please enter new password!"
    );
    return;
  }

  // Validate new information
  const validation =
    type === "email" ? emailFilter(newValue) : passwordFilter(newValue);

  if (validation !== true) {
    alert(validation);
    return;
  }

  try {
    saveNewInfoButton.disabled = true;
    saveNewInfoButton.textContent = "Saving...";

    if (type === "email") {
      await changeEmail(newValue, currentPassword);

      alert(
        "Verification email sent. Please check your inbox to confirm the new email address."
      );
    } else {
      await changePassword(currentPassword, newValue);

      alert("Password updated successfully!");
    }

    closeModal();

    // Refresh displayed information
    const user = await getCurrentUser();

    if (user) {
      currentUserEmail = user.email;
      renderInformations();
    }
  } catch (error) {
    console.error("Failed to update user information:", error);

    if (
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-credential"
    ) {
      alert("Incorrect current password!");
    } else if (error.code === "auth/email-already-in-use") {
      alert("This email is already being used!");
    } else if (error.code === "auth/invalid-email") {
      alert("Invalid email address!");
    } else if (error.code === "auth/weak-password") {
      alert("Your new password is too weak!");
    } else if (error.code === "auth/requires-recent-login") {
      alert("Please log in again before changing your information.");
    } else {
      alert(error.message || "Something went wrong. Please try again.");
    }
  } finally {
    saveNewInfoButton.disabled = false;
    saveNewInfoButton.textContent = "Save";
  }
});

// ========================================
// LOG OUT
// ========================================

logOutButton.addEventListener("click", async () => {
  try {
    await logOut();
  } catch (error) {
    console.error("Logout failed:", error);
  }
});
