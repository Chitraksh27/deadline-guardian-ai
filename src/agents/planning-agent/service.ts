import { ai } from '../../lib/gemini.ts';
import { db } from '../../db/index.ts';
import { agentExecutionLogs, tasks, taskDependencies } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { sanitizeInput, trimPrompt, validatePlanningOutput } from '../../lib/security.ts';

export interface PlannedTask {
  title: string;
  description: string;
  estimatedHours: number;
  priorityScore: number;
  position: number;
  dependsOnTitles: string[]; // Titles of tasks this task depends on
}

export interface PlanningAgentOutput {
  tasks: PlannedTask[];
}

export async function generateTaskPlan(
  userId: string,
  goalId: string,
  goalTitle: string,
  complexity: 'LOW' | 'MEDIUM' | 'HIGH',
  deadline: string,
  estimatedHours: number
): Promise<PlannedTask[]> {
  const startTime = Date.now();
  let success = false;
  let plannedTasks: PlannedTask[] = [];
  let failureReason: string | null = null;

  // Prompt Injection Hardening: Sanitize and Trim user input
  const sanitizedGoalTitle = sanitizeInput(goalTitle);
  const trimmedGoalTitle = trimPrompt(sanitizedGoalTitle, 500);

  const prompt = `
You are the Planning Agent for Deadline Guardian AI.
Your job is to break down a high-level goal into a sequence of executable tasks.
These tasks must form a Directed Acyclic Graph (DAG) representing their logical execution order and dependencies.

Goal: "${trimmedGoalTitle}"
Complexity Level: ${complexity}
Deadline Date: ${deadline}
Total Estimated Hours: ${estimatedHours}

Requirements:
1. Decompose this goal into 4 to 8 distinct, actionable, sequentially-oriented tasks.
2. For each task, provide:
   - "title": A concise, clear title (e.g., "Market Research", "Database Design", "Backend API Development", "Frontend Integration", "User Acceptance Testing").
   - "description": A short explanation of the task's deliverables.
   - "estimatedHours": A realistic estimate of hours needed (the sum should roughly match the goal's total hours: ${estimatedHours} hours).
   - "priorityScore": An integer from 1 to 100 representing the critical path importance (higher score means more critical).
   - "position": Index representing the logical sequencing (0, 1, 2, ...).
   - "dependsOnTitles": An array of titles of other tasks that MUST be completed before this task can start. For example, "Backend API Development" might depend on "Database Design". Make sure there are NO circular dependencies.

Output format MUST be valid JSON matching this schema:
{
  "tasks": [
    {
      "title": "Task Title",
      "description": "Task description details",
      "estimatedHours": number,
      "priorityScore": number,
      "position": number,
      "dependsOnTitles": ["Dependency Task Title 1"]
    }
  ]
}

Only return the raw JSON object. No explanation, no markdown wraps.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const contentText = response.text || '';
    const rawJson = JSON.parse(contentText.trim());
    
    // Secure schema validation
    const validated = validatePlanningOutput(rawJson);
    if (!validated) {
      throw new Error('Planning Agent did not return a valid list of tasks or failed schema verification');
    }

    plannedTasks = validated.tasks;
    success = true;

    // Persist tasks and dependencies into the database in a safe transaction
    await db.transaction(async (tx) => {
      // 1. Delete existing tasks and dependencies for this goal to avoid conflicts if regenerating
      const existingTasks = await tx.select().from(tasks).where(eq(tasks.goalId, goalId));
      const existingTaskIds = existingTasks.map((t) => t.id);

      if (existingTaskIds.length > 0) {
        // Dependencies get cascade-deleted automatically due to FK definitions, but let's be safe
        await tx.delete(tasks).where(eq(tasks.goalId, goalId));
      }

      // 2. Insert new tasks
      const createdTasksMap = new Map<string, typeof tasks.$inferSelect>();
      for (const pt of plannedTasks) {
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const [insertedTask] = await tx.insert(tasks).values({
          id: taskId,
          goalId: goalId,
          title: pt.title,
          description: pt.description,
          estimatedHours: pt.estimatedHours,
          actualHours: 0,
          priorityScore: pt.priorityScore,
          status: 'PENDING',
          position: pt.position,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        createdTasksMap.set(pt.title, insertedTask);
      }

      // 3. Insert task dependencies
      for (const pt of plannedTasks) {
        const currentTask = createdTasksMap.get(pt.title);
        if (!currentTask) continue;

        for (const depTitle of pt.dependsOnTitles) {
          const dependentOnTask = createdTasksMap.get(depTitle);
          if (!dependentOnTask) continue;

          const depId = `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await tx.insert(taskDependencies).values({
            id: depId,
            taskId: currentTask.id,
            dependsOnTaskId: dependentOnTask.id,
          });
        }
      }
    });

    return plannedTasks;
  } catch (error: any) {
    console.error('Planning Agent failed to generate or persist tasks:', error);
    failureReason = error.message;
    // Fallback static tasks if Gemini fails or database issues arise
    const fallbackTasks: PlannedTask[] = [
      { title: 'Requirements & Design', description: 'Deconstruct project spec and wireframes', estimatedHours: Math.round(estimatedHours * 0.2), priorityScore: 90, position: 0, dependsOnTitles: [] },
      { title: 'Core Implementation', description: 'Code the backend API and database schemas', estimatedHours: Math.round(estimatedHours * 0.5), priorityScore: 80, position: 1, dependsOnTitles: ['Requirements & Design'] },
      { title: 'Integration & Testing', description: 'Assemble app pieces and run tests', estimatedHours: Math.round(estimatedHours * 0.2), priorityScore: 70, position: 2, dependsOnTitles: ['Core Implementation'] },
      { title: 'Polishing & Delivery', description: 'Fix styling, review against checklist, ship', estimatedHours: Math.round(estimatedHours * 0.1), priorityScore: 60, position: 3, dependsOnTitles: ['Integration & Testing'] },
    ];

    // Safely insert fallbacks
    try {
      await db.transaction(async (tx) => {
        await tx.delete(tasks).where(eq(tasks.goalId, goalId));
        const map = new Map<string, string>();
        for (const ft of fallbackTasks) {
          const tid = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await tx.insert(tasks).values({
            id: tid,
            goalId,
            title: ft.title,
            description: ft.description,
            estimatedHours: ft.estimatedHours,
            actualHours: 0,
            priorityScore: ft.priorityScore,
            status: 'PENDING',
            position: ft.position,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          map.set(ft.title, tid);
        }
        for (const ft of fallbackTasks) {
          const currentId = map.get(ft.title);
          if (!currentId) continue;
          for (const depT of ft.dependsOnTitles) {
            const depId = map.get(depT);
            if (!depId) continue;
            await tx.insert(taskDependencies).values({
              id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              taskId: currentId,
              dependsOnTaskId: depId,
            });
          }
        }
      });
    } catch (dbErr) {
      console.error('Fallback persistence failed:', dbErr);
    }

    return fallbackTasks;
  } finally {
    const executionTimeMs = Date.now() - startTime;
    try {
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(agentExecutionLogs).values({
        id: logId,
        userId: userId,
        goalId: goalId,
        agentName: 'PLANNING_AGENT',
        inputPayload: JSON.stringify({ goalTitle, complexity, deadline, estimatedHours }),
        outputPayload: JSON.stringify({
          tasks: plannedTasks.length > 0 ? plannedTasks : null,
          ...(failureReason ? { error: failureReason, failureReason } : {}),
        }),
        executionTimeMs,
        success,
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.error('Failed to save Planning Agent execution log:', logErr);
    }
  }
}
