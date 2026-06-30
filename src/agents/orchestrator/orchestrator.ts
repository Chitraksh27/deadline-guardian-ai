import { db } from '../../db/index.ts';
import { goals, tasks, scheduleBlocks, users } from '../../db/schema.ts';
import { eq } from 'drizzle-orm';
import { parseGoal } from '../goal-agent/service.ts';
import { generateTaskPlan } from '../planning-agent/service.ts';
import { generateSchedule } from '../scheduling-agent/service.ts';
import { calculateGoalRisk } from '../risk-engine/service.ts';
import { generateRecoveryPlan, RecoveryPlan } from '../recovery-agent/service.ts';

export interface OrchestratorResult {
  goalId: string;
  goalTitle: string;
  deadline: string;
  complexity: string;
  estimatedHours: number;
  tasksCount: number;
  scheduleSlotsCount: number;
  riskScore: number;
  riskLevel: string;
}

export class AgentOrchestrator {
  /**
   * Orchestrates the complete Goal Creation Flow:
   * 1. Parse raw natural language goal (Goal Agent)
   * 2. Insert Goal into Database
   * 3. Decompose into structured tasks & dependencies (Planning Agent)
   * 4. Build sequential schedule blocks (Scheduling Agent)
   * 5. Analyze and save initial deadline failure risk (Risk Engine)
   */
  static async createGoalFlow(
    userId: string,
    rawGoalInput: string,
    referenceDate: string = new Date().toISOString().split('T')[0]
  ): Promise<OrchestratorResult> {
    // 1. Goal Intake Agent
    const parsedGoal = await parseGoal(userId, rawGoalInput, referenceDate);

    // 2. Insert structured Goal in Database
    const goalId = `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const deadlineObj = new Date(parsedGoal.deadline);

    const [insertedGoal] = await db.insert(goals).values({
      id: goalId,
      userId: userId,
      title: parsedGoal.title,
      description: `Auto-generated from user intent: "${rawGoalInput}"`,
      deadline: deadlineObj,
      status: 'ACTIVE',
      complexity: parsedGoal.complexity,
      estimatedHours: parsedGoal.estimatedHours,
      actualHours: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // 3. Planning Agent: Task Decomposition
    const plannedTasks = await generateTaskPlan(
      userId,
      goalId,
      parsedGoal.title,
      parsedGoal.complexity,
      parsedGoal.deadline,
      parsedGoal.estimatedHours
    );

    // 4. Scheduling Agent: Sequence Allocation
    const scheduleSlots = await generateSchedule(userId, goalId, referenceDate);

    // 5. Risk Engine: Assessment
    const riskAnalysis = await calculateGoalRisk(userId, goalId, referenceDate);

    return {
      goalId,
      goalTitle: parsedGoal.title,
      deadline: parsedGoal.deadline,
      complexity: parsedGoal.complexity,
      estimatedHours: parsedGoal.estimatedHours,
      tasksCount: plannedTasks.length,
      scheduleSlotsCount: scheduleSlots.length,
      riskScore: riskAnalysis.score,
      riskLevel: riskAnalysis.level,
    };
  }

  /**
   * Orchestrates Task Completion Flow:
   * 1. Mark task status as COMPLETED
   * 2. Recalculate Risk (Risk Engine)
   * 3. Regenerate Schedule/Recovery if risk exceeds a critical threshold
   */
  static async completeTaskFlow(
    userId: string,
    taskId: string,
    referenceDate: string = new Date().toISOString().split('T')[0]
  ) {
    // 1. Mark task completed
    const [updatedTask] = await db.update(tasks)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      throw new Error(`Task ${taskId} not found.`);
    }

    // Mark corresponding schedule block as completed as well
    await db.update(scheduleBlocks)
      .set({ status: 'COMPLETED' })
      .where(eq(scheduleBlocks.taskId, taskId));

    // 2. Recalculate Goal Risk
    const riskAnalysis = await calculateGoalRisk(userId, updatedTask.goalId, referenceDate);

    return {
      taskId,
      goalId: updatedTask.goalId,
      newRiskScore: riskAnalysis.score,
      newRiskLevel: riskAnalysis.level,
    };
  }

  /**
   * Orchestrates Task Missed Flow:
   * 1. Mark task status as MISSED
   * 2. Recalculate Risk (Risk Engine) -> Should increase due to missed items
   * 3. Trigger Recovery Plan suggestions (Recovery Agent)
   */
  static async missTaskFlow(
    userId: string,
    taskId: string,
    referenceDate: string = new Date().toISOString().split('T')[0]
  ) {
    // 1. Mark task missed
    const [updatedTask] = await db.update(tasks)
      .set({ status: 'MISSED', updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      throw new Error(`Task ${taskId} not found.`);
    }

    // Mark corresponding schedule block as missed
    await db.update(scheduleBlocks)
      .set({ status: 'MISSED' })
      .where(eq(scheduleBlocks.taskId, taskId));

    // 2. Recalculate risk (will be higher)
    const riskAnalysis = await calculateGoalRisk(userId, updatedTask.goalId, referenceDate);

    // 3. Trigger Recovery recommendations
    const recoveryPlan = await generateRecoveryPlan(userId, updatedTask.goalId, riskAnalysis.score, referenceDate);

    return {
      taskId,
      goalId: updatedTask.goalId,
      newRiskScore: riskAnalysis.score,
      newRiskLevel: riskAnalysis.level,
      recoveryPlan,
    };
  }
}
