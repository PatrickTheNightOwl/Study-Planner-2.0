import { assistantDataSolver } from "./subject-management.js";
import { subjectsList } from "./firebaseConfig.js";
import { solveAssistantData } from "./task-management.js";
import { tasksList } from "./firebaseConfig.js";
// 1. UI Recall
const generateButton = document.getElementById("generate-plan-btn");

const approveButton = document.getElementById("approve-plan-btn");

const userInput = document.getElementById("ai-message");

let approvedPlan = null;

// 2. Generate plan
generateButton.addEventListener("click", async () => {
  const userPrompt = userInput.value.trim();

  if (!userPrompt) {
    alert("Please enter prompt to generate plan");
    return;
  }

  // Prevent approving an old plan
  approvedPlan = null;
  approveButton.disabled = true;
  generateButton.disabled = true;

  const container = document.querySelector("#tasks");

  if (container) {
    container.innerHTML = "";
  }

  try {
    // Send request to backend
    const apiResponse = await fetch("http://localhost:3000/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userPrompt,
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(data.error || "Failed to generate plan");
    }

    // Validate
    validatePlan(data);

    // Save valid plan
    approvedPlan = data;

    // Preview
    createPreview(approvedPlan);

    approveButton.disabled = false;

    alert("Plan generated successfully!");
  } catch (error) {
    console.error("Plan rejected:", error);
    alert(error.message);
  } finally {
    generateButton.disabled = false;
  }
});

// 3. Duplicate checking
function isDuplicateSubject(subjectName) {
  return subjectsList.some(
    (subject) =>
      subject.name.trim().toLowerCase() === subjectName.trim().toLowerCase()
  );
}

function isDuplicateTask(taskName) {
  return tasksList.some(
    (task) => task.task.trim().toLowerCase() === taskName.trim().toLowerCase()
  );
}

// 4. Preview
function createPreview(data) {
  const container = document.querySelector("#tasks");

  if (!container) {
    throw new Error("Preview container #tasks not found");
  }

  container.innerHTML = "";

  data.subjects.forEach((subject) => {
    const subjectSection = document.createElement("section");
    subjectSection.classList.add("preview-subject");

    const subjectTitle = document.createElement("h3");
    subjectTitle.textContent = subject.subjectName;
    subjectTitle.style.color = subject.colorName;

    subjectSection.appendChild(subjectTitle);

    subject.tasks.forEach((task) => {
      const article = document.createElement("article");

      article.classList.add(
        "task-card",
        `priority-${task.priority.toLowerCase()}`
      );

      const taskInfo = document.createElement("div");
      taskInfo.classList.add("task-info");

      const taskTitle = document.createElement("p");
      taskTitle.classList.add("task-title");
      taskTitle.textContent = task.taskName;

      const taskDeadline = document.createElement("p");
      taskDeadline.classList.add("task-deadline");

      taskDeadline.textContent = `${task.deadlineDate} · ${task.deadlineTime}`;

      taskInfo.append(taskTitle, taskDeadline);
      article.appendChild(taskInfo);

      subjectSection.appendChild(article);
    });

    container.appendChild(subjectSection);
  });
}

// 5. Validation
function validatePlan(data) {
  // Root validation
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.subjects) ||
    data.subjects.length === 0
  ) {
    throw new Error("Invalid subjects array");
  }

  const validColors = [
    "#9ca3af",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];

  const subjectNames = new Set();
  const taskNames = new Set();

  for (const subject of data.subjects) {
    // Subject validation
    if (
      typeof subject.subjectName !== "string" ||
      !subject.subjectName.trim()
    ) {
      throw new Error("Invalid subjectName");
    }

    const normalizedSubject = subject.subjectName.trim().toLowerCase();

    if (subjectNames.has(normalizedSubject)) {
      throw new Error(`Duplicate subject: ${subject.subjectName}`);
    }

    subjectNames.add(normalizedSubject);

    if (isDuplicateSubject(subject.subjectName)) {
      throw new Error(`Subject already exists: ${subject.subjectName}`);
    }

    if (
      typeof subject.colorName !== "string" ||
      !validColors.includes(subject.colorName.toLowerCase())
    ) {
      throw new Error(`Invalid subject color: ${subject.colorName}`);
    }

    if (!Array.isArray(subject.tasks) || subject.tasks.length === 0) {
      throw new Error(`Invalid tasks in ${subject.subjectName}`);
    }

    // Task validation
    for (const task of subject.tasks) {
      if (typeof task.taskName !== "string" || !task.taskName.trim()) {
        throw new Error("Invalid taskName");
      }

      if (
        typeof task.deadlineDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(task.deadlineDate)
      ) {
        throw new Error(`Invalid deadlineDate: ${task.deadlineDate}`);
      }

      const date = new Date(`${task.deadlineDate}T00:00:00Z`);

      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== task.deadlineDate
      ) {
        throw new Error(`Invalid calendar date: ${task.deadlineDate}`);
      }

      if (
        typeof task.deadlineTime !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.deadlineTime)
      ) {
        throw new Error(`Invalid deadlineTime: ${task.deadlineTime}`);
      }

      if (!["High", "Medium", "Low"].includes(task.priority)) {
        throw new Error(`Invalid priority: ${task.priority}`);
      }

      if (!Number.isInteger(task.duration) || task.duration <= 0) {
        throw new Error(`Invalid duration: ${task.duration}`);
      }

      const normalizedTask = task.taskName.trim().toLowerCase();

      if (taskNames.has(normalizedTask)) {
        throw new Error(`Duplicate task: ${task.taskName}`);
      }

      taskNames.add(normalizedTask);

      if (isDuplicateTask(task.taskName)) {
        throw new Error(`Task already exists: ${task.taskName}`);
      }
    }
  }

  return true;
}

// 6. Approve plan
approveButton.addEventListener("click", async () => {
  if (!approvedPlan) {
    alert("Please generate a valid plan first.");
    return;
  }

  approveButton.disabled = true;

  try {
    // Save subjects to Firestore
    const newSubjects = await assistantDataSolver(approvedPlan);

    // Save tasks to Firestore
    const newTasks = await solveAssistantData(approvedPlan, newSubjects);

    console.log("Saved subjects:", newSubjects);
    console.log("Saved tasks:", newTasks);

    approvedPlan = null;

    alert("Plan approved and saved successfully!");
  } catch (error) {
    console.error("Plan saving failed:", error);

    alert("Failed to save the plan. Check the console and Firestore.");
  } finally {
    approveButton.disabled = !approvedPlan;
  }
});
