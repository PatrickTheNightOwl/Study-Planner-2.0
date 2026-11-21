// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDy3jEO-mzlOa7fGlW_J8z_iY-3UPiG9VE",
  authDomain: "final-project-jsi13.firebaseapp.com",
  projectId: "final-project-jsi13",
  storageBucket: "final-project-jsi13.firebasestorage.app",
  messagingSenderId: "142329116888",
  appId: "1:142329116888:web:3baca51c2291733c757fad",
  measurementId: "G-K2S5T4GC4F",
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
export const db = firebase.firestore();
// functions
async function logOut() {
  try {
    await auth.signOut();

    console.log("Logged out successfully");

    window.location.href = "../HTML/index.html";
  } catch (error) {
    console.error("Logout failed:", error);
  }
}
export function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}
async function reauthenticateUser(currentPassword) {
  const user = getCurrentUser();

  if (!user) {
    throw new Error("No authenticated user");
  }

  const credential = firebase.auth.EmailAuthProvider.credential(
    user.email,
    currentPassword
  );

  await user.reauthenticateWithCredential(credential);

  return user;
}
async function changeEmail(newEmail, currentPassword) {
  try {
    const user = await reauthenticateUser(currentPassword);

    await user.verifyBeforeUpdateEmail(newEmail);

    console.log("Verification email sent!");
  } catch (error) {
    console.error("Email change failed:", error);
  }
}
async function changePassword(currentPassword, newPassword) {
  try {
    const user = await reauthenticateUser(currentPassword);

    await user.updatePassword(newPassword);

    console.log("Password updated successfully!");
  } catch (error) {
    console.error("Password update failed:", error);
  }
}
function getCurrentUserId() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(
      (user) => {
        unsubscribe();

        if (user) {
          resolve(user.uid);
        } else {
          reject(new Error("No authenticated user"));
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}
async function getUserSubjectsRef() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    throw new Error("User is not authenticated");
  }
  return db.collection("users").doc(currentUserId).collection("subjects");
}
async function getUserSubjects() {
  const subjectsRef = await getUserSubjectsRef();
  const snapshot = await subjectsRef.get();
  const subjects = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return subjects;
}
async function getUserTasksRef() {
  const currentUserId = await getCurrentUserId();
  // if (!currentUserId) {
  //   throw new Error("User is not authenticated");
  // }

  return db.collection("users").doc(currentUserId).collection("tasks");
}
async function getUserTasks() {
  const tasksRef = await getUserTasksRef();
  const snapshot = await tasksRef.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
export let subjectsList = [];
export let subjectsRef;
export let tasksList = [];
export let tasksRef;
async function defineListAndRef() {
  subjectsList = await getUserSubjects();
  subjectsRef = await getUserSubjectsRef();
  tasksList = await getUserTasks();
  tasksRef = await getUserTasksRef();
}
export const dataReady = defineListAndRef();
