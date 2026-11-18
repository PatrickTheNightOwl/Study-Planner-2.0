import {
  subjectsList,
  subjectsRef,
  tasksList,
  tasksRef,
  dataReady,
} from "./firebaseConfig.js";

async function initializeSubjects() {
  try {
    await dataReady;

    renderSubjects();
  } catch (error) {
    console.error("Failed to initialize subjects:", error);
  }
}

initializeSubjects();
const subjectsContainer = document.getElementById("subjects-container");
const addSubjectButton = document.getElementById("add-subject");
const subjectModalOverlay = document.getElementById("modal-overlay");
const closeModalButton = document.getElementById("cancel-btn");
const deleteSubjectButton = document.getElementById("del-btn");
const saveNewSubjectButton = document.getElementById("save-btn");
const subjectNameInput = document.getElementById("subject-name");
const colorContainer = document.getElementById("color-recommendation");
let selectedColor = "#9ca3af";

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function renderSubjects() {
  subjectsContainer.innerHTML = `
    <p class="loading-notification">
      <span class="loading-icon">⏳</span>
      Loading subjects...
    </p>
  `;
  await dataReady;
  if (subjectsList.length === 0) {
    subjectsContainer.innerHTML = `
      <p class="no-task-notification">
        No subjects yet. Add your first subject to start organizing tasks.
      </p>
    `;
    return;
  }

  subjectsContainer.innerHTML = subjectsList
    .map((subject) => {
      const remainingTasks = tasksList.filter(
        (task) => task.subjectId === subject.id
      ).length;

      return `
        <article class="subject-card" style="--subject-color:${escapeHTML(
          subject.color
        )}">
          <h3>${escapeHTML(subject.name)}</h3>
          <p>${remainingTasks} task${
        remainingTasks !== 1 ? "s" : ""
      } remaining</p>
        </article>
      `;
    })
    .join("");
}

function closeModal() {
  subjectModalOverlay.classList.add("hidden");
}

function resetForm() {
  subjectNameInput.value = "";
  selectedColor = "#9ca3af";
  colorContainer.querySelectorAll(".color").forEach((color) => {
    color.classList.toggle(
      "selected",
      color.dataset.color.toLowerCase() === selectedColor
    );
  });
}

function selectColor(button) {
  selectedColor = button.dataset.color.toLowerCase();
  colorContainer.querySelectorAll(".color").forEach((color) => {
    color.classList.toggle("selected", color === button);
  });
}

colorContainer.addEventListener("click", (event) => {
  const colorButton = event.target.closest(".color");
  if (colorButton) selectColor(colorButton);
});

renderSubjects();
resetForm();

addSubjectButton.addEventListener("click", () => {
  console.log("createsubject");
  subjectModalOverlay.classList.remove("hidden");
  subjectNameInput.focus();
});

closeModalButton.addEventListener("click", closeModal);

subjectModalOverlay.addEventListener("click", (event) => {
  if (event.target === subjectModalOverlay) closeModal();
});
async function deleteTask(taskId) {
  await tasksRef.doc(taskId).delete();

  tasksList = tasksList.filter((task) => task.id !== taskId);
}
async function deleteSubject(subjectId) {
  // Lấy các task thuộc subject
  const relatedTasks = await tasksRef.where("subjectId", "==", subjectId).get();

  // Tạo batch
  const batch = db.batch();

  // Xóa các task liên quan
  relatedTasks.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // Xóa subject
  batch.delete(subjectsRef.doc(subjectId));

  // Commit tất cả
  await batch.commit();

  // Cập nhật JS Arrays
  subjectsList.splice(
    subjectsList.findIndex((subject) => subject.id === subjectId),
    1
  );

  for (let i = tasksList.length - 1; i >= 0; i--) {
    if (tasksList[i].subjectId === subjectId) {
      tasksList.splice(i, 1);
    }
  }
}
deleteSubjectButton.addEventListener("click", () => {
  const name = subjectNameInput.value.trim();
  const index = subjectsList.findIndex(
    (subject) => subject.name.toLowerCase() === name.toLowerCase()
  );

  if (name === "") {
    alert("Please enter the subject name.");
    return;
  }

  if (index === -1) {
    alert("No subject found. Please check the subject name again.");
    return;
  }

  const deletedSubjectId = subjectsList[index].id;
  deleteSubject(deletedSubjectId);
  renderSubjects();
  resetForm();
  closeModal();
  alert("Subject deleted.");
});

async function saveNewSubject(subjectData) {
  const docRef = await subjectsRef.add(subjectData);
  subjectsList.push({
    id: docRef.id,
    ...subjectData,
  });
}
saveNewSubjectButton.addEventListener("click", () => {
  const name = subjectNameInput.value.trim();

  if (name === "") {
    alert("Please enter the subject name.");
    return;
  }
  if (
    subjectsList.some(
      (subject) => subject.name.trim().toLowerCase() === name.toLowerCase()
    )
  ) {
    alert("That subject already exists.");
    return;
  }

  const nextId = subjectsList.length
    ? subjectsList[subjectsList.length - 1].id + 1
    : 1;

  const newSubject = {
    id: nextId,
    name: name,
    color: selectedColor,
  };
  saveNewSubject(newSubject);
  renderSubjects();
  resetForm();
  closeModal();
  alert("Subject created.");
});
