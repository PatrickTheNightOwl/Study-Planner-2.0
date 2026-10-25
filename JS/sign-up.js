// Button Sign Up nếu user vượt qua các điều kiện, sẽ đưa new data vào database rồi direct user tới Log In
// Button Log In nếu user vượt qua chốt kiểm tra, sẽ từ đó lấy data ra lắp vào, rồi direct user tới Dashboard

// Initialize
const signUpForm = document.getElementById("form");
const inputEmail = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");
const switchShowHide = document.getElementById("hidden-switch");
const userColl = db.collection("users");
//Function
function emailFilter(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Regex, giải nghĩa :
  // Bắt đầu bằng một hoặc nhiều ký tự không phải khoảng trắng/@,
  // sau đó có @, sau đó có một hoặc nhiều ký tự không phải khoảng trắng/@,
  // sau đó có dấu chấm,
  // sau đó có một hoặc nhiều ký tự không phải khoảng trắng/@, và kết thúc chuỗi.

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
// Functions and Events
signUpForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const email = inputEmail.value;
  const password = inputPassword.value;

  // Validation
  const emailCheck = emailFilter(email);
  const passwordCheck = passwordFilter(password);

  if (emailCheck !== true) {
    alert(emailCheck);
    return;
  } else if (passwordCheck !== true) {
    alert(passwordCheck);
    return;
  } else {
    auth
      .createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        userColl.doc(user.uid).set({
          email: user.email,
          subjects: [],
          tasks: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      })
      .then(() => {
        alert("Signing up succeeded");
        const loginPage = "../HTML/authentication-login.html";
        window.location.replace(loginPage);
      })
      .catch((error) => {
        alert(error.message);
      });
  }
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
