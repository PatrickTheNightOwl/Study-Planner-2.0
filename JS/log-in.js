// Initialize
const logInForm = document.getElementById("form");
const inputEmail = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");

// Functions and Events
logInForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const email = inputEmail.value;
  const password = inputPassword.value;

  auth
    .signInWithEmailAndPassword(email, password)
    .then(() => {
      alert("Logging in succeeded");
      const homePage = "../HTML/dashboard";
      window.location.replace(homePage);
    })
    .catch((error) => {
      alert(error.message);
    });
});
