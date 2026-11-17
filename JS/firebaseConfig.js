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
const db = firebase.firestore();
// functions
async function getUserSubjectsRef() {
  const currentUserId = await getCurrentUser();
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
  const currentUserId = await getCurrentUser();

  if (!currentUserId) {
    throw new Error("User is not authenticated");
  }

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
async function getCurrentUserId() {
  let currentUser = null;

  auth.onAuthStateChanged((user) => {
    currentUser = user;

    if (currentUser) {
      return currentUser.uid;
    } else {
      console.log("No authenticated user");
    }
  });
}
const subjectsList = await getUserSubjects();
const subjectsRef = await getUserSubjectsRef();
const tasksList = await getUserTasks();
const tasksRef = await getUserTasksRef();
