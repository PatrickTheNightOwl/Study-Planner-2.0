const currentUserContainer = document.getElementById("currentUser");
const getStartedNavigation = document.getElementById("cta");

// if (currentUser) {
//   currentUserContainer.innerHTML = `
//         <p id="current-user-email">${currentUser.email}</p>
//         <button id="btn-logout">Log Out</button>
//     `;

//   getStartedNavigation.innerHTML = `
//         <a href="dashboard.html" class="btn-signup cta-btn">
//             Go to Dashboard
//         </a>
//     `;
// } else {
//   currentUserContainer.innerHTML = `
//         <a href="authentication-login.html" class="btn-login">Log In</a>
//         <a href="authentication-signup.html" class="btn-signup">Sign Up</a>
//     `;
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserContainer.innerHTML = `
        <p id="current-user-email">${user.email}</p>
        <button id="btn-logout">Log Out</button>
    `;

    getStartedNavigation.innerHTML = `
        <a href="dashboard.html" class="btn-signup cta-btn">
            Go to Dashboard
        </a>
    `;
  } else {
    currentUserContainer.innerHTML = `
         <a href="authentication-login.html" class="btn-login">Log In</a>
        <a href="authentication-signup.html" class="btn-signup">Sign Up</a>
    `;
  }
});
const logOutButton = document.getElementById("btn-logout");
if (logOutButton) {
  logOutButton.addEventListener("click", () => {
    localStorage.removeItem("currentUserId");
    window.location.replace("index.html");
  });
}
