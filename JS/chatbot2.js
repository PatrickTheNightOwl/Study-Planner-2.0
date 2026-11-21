import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenAI } from "@google/genai";
import { type } from "node:os";
import { assistantDataSolver, subjectsList } from "./subject-management";
import { solveAssistantData, tasksList } from "./task-management";
// Determine current directory
const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Load .env
dotenv.config({
  path: path.resolve(currentDir, "../Data/.env"),
});

// Check API key
console.log("API key exists:", Boolean(process.env.GEMINI_API_KEY));

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
console.log("1. Before API call");

const responseSchema = {
  type: "OBJECT",
  properties: {
    subjects: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          subjectName: {
            type: "STRING",
          },
          colorName: {
            type: "STRING",
          },
          tasks: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                taskName: {
                  type: "STRING",
                },
                deadlineDate: {
                  type: "STRING",
                },
                deadlineTime: {
                  type: "STRING",
                },
                priority: {
                  type: "STRING",
                },
                duration: {
                  type: "INTEGER",
                },
              },
              required: [
                "taskName",
                "deadlineDate",
                "deadlineTime",
                "priority",
                "duration",
              ],
            },
          },
        },
        required: ["subjectName", "colorName", "tasks"],
      },
    },
  },
  required: ["subjects"],
};
// const userPrompt = `
// I have 120 minutes available today.

// I need to study Mathematics and English.

// Mathematics:
// - Review Geometry. Deadline: November 22, 2026 at 20:00.
// - Practice equations. Deadline: November 23, 2026 at 18:00.

// English:
// - Review vocabulary. Deadline: November 25, 2026 at 21:00.

// Mathematics is my highest priority.

// Current date: 2026-11-20
// Current time: 17:01
// Timezone: Asia/Ho_Chi_Minh
// Available study time: 120 minutes.
// `;

// UI Recall
const generateButton = document.getElementById("generate-plan-btn");
const approveButton = document.getElementById("approve-plan-btn");
const userInput = document.getElementById("ai-message");
const subjectsTasksQuantity = document.getElementById(
  "subjects-tasks-quantity"
);
const tasksPreviewSection = document.getElementById("proposed-tasks");

export let response;
let approvedPlan = null;
generateButton.addEventListener("click", async () => {
  const userPrompt = userInput.value;
  if (!userPrompt) {
    alert("Please enter prompt to generate plan");
    return;
  }
  response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: userPrompt,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      systemInstruction: `

    You are a study planning assistant.

    GENERAL RULES:
      - Every study task must have a subject.
      - Every study task must have an estimated duration in minutes.
      - Every study task must have a deadline date and time.
      - Every study task must have an estimated priority.
      - Every subject must have a color name.
    
    COLOR RULES :
      - Color name is the hex code of the color.
      - If the user's prompt includes color for each subject, you must follow it
      - Else, choose a random color.
      - In both situations (following user & choose a random one), the color you choose must belong to this board :
          Gray : #9ca3af,
          Red : #ef4444,
          Orange: #f97316,
          Yellow: #eab308,
          Green: #22c55e,
          Blue: #3b82f6,
          Purple: #8b5cf6,
          Pink: #ec4899

    DEADLINE RULES:
      - Follow the provided date and time formats.
      - Never assign a task a deadline later than its applicable overall deadline.
      - Never invent deadlines when the user has not provided enough information.

    DURATION ALLOCATION:
      - Understand the total study time available to the user.
      - Distribute task durations according to the user's priorities and workload.
      - Never allocate more total time than the user has available.
      - All task durations must be positive integers in minutes.

    PRIORITY RULES:
      - If the user explicitly specifies a priority, preserve it.
      - Otherwise, estimate priority using the distance from the current time to the deadline:
        - <= 72 hours: High
        - > 72 and < 144 hours: Medium
        - >= 144 hours: Low

    OUTPUT:
      - Always return valid JSON matching the provided schema.

    `,
    },
  });
  try {
    const data = JSON.parse(response.text);

    validatePlan(data);
    approvedPlan = data;
    alert("Validation successful!");
    createPreview(approvedPlan);
  } catch (error) {
    console.error("Plan rejected:", error.message);
  }
});

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
function createPreview(data) {
  const container = document.querySelector("#tasks");

  if (!container) {
    throw new Error("Preview container #tasks not found");
  }

  container.innerHTML = "";

  data.subjects.forEach((subject) => {
    // Subject heading
    const subjectSection = document.createElement("section");
    subjectSection.classList.add("preview-subject");

    const subjectTitle = document.createElement("h3");
    subjectTitle.textContent = subject.subjectName;

    subjectTitle.style.color = subject.colorName;

    subjectSection.appendChild(subjectTitle);

    // Tasks
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
function validatePlan(data) {
  // 1. Validate root
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray(data.subjects) ||
    data.subjects.length === 0
  ) {
    throw new Error("Invalid subjects array");
  }

  let totalDuration = 0;

  // 2. Validate subjects
  for (const subject of data.subjects) {
    if (
      typeof subject.subjectName !== "string" ||
      !subject.subjectName.trim()
    ) {
      throw new Error("Invalid subjectName");
    }

    if (!Array.isArray(subject.tasks) || subject.tasks.length === 0) {
      throw new Error(`Invalid tasks in ${subject.subjectName}`);
    }
    if (isDuplicateSubject(subject.subjectName)) {
      throw new Error(`Subject already exists: ${subject.subjectName}`);
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

    if (!validColors.includes(subject.colorName.toLowerCase())) {
      throw new Error(`Invalid subject color: ${subject.colorName}`);
    }
    // 3. Validate tasks
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

      // Check whether the date actually exists
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
      if (isDuplicateTask(task.taskName)) {
        throw new Error(`Task already exists: ${task.taskName}`);
      }
    }
  }
  // 4. Validate duplicates in plan
  const subjectNames = new Set();
  const taskNames = new Set();

  for (const subject of data.subjects) {
    // Normalize subject name
    const normalizedSubject = subject.subjectName.trim().toLowerCase();

    if (subjectNames.has(normalizedSubject)) {
      throw new Error(`Duplicate subject: ${subject.subjectName}`);
    }

    subjectNames.add(normalizedSubject);

    for (const task of subject.tasks) {
      // Normalize task name
      const normalizedTask = task.taskName.trim().toLowerCase();

      if (taskNames.has(normalizedTask)) {
        throw new Error(`Duplicate task: ${task.taskName}`);
      }

      taskNames.add(normalizedTask);
    }
  }

  return true;
}
approveButton.addEventListener("click", () => {
  if (!approvedPlan) {
    alert("Please generate a valid plan first.");
    return;
  }

  try {
    // Chỉ chạy solver sau khi plan đã được validate
    const newSubjects = assistantDataSolver(approvedPlan);
    const newTasks = solveAssistantData(approvedPlan, newSubjects);

    alert("Plan approved!");
  } catch (error) {
    console.error("Plan rejected:", error.message);
  }
});
