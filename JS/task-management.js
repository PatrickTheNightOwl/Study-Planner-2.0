import {
  subjectsList,
  subjectsRef,
  tasksList,
  tasksRef,
  dataReady,
  db,
} from "./firebaseConfig.js";

// ==========================================
// 1. BUSINESS LOGIC - KHÔNG PHỤ THUỘC DOM
// ==========================================

async function deleteTaskById(id) {
  await tasksRef.doc(id).delete();

  const index = tasksList.findIndex((task) => task.id === id);

  if (index !== -1) {
    tasksList.splice(index, 1);
  }
}

async function saveNewTask(taskData) {
  const docRef = await tasksRef.add(taskData);

  tasksList.push({
    ...taskData,
    id: docRef.id,
  });
}

export async function solveAssistantData(assistantData, newSubjectData) {
  const subjects = assistantData.subjects;
  const newTasks = [];

  for (const subj of subjects) {
    for (const task of subj.tasks) {
      const matchedSubject = newSubjectData.find(
        (subject) =>
          subject.name.trim().toLowerCase() ===
          subj.subjectName.trim().toLowerCase()
      );

      if (!matchedSubject) {
        throw new Error(`Subject not found: ${subj.subjectName}`);
      }

      // Convert AI task schema into app task schema
      const taskData = {
        task: task.taskName,
        subjectId: matchedSubject.subjectId,
        deadlineDate: task.deadlineDate,
        deadlineTime: task.deadlineTime,
        duration: task.duration,
        priority: task.priority.toLowerCase(),
      };

      newTasks.push(taskData);

      await saveNewTask(taskData);
    }
  }

  return newTasks;
}

// ==========================================
// 2. UI INITIALIZATION
// ==========================================

function initializeTaskUI() {
  const tasksContainer = document.getElementById("tasks-container");
  const taskSearchInput = document.getElementById("task-search");
  const addTaskButton = document.getElementById("add-task");
  const taskModalOverlay = document.getElementById("modal-overlay");
  const closeModalButton = document.getElementById("cancel-btn");
  const deleteTaskButton = document.getElementById("del-btn");
  const saveNewTaskButton = document.getElementById("save-btn");
  const taskNameInput = document.getElementById("task-name");
  const subjectSelector = document.getElementById("subject-selector");
  const deadlineDateSelector = document.getElementById("deadline-date");
  const deadlineTimeSelector = document.getElementById("deadline-time");
  const durationSelector = document.getElementById("duration-selector");
  const prioritySelector = document.getElementById("priority-selector");
  let editingTaskId = null;
  saveNewTaskButton.disabled = false;
  // ------------------------------------------
  // Helper functions
  // ------------------------------------------
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

  function formatDate(rawDate) {
    return new Date(`${rawDate}T00:00:00`).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  tasksContainer.addEventListener("click", (event) => {
    // Không mở modal khi người dùng click checkbox
    if (event.target.closest(".complete-task-checkbox")) return;

    const taskCard = event.target.closest(".task-card");
    if (!taskCard) return;

    const taskId = taskCard.dataset.taskId;

    const task = tasksList.find((item) => item.id === taskId);
    if (!task) return;

    openEditModal(task);
  });
  async function renderSubjectOptions() {
    await dataReady;

    if (subjectsList.length === 0) {
      subjectSelector.innerHTML = `
        <option value="" disabled selected>No subjects yet. Create a subject first.</option>
      `;
      return;
    }

    subjectSelector.innerHTML = `
      <option value="" disabled selected>Select a subject</option>
      ${subjectsList
        .map(
          (subject) =>
            `<option value="${subject.id}">${escapeHTML(subject.name)}</option>`
        )
        .join("")}
    `;
  }

  function createTaskCard(task) {
    const taskName = escapeHTML(task.task);

    return `
      <article
        class="task-card priority-${escapeHTML(task.priority)}"
        data-task-id="${escapeHTML(task.id)}"
        data-task="${taskName}"
      >
        <div class="task-info">
          <h3 class="task-title">${taskName}</h3>
          <p class="task-deadline">Deadline: ${formatDate(
            task.deadlineDate
          )}, ${escapeHTML(task.deadlineTime)}</p>
          <p class="task-deadline">${task.duration} minute</p>
        </div>
        <input type="checkbox" class="complete-task-checkbox" aria-label="Mark ${taskName} as complete" />
      </article>
    `;
  }

  function getVisibleTasks() {
    const query = taskSearchInput.value.trim().toLowerCase();

    if (!query) return tasksList;

    return tasksList.filter((item) => {
      const taskName = item.task.toLowerCase();
      const subject = subjectsList.find((entry) => entry.id === item.subjectId);
      const subjectName = subject ? String(subject.name).toLowerCase() : "";

      return taskName.includes(query) || subjectName.includes(query);
    });
  }

  // ------------------------------------------
  // Task rendering
  // ------------------------------------------

  function attachTaskCompletion() {
    document.querySelectorAll(".complete-task-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (event) => {
        if (!event.target.checked) return;

        const taskCard = event.target.closest(".task-card");
        const taskName = taskCard.dataset.task;

        taskCard.classList.add("completed");

        setTimeout(async () => {
          const task = tasksList.find((item) => item.task === taskName);

          if (!task) return;

          try {
            await deleteTaskById(task.id);
            await renderTasks();
          } catch (error) {
            console.error("Failed to complete task:", error);
            alert("Could not complete task. Please try again.");
          }
        }, 240);
      });
    });
  }

  async function renderTasks() {
    tasksContainer.innerHTML = `
    <p class="loading-notification">
      <span class="loading-icon">⏳</span>
      Loading tasks...
    </p>
  `;

    try {
      const loadingDelay = delay(400);

      await dataReady;
      await loadingDelay;

      if (tasksList.length === 0) {
        tasksContainer.innerHTML = `
        <p class="no-task-notification">
          No tasks yet. Add one to turn your next study goal into a clear step.
        </p>
      `;
        return;
      }

      const visibleTasks = getVisibleTasks();

      if (visibleTasks.length === 0) {
        tasksContainer.innerHTML = `
        <p class="no-task-notification">
          No tasks match your search.
        </p>
      `;
        return;
      }

      const groups = [
        { key: "high", label: "High priority" },
        { key: "medium", label: "Medium priority" },
        { key: "low", label: "Low priority" },
      ];

      tasksContainer.innerHTML = groups
        .map((group) => {
          const groupTasks = visibleTasks
            .filter((task) => task.priority === group.key)
            .sort(
              (a, b) =>
                new Date(`${a.deadlineDate}T${a.deadlineTime}`) -
                new Date(`${b.deadlineDate}T${b.deadlineTime}`)
            );

          return `
          <section class="tasks-group" id="${group.key}-priority">
            <div class="task-group-heading">
              <span>${group.label}</span>
              <span class="task-count">${groupTasks.length || "None"}</span>
            </div>
            ${groupTasks.map(createTaskCard).join("")}
          </section>
        `;
        })
        .join("");

      attachTaskCompletion();
    } catch (error) {
      console.error("Failed to render tasks:", error);

      tasksContainer.innerHTML = `
      <p class="no-task-notification">
        Failed to load tasks. Please refresh the page.
      </p>
    `;
    }
  }

  // ------------------------------------------
  // Modal and form
  // ------------------------------------------
  function openEditModal(task) {
    editingTaskId = task.id;

    taskNameInput.value = task.task;
    subjectSelector.value = task.subjectId;
    deadlineDateSelector.value = task.deadlineDate;
    deadlineTimeSelector.value = task.deadlineTime;
    durationSelector.value = task.duration;
    prioritySelector.value = task.priority;

    saveNewTaskButton.textContent = "OK";

    taskModalOverlay.classList.remove("hidden");
    taskNameInput.focus();
  }
  function closeModal() {
    taskModalOverlay.classList.add("hidden");
  }

  function resetForm() {
    editingTaskId = null;

    taskNameInput.value = "";
    subjectSelector.value = "";
    deadlineDateSelector.value = "";
    deadlineTimeSelector.value = "";
    durationSelector.value = "";
    prioritySelector.value = "";

    saveNewTaskButton.textContent = "Create";
  }

  // ------------------------------------------
  // Event listeners
  // ------------------------------------------

  taskSearchInput.addEventListener("input", renderTasks);

  addTaskButton.addEventListener("click", () => {
    resetForm();

    taskModalOverlay.classList.remove("hidden");
    taskNameInput.focus();
  });

  closeModalButton.addEventListener("click", closeModal);

  taskModalOverlay.addEventListener("click", (event) => {
    if (event.target === taskModalOverlay) closeModal();
  });

  deleteTaskButton.addEventListener("click", async () => {
    const taskName = taskNameInput.value.trim();

    if (taskName === "") {
      alert("Please enter the task name.");
      return;
    }

    const index = tasksList.findIndex(
      (task) => task.task.toLowerCase() === taskName.toLowerCase()
    );

    if (index === -1) {
      alert("No task found. Please check the task name again.");
      return;
    }

    const id = tasksList[index].id;

    try {
      await deleteTaskById(id);
      await renderTasks();
      resetForm();
      closeModal();
      alert("Task deleted.");
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Could not delete task. Please try again.");
    }
  });

  saveNewTaskButton.addEventListener("click", async () => {
    saveNewTaskButton.disabled = true;
    const taskName = taskNameInput.value.trim();
    const subjectId = subjectSelector.value;
    const deadlineDate = deadlineDateSelector.value;
    const deadlineTime = deadlineTimeSelector.value;
    const duration = Number(durationSelector.value);
    const priority = prioritySelector.value;

    if (taskName === "") {
      alert("Please enter the task name.");
      return;
    }

    if (!subjectId) {
      alert("Please select the task subject.");
      return;
    }

    if (!deadlineDate) {
      alert("Please select the task deadline date.");
      return;
    }

    if (!deadlineTime) {
      alert("Please select the task deadline time.");
      return;
    }

    if (!priority) {
      alert("Please select the task priority.");
      return;
    }

    if (!duration) {
      alert("Please select the task duration");
      return;
    }

    if (!Number.isInteger(duration)) {
      alert("Float number is not accepted as task duration.");
      return;
    }

    if (
      tasksList.some(
        (task) =>
          task.id !== editingTaskId &&
          task.task.toLowerCase().trim() === taskName.toLowerCase()
      )
    ) {
      alert("That task already exists.");
      return;
    }

    const taskData = {
      task: taskName,
      subjectId: subjectId,
      deadlineDate: deadlineDate,
      deadlineTime: deadlineTime,
      duration: duration,
      priority: priority,
    };

    try {
      if (editingTaskId) {
        // EDIT EXISTING TASK

        await tasksRef.doc(editingTaskId).update(taskData);

        const taskIndex = tasksList.findIndex(
          (task) => task.id === editingTaskId
        );

        if (taskIndex !== -1) {
          tasksList[taskIndex] = {
            ...taskData,
            id: editingTaskId,
          };
        }

        alert("Task updated.");
      } else {
        // CREATE NEW TASK

        await saveNewTask(taskData);

        alert("Task created.");
        saveNewTaskButton.disabled = false;
      }

      resetForm();
      closeModal();

      await renderTasks();
    } catch (error) {
      console.error("Failed to save task:", error);
      alert("Could not save task. Please try again.");
    }
  });

  // ------------------------------------------
  // Initial rendering
  // ------------------------------------------

  async function initializeTasks() {
    try {
      await dataReady;
      await renderSubjectOptions();
      await renderTasks();
    } catch (error) {
      console.error("Failed to initialize tasks:", error);
    }
  }

  initializeTasks();
}

// ==========================================
// 3. INITIALIZE UI ONLY ON TASK PAGE
// ==========================================

if (
  typeof document !== "undefined" &&
  document.getElementById("tasks-container")
) {
  initializeTaskUI();
}
