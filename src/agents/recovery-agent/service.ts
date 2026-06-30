import { db } from '../../db/index.ts';
import { goals, tasks, scheduleBlocks, agentExecutionLogs } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { ai } from '../../lib/gemini.ts';
import { sanitizeInput, trimPrompt, validateRecoveryOutput } from '../../lib/security.ts';

export interface RecoveryPlan {
  riskBefore: number;
  riskAfter: number;
  recommendations: string[];
}

export async function generateRecoveryPlan(
  userId: string,
  goalId: string,
  currentRiskScore: number,
  referenceDate: string = new Date().toISOString().split('T')[0]
): Promise<RecoveryPlan> {
  const startTime = Date.now();
  let success = false;
  let plan: RecoveryPlan = {
    riskBefore: currentRiskScore,
    riskAfter: Math.max(15, Math.round(currentRiskScore * 0.5)),
    recommendations: [
      'Reschedule pending tasks starting tomorrow.',
      'Allocate 1.5 hours of additional focus time on weekends.',
    ],
  };
  let failureReason: string | null = null;

  try {
    // 1. Fetch the goal
    const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
    if (!goal) {
      throw new Error(`Goal with ID ${goalId} not found.`);
    }

    // Prompt Injection Hardening: Sanitize and Trim user input
    const sanitizedTitle = sanitizeInput(goal.title);
    const trimmedTitle = trimPrompt(sanitizedTitle, 500);

    // 2. Fetch all tasks & schedules
    const goalTasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
    const pendingTasks = goalTasks.filter((t) => t.status !== 'COMPLETED');
    const missedTasks = goalTasks.filter((t) => t.status === 'MISSED');

    // 3. Prompt Gemini to produce structured recommendations
    const prompt = `
You are the Recovery Agent for Deadline Guardian AI.
Your purpose is to formulate an aggressive, smart recovery strategy to get the user back on track to meet their deadline.

Goal: "${trimmedTitle}"
Deadline: ${goal.deadline.toISOString().split('T')[0]}
Current Risk Score: ${currentRiskScore}/100

Pending Tasks list:
${pendingTasks.map((t) => `- ${t.title} (${t.estimatedHours}h, current status: ${t.status})`).join('\n')}

Missed Tasks count: ${missedTasks.length}

Formulate 2 to 4 concrete, actionable, and highly specific recovery recommendations. 
Examples:
- "Shift 'Testing & Verification' task to Sunday."
- "Increase daily commitment on Friday by 2.5 hours to clear the backlog."
- "Parallelize 'Frontend integration' and 'Design Polish' by merging their overlap."

Estimate the reduced risk score ("riskAfter") if the user applies all recommendations.

Output format MUST be valid JSON matching this schema:
{
  "riskBefore": number,
  "riskAfter": number,
  "recommendations": [string]
}

Ensure riskAfter is lower than riskBefore (normally between 15 and 45).
Only return the JSON. No conversational text, no markdown wrappers.
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
      const validated = validateRecoveryOutput(rawJson);
      if (!validated) {
        throw new Error('Recovery Agent did not return a valid recovery plan schema');
      }

      plan = validated;
      success = true;
    } catch (aiErr: any) {
      console.warn('Gemini failed to generate recovery plan, using fallback:', aiErr);
      failureReason = aiErr.message;
    }

    return plan;
  } catch (error: any) {
    console.error('Recovery Agent failed:', error);
    failureReason = error.message;
    return plan;
  } finally {
    const executionTimeMs = Date.now() - startTime;
    try {
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(agentExecutionLogs).values({
        id: logId,
        userId: userId,
        goalId: goalId,
        agentName: 'RECOVERY_AGENT',
        inputPayload: JSON.stringify({ goalId, currentRiskScore, referenceDate }),
        outputPayload: JSON.stringify({
          plan,
          ...(failureReason ? { error: failureReason, failureReason } : {}),
        }),
        executionTimeMs,
        success,
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.error('Failed to log Recovery Agent execution:', logErr);
    }
  }
}
