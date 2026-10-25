// Initialize
const logInForm = document.getElementById("form");
const inputEmail = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");
const switchShowHide = document.getElementById("hidden-switch");
// Functions and Events
logInForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const email = inputEmail.value;
  const password = inputPassword.value;

  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("Logging in succeeded");
      const homePage = "../HTML/dashboard.html";
      window.location.replace(homePage);
    })
    .catch((error) => {
      alert(error.message);
    });
});
switchShowHide.addEventListener("click", () => {
  if (switchShowHide.getAttribute("mode") == "off") {
    switchShowHide.style.backgroundImage =
      "url('../Assets/hide-password-button.jpg')";
    switchShowHide.setAttribute("mode", "on");
    inputPassword.setAttribute("type", "text");
  } else {
    switchShowHide.style.backgroundImage =
      "url('../Assets/show-password-button.jpg')";
    switchShowHide.setAttribute("mode", "off");
    inputPassword.setAttribute("type", "password");
  }
});
