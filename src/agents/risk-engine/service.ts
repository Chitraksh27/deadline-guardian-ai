import { db } from '../../db/index.ts';
import { goals, tasks, riskAssessments, agentExecutionLogs } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { ai } from '../../lib/gemini.ts';
import { sanitizeInput, trimPrompt } from '../../lib/security.ts';

export interface RiskAnalysis {
  score: number; // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
}

export async function calculateGoalRisk(
  userId: string,
  goalId: string,
  referenceDate: string = new Date().toISOString().split('T')[0]
): Promise<RiskAnalysis> {
  const startTime = Date.now();
  let success = false;
  let analysis: RiskAnalysis = { score: 20, level: 'LOW', reason: 'System initialized.' };
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

    // 2. Fetch all tasks
    const allTasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
    
    // 3. Compute baseline metrics
    const totalHours = allTasks.reduce((sum, t) => sum + t.estimatedHours, 0) || goal.estimatedHours || 10;
    const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED');
    const completedHours = completedTasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const remainingTasks = allTasks.filter((t) => t.status !== 'COMPLETED');
    const remainingHours = remainingTasks.reduce((sum, t) => sum + t.estimatedHours, 0);

    const refDate = new Date(referenceDate);
    const deadlineDate = new Date(goal.deadline);
    const createdDate = new Date(goal.createdAt);

    // Remaining days
    const msPerDay = 1000 * 60 * 60 * 24;
    const remainingDays = Math.max(0.1, (deadlineDate.getTime() - refDate.getTime()) / msPerDay);
    const elapsedDays = Math.max(0.5, (refDate.getTime() - createdDate.getTime()) / msPerDay);

    // Velocities
    const requiredVelocity = remainingHours / remainingDays; // hours needed per day
    // For actual velocity, fallback to a sensible default (e.g. 3 hours/day) if no days elapsed or no work done
    const baseActualVelocity = completedHours / elapsedDays;
    const actualVelocity = baseActualVelocity > 0 ? baseActualVelocity : 3.0;

    // 4. Score Calculation Algorithm
    let score = 0;
    if (deadlineDate.getTime() <= refDate.getTime()) {
      score = 100;
    } else {
      const velocityRatio = requiredVelocity / actualVelocity;
      if (velocityRatio <= 1.0) {
        // Safe zone
        score = Math.max(5, Math.round(30 * velocityRatio));
      } else {
        // Risk increases as ratio grows
        score = Math.min(100, Math.round(30 + (velocityRatio - 1.0) * 45));
      }
    }

    // Adjust score based on missed tasks
    const missedCount = allTasks.filter((t) => t.status === 'MISSED').length;
    if (missedCount > 0) {
      score = Math.min(100, score + missedCount * 12);
    }

    let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (score > 60) {
      level = 'HIGH';
    } else if (score > 30) {
      level = 'MEDIUM';
    }

    // 5. Use Gemini to generate an explainable natural language description
    const prompt = `
You are the Deadline Risk Engine for Deadline Guardian AI.
Given the current goal progress metrics, write a concise, human-readable risk reason.

Goal: "${trimmedTitle}"
Deadline: ${goal.deadline.toISOString().split('T')[0]} (in ${remainingDays.toFixed(1)} days)
Progress: ${completedHours} / ${totalHours} hours completed (or ${allTasks.length > 0 ? ((completedTasks.length / allTasks.length) * 100).toFixed(0) : 0}% tasks complete)
Missed Tasks count: ${missedCount}
Required Work Velocity: ${requiredVelocity.toFixed(1)} hours/day
User Work Velocity: ${actualVelocity.toFixed(1)} hours/day

Calculated Risk Score: ${score}/100
Risk Level: ${level}

Write a direct, 1 to 2 sentence explanation of why the risk is ${level} and what is the primary threat to the deadline. Speak as an intelligent execution coach. Keep it scannable and direct. No filler words or prefaces.
`;

    let reasonText = `Risk is ${level} because required velocity (${requiredVelocity.toFixed(1)}h/d) exceeds current velocity (${actualVelocity.toFixed(1)}h/d).`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      if (response.text) {
        reasonText = sanitizeInput(response.text.trim());
      }
    } catch (aiErr) {
      console.warn('Gemini failed to generate risk explanation, using formula-based fallback:', aiErr);
    }

    analysis = {
      score,
      level,
      reason: reasonText,
    };

    // 6. Persist Risk Assessment in PostgreSQL
    const assessmentId = `risk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(riskAssessments).values({
      id: assessmentId,
      goalId: goalId,
      score: score,
      level: level,
      reason: reasonText,
      createdAt: new Date(),
    });

    success = true;
    return analysis;
  } catch (error: any) {
    console.error('Risk Engine calculation failed:', error);
    failureReason = error.message;
    return analysis;
  } finally {
    const executionTimeMs = Date.now() - startTime;
    try {
       const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
       await db.insert(agentExecutionLogs).values({
         id: logId,
         userId: userId,
         goalId: goalId,
         agentName: 'RISK_ENGINE',
         inputPayload: JSON.stringify({ goalId, referenceDate }),
         outputPayload: JSON.stringify({
           analysis,
           ...(failureReason ? { error: failureReason, failureReason } : {}),
         }),
         executionTimeMs,
         success,
         createdAt: new Date(),
       });
    } catch (logErr) {
      console.error('Failed to log Risk Engine execution:', logErr);
    }
  }
}
