import {
  subjectsList,
  subjectsRef,
  tasksList,
  tasksRef,
  dataReady,
  db,
} from "./firebaseConfig.js";

// ========================================
// 1. DATA / BUSINESS LOGIC
// ========================================

async function deleteSubject(subjectId) {
  // Lấy các task thuộc subject
  const relatedTasks = await tasksRef.where("subjectId", "==", subjectId).get();

  // Tạo batch
  const batch = db.batch();

  // Xóa các task liên quan
  relatedTasks.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  console.log("Deleting subject:", subjectId, typeof subjectId);

  // Xóa subject
  batch.delete(subjectsRef.doc(subjectId));

  // Commit tất cả
  await batch.commit();

  // Cập nhật JS Arrays
  subjectsList.splice(
    subjectsList.findIndex((subject) => subject.id === subjectId),
    1
  );

  tasksList.splice(
    0,
    tasksList.length,
    ...tasksList.filter((task) => task.subjectId !== subjectId)
  );
}

async function saveNewSubject(subjectData) {
  const docRef = await subjectsRef.add(subjectData);

  subjectsList.push({
    ...subjectData,
    id: docRef.id,
  });

  return docRef.id;
}

export async function assistantDataSolver(data) {
  await dataReady;

  const subjectsArray = data.subjects;
  const newSubjectData = [];

  for (const subject of subjectsArray) {
    if (!subject.subjectName) {
      throw new Error("subjectName not found");
    }

    const subjectName = subject.subjectName.trim();

    // Check whether the subject already exists
    const existingSubject = subjectsList.find(
      (item) => item.name.trim().toLowerCase() === subjectName.toLowerCase()
    );

    if (existingSubject) {
      // Reuse existing subject ID
      newSubjectData.push({
        subjectId: existingSubject.id,
        name: existingSubject.name,
        color: existingSubject.color,
      });

      continue;
    }

    // Create a new subject if it doesn't exist
    const newSubject = {
      name: subjectName,
      color: subject.colorName || "#9ca3af",
    };

    const subjectId = await saveNewSubject(newSubject);

    newSubjectData.push({
      subjectId: subjectId,
      ...newSubject,
    });
  }

  return newSubjectData;
}

// ========================================
// 2. UI LOGIC
// ========================================

function initializeSubjectUI() {
  // DOM ELEMENTS
  const subjectsContainer = document.getElementById("subjects-container");
  const addSubjectButton = document.getElementById("add-subject");
  const subjectModalOverlay = document.getElementById("modal-overlay");
  const closeModalButton = document.getElementById("cancel-btn");
  const deleteSubjectButton = document.getElementById("del-btn");
  const saveNewSubjectButton = document.getElementById("save-btn");
  const subjectNameInput = document.getElementById("subject-name");
  const colorContainer = document.getElementById("color-recommendation");

  let selectedColor = "#9ca3af";
  let editingSubjectId = null;

  // HELPER FUNCTIONS
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // RENDER LOGIC

  async function renderSubjects() {
    subjectsContainer.innerHTML = `
    <p class="loading-notification">
      <span class="loading-icon">⏳</span>
      Loading subjects...
    </p>
  `;

    // Chờ cả Firebase và thời gian loading tối thiểu
    await Promise.all([dataReady, delay(400)]);

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
        <article
          class="subject-card"
          data-subject-id="${escapeHTML(subject.id)}"
          style="--subject-color:${escapeHTML(subject.color)}"
        >
          <h3>${escapeHTML(subject.name)}</h3>
          <p>${remainingTasks} task${
          remainingTasks !== 1 ? "s" : ""
        } remaining</p>
        </article>
      `;
      })
      .join("");
  }

  // MODAL LOGIC

  function openEditModal(subject) {
    editingSubjectId = subject.id;

    subjectNameInput.value = subject.name;
    selectedColor = subject.color.toLowerCase();

    colorContainer.querySelectorAll(".color").forEach((color) => {
      color.classList.toggle(
        "selected",
        color.dataset.color.toLowerCase() === selectedColor
      );
    });

    saveNewSubjectButton.textContent = "OK";

    subjectModalOverlay.classList.remove("hidden");
    subjectNameInput.focus();
  }
  function closeModal() {
    subjectModalOverlay.classList.add("hidden");
  }

  function resetForm() {
    editingSubjectId = null;

    subjectNameInput.value = "";
    selectedColor = "#9ca3af";

    colorContainer.querySelectorAll(".color").forEach((color) => {
      color.classList.toggle(
        "selected",
        color.dataset.color.toLowerCase() === selectedColor
      );
    });

    saveNewSubjectButton.textContent = "Create";
  }

  function selectColor(button) {
    selectedColor = button.dataset.color.toLowerCase();

    colorContainer.querySelectorAll(".color").forEach((color) => {
      color.classList.toggle("selected", color === button);
    });
  }

  // EVENT LISTENERS
  subjectsContainer.addEventListener("click", (event) => {
    const subjectCard = event.target.closest(".subject-card");

    if (!subjectCard) return;

    const subjectId = subjectCard.dataset.subjectId;

    const subject = subjectsList.find((item) => item.id === subjectId);

    if (!subject) return;

    openEditModal(subject);
  });
  colorContainer.addEventListener("click", (event) => {
    const colorButton = event.target.closest(".color");

    if (colorButton) selectColor(colorButton);
  });

  addSubjectButton.addEventListener("click", () => {
    resetForm();

    subjectModalOverlay.classList.remove("hidden");
    subjectNameInput.focus();
  });
  closeModalButton.addEventListener("click", closeModal);

  subjectModalOverlay.addEventListener("click", (event) => {
    if (event.target === subjectModalOverlay) closeModal();
  });

  deleteSubjectButton.addEventListener("click", async () => {
    const name = subjectNameInput.value.trim();

    const index = editingSubjectId
      ? subjectsList.findIndex((subject) => subject.id === editingSubjectId)
      : subjectsList.findIndex(
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

    console.log("Subject ID:", deletedSubjectId);
    console.log("Type:", typeof deletedSubjectId);

    await deleteSubject(deletedSubjectId);

    renderSubjects();
    resetForm();
    closeModal();

    alert("Subject deleted.");
  });

  saveNewSubjectButton.addEventListener("click", async () => {
    const name = subjectNameInput.value.trim();

    if (name === "") {
      alert("Please enter the subject name.");
      return;
    }

    // Check duplicate, excluding the subject being edited
    const duplicate = subjectsList.some(
      (subject) =>
        subject.id !== editingSubjectId &&
        subject.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      alert("That subject already exists.");
      return;
    }

    const subjectData = {
      name: name,
      color: selectedColor,
    };

    try {
      if (editingSubjectId) {
        // EDIT EXISTING SUBJECT

        await subjectsRef.doc(editingSubjectId).update(subjectData);

        const subjectIndex = subjectsList.findIndex(
          (subject) => subject.id === editingSubjectId
        );

        if (subjectIndex !== -1) {
          subjectsList[subjectIndex] = {
            ...subjectData,
            id: editingSubjectId,
          };
        }

        alert("Subject updated.");
      } else {
        // CREATE NEW SUBJECT

        await saveNewSubject(subjectData);

        alert("Subject created.");
      }

      resetForm();
      closeModal();

      await renderSubjects();
    } catch (error) {
      console.error("Failed to save subject:", error);
      alert("Could not save subject. Please try again.");
    }
  });

  // INITIALIZATION

  async function initializeSubjects() {
    try {
      await dataReady;
      renderSubjects();
    } catch (error) {
      console.error("Failed to initialize subjects:", error);
    }
  }

  resetForm();
  initializeSubjects();
}

// ========================================
// 3. CONDITIONAL UI INITIALIZATION
// ========================================

if (
  typeof document !== "undefined" &&
  document.getElementById("subjects-container")
) {
  initializeSubjectUI();
}
