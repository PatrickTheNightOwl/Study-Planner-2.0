// Button Sign Up nếu user vượt qua các điều kiện, sẽ đưa new data vào database rồi direct user tới Log In
// Button Log In nếu user vượt qua chốt kiểm tra, sẽ từ đó lấy data ra lắp vào, rồi direct user tới Dashboard

// Initialize
const signUpForm = document.getElementById("form");
const inputEmail = document.getElementById("input-email");
const inputPassword = document.getElementById("input-password");
const switchShowHide = document.getElementById("hidden-switch");
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
signUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = inputEmail.value.trim();
  const password = inputPassword.value;

  // Validation
  const emailCheck = emailFilter(email);
  const passwordCheck = passwordFilter(password);

  if (emailCheck !== true) {
    alert(emailCheck);
    return;
  }

  if (passwordCheck !== true) {
    alert(passwordCheck);
    return;
  }

  try {
    // 1. Create account
    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );

    const user = userCredential.user;

    // 2. Create user document
    await db.collection("users").doc(user.uid).set({
      email: user.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Sign out before redirecting to Login
    await auth.signOut();

    // 4. Redirect
    alert("Signing up succeeded");

    window.location.replace("../HTML/authentication-login.html");
  } catch (error) {
    console.error("Sign up error:", error);
    alert(error.message);
  }
});
