import { db } from '../../db/index.ts';
import { tasks, taskDependencies, scheduleBlocks, agentExecutionLogs } from '../../db/schema.ts';
import { eq, inArray, and } from 'drizzle-orm';

export interface ScheduledSlot {
  taskId: string;
  taskTitle: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: Date;
  endTime: Date;
}

export async function generateSchedule(
  userId: string,
  goalId: string,
  referenceDate: string = new Date().toISOString().split('T')[0]
): Promise<ScheduledSlot[]> {
  const startTime = Date.now();
  let success = false;
  const resultSlots: ScheduledSlot[] = [];
  let failureReason: string | null = null;

  try {
    // 1. Fetch all tasks for the goal
    const goalTasks = await db.select().from(tasks).where(eq(tasks.goalId, goalId));
    if (goalTasks.length === 0) {
      throw new Error('No tasks found to schedule.');
    }

    const taskIds = goalTasks.map((t) => t.id);
    const taskMap = new Map<string, typeof tasks.$inferSelect>();
    goalTasks.forEach((t) => taskMap.set(t.id, t));

    // 2. Fetch all dependencies
    const deps = await db.select().from(taskDependencies).where(inArray(taskDependencies.taskId, taskIds));

    // 3. Construct DAG
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize maps
    taskIds.forEach((id) => {
      adjList.set(id, []);
      inDegree.set(id, 0);
    });

    // Populate maps (task depends on dependsOnTask, so dependsOnTask must run before task)
    // Edge goes from dependsOnTask -> task
    deps.forEach((d) => {
      const fromNode = d.dependsOnTaskId;
      const toNode = d.taskId;

      if (adjList.has(fromNode) && adjList.has(toNode)) {
        adjList.get(fromNode)!.push(toNode);
        inDegree.set(toNode, inDegree.get(toNode)! + 1);
      }
    });

    // 4. Topological Sort (Kahn's Algorithm)
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) {
        queue.push(id);
      }
    });

    // Critical Path Analysis Priority: Higher priority tasks processed first in queue
    queue.sort((a, b) => {
      const prioA = taskMap.get(a)?.priorityScore || 0;
      const prioB = taskMap.get(b)?.priorityScore || 0;
      return prioB - prioA; // higher priority first
    });

    const sortedTaskIds: string[] = [];
    while (queue.length > 0) {
      const currId = queue.shift()!;
      sortedTaskIds.push(currId);

      const neighbors = adjList.get(currId) || [];
      for (const nextId of neighbors) {
        inDegree.set(nextId, inDegree.get(nextId)! - 1);
        if (inDegree.get(nextId) === 0) {
          queue.push(nextId);
        }
      }

      // Re-sort queue to maintain critical-path sequence
      queue.sort((a, b) => {
        const prioA = taskMap.get(a)?.priorityScore || 0;
        const prioB = taskMap.get(b)?.priorityScore || 0;
        return prioB - prioA;
      });
    }

    // Handled cycle or disconnected graph: add any missing tasks
    if (sortedTaskIds.length < goalTasks.length) {
      goalTasks.forEach((t) => {
        if (!sortedTaskIds.includes(t.id)) {
          sortedTaskIds.push(t.id);
        }
      });
    }

    // 5. Schedule Allocation with Daily Capacity (8 hours per day max, multiple tasks/blocks per day allowed)
    const DAILY_CAPACITY = 8;
    let currentDayOffset = 1; // start scheduling from tomorrow
    let currentDayScheduledHours = 0;
    const baseDate = new Date(referenceDate);

    await db.transaction(async (tx) => {
      // Clean up only PLANNED schedule blocks for these tasks to prevent overlapping
      // Keep COMPLETED/MISSED historical blocks fully intact for auditing/analytics
      await tx.delete(scheduleBlocks).where(
        and(
          inArray(scheduleBlocks.taskId, taskIds),
          eq(scheduleBlocks.status, 'PLANNED')
        )
      );

      for (const taskId of sortedTaskIds) {
        const task = taskMap.get(taskId)!;
        // Skip completed tasks entirely from rescheduling
        if (task.status === 'COMPLETED') {
          continue;
        }

        let hoursRemaining = task.estimatedHours;

        while (hoursRemaining > 0) {
          const remainingCapacity = DAILY_CAPACITY - currentDayScheduledHours;

          if (remainingCapacity <= 0) {
            // Day capacity exhausted, move to next day
            currentDayOffset++;
            currentDayScheduledHours = 0;
            continue;
          }

          const blockDate = new Date(baseDate);
          blockDate.setDate(baseDate.getDate() + currentDayOffset);
          const dateStr = blockDate.toISOString().split('T')[0];

          // Determine hours for this block: fit within the current day's remaining capacity
          const hoursToSchedule = Math.min(hoursRemaining, remainingCapacity);
          hoursRemaining -= hoursToSchedule;

          const startHour = 9; // Work day starts at 9:00 AM
          const blockStartTime = new Date(blockDate);
          blockStartTime.setHours(startHour + currentDayScheduledHours, 0, 0, 0);

          currentDayScheduledHours += hoursToSchedule;

          const blockEndTime = new Date(blockDate);
          blockEndTime.setHours(startHour + currentDayScheduledHours, 0, 0, 0);

          const blockId = `block-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

          await tx.insert(scheduleBlocks).values({
            id: blockId,
            taskId: task.id,
            scheduledDate: dateStr,
            startTime: blockStartTime,
            endTime: blockEndTime,
            status: 'PLANNED',
          });

          resultSlots.push({
            taskId: task.id,
            taskTitle: task.title,
            scheduledDate: dateStr,
            startTime: blockStartTime,
            endTime: blockEndTime,
          });

          // If we fully hit the capacity for the day, advance to the next day
          if (currentDayScheduledHours >= DAILY_CAPACITY) {
            currentDayOffset++;
            currentDayScheduledHours = 0;
          }
        }
      }
    });

    success = true;
    return resultSlots;
  } catch (error: any) {
    console.error('Scheduling Agent failed:', error);
    failureReason = error.message;
    return [];
  } finally {
    const executionTimeMs = Date.now() - startTime;
    try {
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(agentExecutionLogs).values({
        id: logId,
        userId: userId,
        goalId: goalId,
        agentName: 'SCHEDULING_AGENT',
        inputPayload: JSON.stringify({ goalId, referenceDate }),
        outputPayload: JSON.stringify({
          slots: resultSlots.length > 0 ? resultSlots : null,
          ...(failureReason ? { error: failureReason, failureReason } : {}),
        }),
        executionTimeMs,
        success,
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.error('Failed to log Scheduling Agent execution:', logErr);
    }
  }
}
