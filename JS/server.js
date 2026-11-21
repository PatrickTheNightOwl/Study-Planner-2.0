import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

// 1. Setup
const app = express();
const PORT = 3000;

const currentDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(currentDir, "../Data/.env"),
});

app.use(cors());
app.use(express.json());

// 2. Initialize Gemini
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not found");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// 3. Response schema
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

// 4. System instruction
const systemInstruction = `
You are a study planning assistant.

GENERAL RULES:
- Every study task must have a subject.
- Every study task must have an estimated duration in minutes.
- Every study task must have a deadline date and time.
- Every study task must have an estimated priority.
- Every subject must have a color name.

COLOR RULES:
- Color name is the hex code of the color.
- If the user's prompt includes color for each subject, follow it.
- Otherwise, choose a random color.
- Colors must belong to this palette:
  Gray: #9ca3af
  Red: #ef4444
  Orange: #f97316
  Yellow: #eab308
  Green: #22c55e
  Blue: #3b82f6
  Purple: #8b5cf6
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
`;

// 5. Generate plan endpoint
app.post("/api/generate-plan", async (req, res) => {
  try {
    const { userPrompt } = req.body;

    if (typeof userPrompt !== "string" || !userPrompt.trim()) {
      return res.status(400).json({
        error: "Invalid user prompt",
      });
    }

    const response = await ai.models.generateContent({
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
        responseSchema,
        systemInstruction,
      },
    });

    const plan = JSON.parse(response.text);

    res.json(plan);
  } catch (error) {
    console.error("Gemini API error:", error);

    res.status(500).json({
      error: "Failed to generate study plan",
    });
  }
});

// 6. Start server
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
