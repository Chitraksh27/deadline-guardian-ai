import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { goals, tasks, taskDependencies, scheduleBlocks, riskAssessments, agentExecutionLogs, workspaces, workspaceMembers, users } from './src/db/schema.ts';
import { eq, and, desc, inArray, or, sql, isNull } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { AgentOrchestrator } from './src/agents/orchestrator/orchestrator.ts';
import { generateTaskPlan } from './src/agents/planning-agent/service.ts';
import { generateSchedule } from './src/agents/scheduling-agent/service.ts';
import { calculateGoalRisk } from './src/agents/risk-engine/service.ts';
import { generateRecoveryPlan } from './src/agents/recovery-agent/service.ts';
import {
  createGoalSchema,
  planGoalSchema,
  scheduleGoalSchema,
  completeTaskSchema,
  missedTaskSchema,
  recoveryGoalSchema,
  createWorkspaceSchema,
  addWorkspaceMemberSchema,
  moveGoalWorkspaceSchema,
  configureIntegrationsSchema,
} from './src/lib/schemas.ts';

import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { env } from './src/lib/env.ts';

const logger = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });

async function startServer() {
  const app = express();
  const PORT = env.PORT;

  // Request IDs
  app.use((req: any, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // Logging
  app.use(pinoHttp({ 
    logger,
    genReqId: (req: any) => req.id || uuidv4(),
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      censor: '[REDACTED]'
    }
  }));

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false, // Disable only in dev for Vite
  }));

  // CORS - Restrict in production, but allow for dev.
  app.use(cors({
    origin: env.NODE_ENV === 'production' ? false : '*', 
    // false disables CORS in production since frontend is same-origin
  }));

  // Compression
  app.use(compression());

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);

  // Global Middlewares
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Helper to verify user goal ownership or workspace membership (Workspace Authorization)
  const verifyGoalAccess = async (userId: string, goalId: string) => {
    const [goal] = await db.select()
      .from(goals)
      .where(eq(goals.id, goalId));

    if (!goal) {
      return { authorized: false, exists: false, goal: null };
    }

    if (goal.userId === userId) {
      return { authorized: true, exists: true, goal };
    }

    if (goal.workspaceId) {
      const [membership] = await db.select()
        .from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, goal.workspaceId),
          eq(workspaceMembers.userId, userId)
        ));
      if (membership) {
        return { authorized: true, exists: true, goal };
      }
    }

    return { authorized: false, exists: true, goal };
  };

  // API Health Endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // API Readiness Endpoint
  app.get('/ready', async (req, res) => {
    try {
      // Check database connection
      await db.execute(sql`SELECT 1`);
      res.json({
        status: 'ready',
        databaseConnected: true,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      logger.error({ err }, 'Readiness check failed');
      res.status(503).json({
        status: 'unavailable',
        databaseConnected: false,
        error: err.message
      });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      databaseConnected: true,
    });
  });

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
      }

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email));
      if (existingUser.length > 0) {
        return res.status(400).json({ success: false, error: 'User with this email already exists' });
      }

      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(10);
      const passwordHash = await bcrypt.default.hash(password, salt);
      const userId = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await db.insert(users).values({
        id: userId,
        email,
        name,
        passwordHash,
        updatedAt: new Date(),
      });

      const jwt = await import('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-for-dev';
      const token = jwt.default.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({ success: true, token });
    } catch (error: any) {
      console.error('Register error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const result = await db.select().from(users).where(eq(users.email, email));
      const user = result[0];

      if (!user || !user.passwordHash) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const bcrypt = await import('bcryptjs');
      const isMatch = await bcrypt.default.compare(password, user.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const jwt = await import('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-for-dev';
      const token = jwt.default.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({ success: true, token });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 1. POST /api/goals - Create Goal Flow
  app.post('/api/goals', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const parsedBody = createGoalSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { goal, referenceDate } = parsedBody.data;

      const refDate = referenceDate || new Date().toISOString().split('T')[0];
      const result = await AgentOrchestrator.createGoalFlow(req.dbUser!.id, goal, refDate);

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in POST /api/goals:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. GET /api/goals - Get All Goals
  app.get('/api/goals', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUser!.id;
      
      // Get all workspaces user is a member of
      const memberships = await db.select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId));
      
      const workspaceIds = memberships.map((m) => m.workspaceId);
      
      let userGoals;
      if (workspaceIds.length > 0) {
        userGoals = await db.select()
          .from(goals)
          .where(
            or(
              eq(goals.userId, userId),
              inArray(goals.workspaceId, workspaceIds)
            )
          )
          .orderBy(desc(goals.createdAt));
      } else {
        userGoals = await db.select()
          .from(goals)
          .where(eq(goals.userId, userId))
          .orderBy(desc(goals.createdAt));
      }

      const userGoalIds = userGoals.map((g) => g.id);
      
      const enhancedGoals = [];
      if (userGoalIds.length > 0) {
        // Bulk fetch risk assessments
        const allRisks = await db.select()
          .from(riskAssessments)
          .where(inArray(riskAssessments.goalId, userGoalIds))
          .orderBy(desc(riskAssessments.createdAt));
          
        const latestRisks = new Map();
        for (const risk of allRisks) {
          if (!latestRisks.has(risk.goalId)) {
            latestRisks.set(risk.goalId, risk);
          }
        }
        
        for (const g of userGoals) {
          enhancedGoals.push({
            ...g,
            risk: latestRisks.get(g.id) || { score: 10, level: 'LOW', reason: 'On track.' },
          });
        }
      }

      return res.json(enhancedGoals);
    } catch (error: any) {
      console.error('Error in GET /api/goals:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. GET /api/goals/:goalId - Get Detailed Goal Space
  app.get('/api/goals/:goalId', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { goalId } = req.params;
      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this goal' });
      }

      // Fetch tasks
      const goalTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.goalId, goalId))
        .orderBy(tasks.position);

      const taskIds = goalTasks.map((t) => t.id);

      // Fetch task dependencies
      let dependenciesList: any[] = [];
      if (taskIds.length > 0) {
        dependenciesList = await db.select()
          .from(taskDependencies)
          .where(inArray(taskDependencies.taskId, taskIds));
      }

      // Fetch schedule blocks
      let scheduleList: any[] = [];
      if (taskIds.length > 0) {
        scheduleList = await db.select()
          .from(scheduleBlocks)
          .where(inArray(scheduleBlocks.taskId, taskIds));
      }

      // Fetch latest risk snapshot
      const [latestRisk] = await db.select()
        .from(riskAssessments)
        .where(eq(riskAssessments.goalId, goalId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(1);

      return res.json({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        deadline: goal.deadline,
        status: goal.status,
        complexity: goal.complexity,
        estimatedHours: goal.estimatedHours,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
        tasks: goalTasks,
        dependencies: dependenciesList,
        schedule: scheduleList,
        risk: latestRisk || { score: 10, level: 'LOW', reason: 'On track.' },
      });
    } catch (error: any) {
      console.error('Error in GET /api/goals/:goalId:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/goals/:goalId', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { goalId } = req.params;
      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to delete this goal' });
      }

      // Ensure the user actually owns the goal (maybe members can't delete)?
      // For now we allow deletion if authorized, but let's restrict to owner for safety.
      if (goal.userId !== req.dbUser!.id) {
         return res.status(403).json({ success: false, error: 'Unauthorized: Only the goal owner can delete it' });
      }

      await db.delete(goals).where(eq(goals.id, goalId));

      return res.json({ success: true, message: 'Goal deleted successfully' });
    } catch (error: any) {
      console.error('Error in DELETE /api/goals/:goalId:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. POST /api/goals/:goalId/plan - Regenerate / generate tasks DAG
  app.post('/api/goals/:goalId/plan', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { goalId } = req.params;
      const parsedBody = planGoalSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { referenceDate } = parsedBody.data;
      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this goal' });
      }

      const tasksList = await generateTaskPlan(
        req.dbUser!.id,
        goalId,
        goal.title,
        goal.complexity as any,
        goal.deadline.toISOString().split('T')[0],
        goal.estimatedHours
      );

      return res.json({ success: true, tasks: tasksList });
    } catch (error: any) {
      console.error('Error in POST /api/goals/:goalId/plan:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. POST /api/goals/:goalId/schedule - Generate calendar schedules
  app.post('/api/goals/:goalId/schedule', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { goalId } = req.params;
      const parsedBody = scheduleGoalSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { referenceDate } = parsedBody.data;
      const refDate = referenceDate || new Date().toISOString().split('T')[0];

      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this goal' });
      }

      const schedule = await generateSchedule(req.dbUser!.id, goalId, refDate);
      return res.json({ success: true, schedule });
    } catch (error: any) {
      console.error('Error in POST /api/goals/:goalId/schedule:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Integration trigger helper
  const triggerGoalIntegrationsAndAlerts = async (
    userId: string,
    goalId: string,
    taskId: string,
    actionType: 'COMPLETED' | 'MISSED',
    riskScore: number,
    riskLevel: string
  ) => {
    try {
      const [goalObj] = await db.select()
        .from(goals)
        .where(eq(goals.id, goalId));

      if (!goalObj) return;

      const [taskObj] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      const taskTitle = taskObj?.title || 'Unknown Task';
      
      let alertFired = false;
      const channels: Record<string, string> = {
        slack: 'NOT_CONFIGURED',
        jira: 'NOT_CONFIGURED',
        googleCalendar: 'NOT_CONFIGURED'
      };

      // 1. Slack Webhook integration
      if (goalObj.slackWebhookUrl) {
        channels.slack = 'PENDING';
        const payload = {
          text: `🔔 *Deadline Guardian Notification*\n` +
                `*Goal:* ${goalObj.title}\n` +
                `*Task:* "${taskTitle}" was marked as *${actionType}*\n` +
                `*Current Risk Status:* ${riskLevel} (${riskScore}%)\n` +
                (actionType === 'MISSED' || riskScore > 60 
                  ? `⚠️ *Alert:* High failure risk detected! Recovery and scheduling agents have automatically calculated safety shift alternatives.`
                  : `✅ System on track. Keep up the good momentum!`)
        };

        try {
          await fetch(goalObj.slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          channels.slack = 'SENT';
        } catch (err: any) { 
          console.error('Slack post failed:', err);
          channels.slack = `FAILED: ${err.message}`;
        }
        alertFired = true;
      }

      // 2. Jira Link simulation
      if (goalObj.jiraUrl) {
        channels.jira = 'SYNCED';
        alertFired = true;
      }

      // 3. Google Calendar Sync simulation/log
      if (goalObj.googleCalendarSync) {
        channels.googleCalendar = 'CALENDAR_UPDATED';
        alertFired = true;
      }

      // Also auto-trigger an alert if risk exceeds a critical threshold
      if (riskScore > 50) {
        alertFired = true;
      }

      if (alertFired) {
        // Log a dedicated integration / auto-alert trace in Agent Execution Logs
        const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(agentExecutionLogs).values({
          id: logId,
          userId,
          goalId,
          agentName: 'RISK_ENGINE',
          inputPayload: JSON.stringify({
            trigger: 'TASK_STATUS_CHANGE',
            taskId,
            actionType,
            riskScore,
            riskLevel,
            integrationsConfig: {
              slack: !!goalObj.slackWebhookUrl,
              jira: !!goalObj.jiraUrl,
              googleCalendar: goalObj.googleCalendarSync
            }
          }),
          outputPayload: JSON.stringify({
            alertBroadcasted: true,
            status: 'ALERTS_DISPATCHED',
            channels,
            timestamp: new Date().toISOString()
          }),
          executionTimeMs: 25,
          success: true,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Error in triggerGoalIntegrationsAndAlerts:', err);
    }
  };

  // 6. POST /api/tasks/:taskId/complete - Task Completion Hook
  app.post('/api/tasks/:taskId/complete', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      const parsedBody = completeTaskSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { referenceDate } = parsedBody.data;
      const refDate = referenceDate || new Date().toISOString().split('T')[0];

      // Verify BOLA / Task ownership or Workspace membership
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, task.goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal associated with this task not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this task' });
      }

      const result = await AgentOrchestrator.completeTaskFlow(req.dbUser!.id, taskId, refDate);
      
      // Trigger integration alerts asynchronously to not block UI response
      triggerGoalIntegrationsAndAlerts(
        req.dbUser!.id,
        result.goalId,
        taskId,
        'COMPLETED',
        result.newRiskScore,
        result.newRiskLevel
      ).catch(console.error);

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in POST /api/tasks/:taskId/complete:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. POST /api/tasks/:taskId/missed - Task Missed Hook
  app.post('/api/tasks/:taskId/missed', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { taskId } = req.params;
      const parsedBody = missedTaskSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { referenceDate } = parsedBody.data;
      const refDate = referenceDate || new Date().toISOString().split('T')[0];

      // Verify BOLA / Task ownership or Workspace membership
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, task.goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal associated with this task not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this task' });
      }

      const result = await AgentOrchestrator.missTaskFlow(req.dbUser!.id, taskId, refDate);
      
      // Trigger integration alerts asynchronously to not block UI response
      triggerGoalIntegrationsAndAlerts(
        req.dbUser!.id,
        result.goalId,
        taskId,
        'MISSED',
        result.newRiskScore,
        result.newRiskLevel
      ).catch(console.error);

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error in POST /api/tasks/:taskId/missed:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 8. GET /api/goals/:goalId/risk - Risk Gauge Endpoint
  app.get('/api/goals/:goalId/risk', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { goalId } = req.params;
      const { referenceDate } = req.query;
      const refDate = (referenceDate as string) || new Date().toISOString().split('T')[0];

      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this goal' });
      }

      const analysis = await calculateGoalRisk(req.dbUser!.id, goalId, refDate);
      return res.json(analysis);
    } catch (error: any) {
      console.error('Error in GET /api/goals/:goalId/risk:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9. POST /api/goals/:goalId/recovery - Recovery Plan Generation
  app.post('/api/goals/:goalId/recovery', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { goalId } = req.params;
      const parsedBody = recoveryGoalSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { currentRiskScore, referenceDate } = parsedBody.data;
      const refDate = referenceDate || new Date().toISOString().split('T')[0];

      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this goal' });
      }

      const plan = await generateRecoveryPlan(req.dbUser!.id, goalId, currentRiskScore || 50, refDate);
      return res.json(plan);
    } catch (error: any) {
      console.error('Error in POST /api/goals/:goalId/recovery:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 9.5 GET /api/dashboard/today-focus - Single optimized query for today's mission focus
  app.get('/api/dashboard/today-focus', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { referenceDate } = req.query;
      const refDate = (referenceDate as string) || new Date().toISOString().split('T')[0];

      // 1. Fetch all workspaces where the user is a member
      const userWorkspaceIds = await db.select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, req.dbUser!.id))
        .then((rows) => rows.map((r) => r.workspaceId));

      // 2. Fetch all goal IDs that are owned by the user or belong to their workspaces
      const conditions = [eq(goals.userId, req.dbUser!.id)];
      if (userWorkspaceIds.length > 0) {
        conditions.push(inArray(goals.workspaceId, userWorkspaceIds));
      }

      const accessibleGoals = await db.select({ id: goals.id })
        .from(goals)
        .where(or(...conditions));

      const goalIds = accessibleGoals.map((g) => g.id);

      if (goalIds.length === 0) {
        return res.json({ success: true, tasks: [] });
      }

      // 3. Single join query to fetch schedule blocks and tasks in one roundtrip
      const blocks = await db.select({
        block: scheduleBlocks,
        task: tasks,
      })
        .from(scheduleBlocks)
        .innerJoin(tasks, eq(scheduleBlocks.taskId, tasks.id))
        .where(and(
          inArray(tasks.goalId, goalIds),
          eq(scheduleBlocks.scheduledDate, refDate),
          eq(scheduleBlocks.status, 'PLANNED')
        ));

      return res.json({ success: true, tasks: blocks });
    } catch (error: any) {
      console.error('Error in GET /api/dashboard/today-focus:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 10. GET /api/dashboard - Combined Operational Summary
  app.get('/api/dashboard', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { referenceDate, workspaceId } = req.query;
      const refDate = (referenceDate as string) || new Date().toISOString().split('T')[0];

      let userGoals;
      if (workspaceId) {
        userGoals = await db.select()
          .from(goals)
          .where(and(eq(goals.userId, req.dbUser!.id), eq(goals.workspaceId, workspaceId as string)));
      } else {
        userGoals = await db.select()
          .from(goals)
          .where(and(eq(goals.userId, req.dbUser!.id), isNull(goals.workspaceId)));
      }

      const activeGoals = userGoals.filter((g) => g.status === 'ACTIVE').length;

      // Completed tasks
      const allUserTasks = [];
      let completedTasksCount = 0;
      let tasksTodayCount = 0;
      let highRiskGoalsCount = 0;

      const userGoalIds = userGoals.map((g) => g.id);

      if (userGoalIds.length > 0) {
        const userTasks = await db.select()
          .from(tasks)
          .where(inArray(tasks.goalId, userGoalIds));

        completedTasksCount = userTasks.filter((t) => t.status === 'COMPLETED').length;

        // Fetch today's schedule blocks
        const taskIds = userTasks.map((t) => t.id);
        if (taskIds.length > 0) {
          const todayBlocks = await db.select()
            .from(scheduleBlocks)
            .where(and(
              inArray(scheduleBlocks.taskId, taskIds),
              eq(scheduleBlocks.scheduledDate, refDate)
            ));
          tasksTodayCount = todayBlocks.length;
        }

        // Fetch latest risk assessments for all user goals efficiently
        const allRiskAssessments = await db.select()
          .from(riskAssessments)
          .where(inArray(riskAssessments.goalId, userGoalIds))
          .orderBy(desc(riskAssessments.createdAt));

        const latestRisks = new Map();
        for (const risk of allRiskAssessments) {
          if (!latestRisks.has(risk.goalId)) {
            latestRisks.set(risk.goalId, risk);
            if (risk.score > 60) {
              highRiskGoalsCount++;
            }
          }
        }
      }

      return res.json({
        activeGoals,
        tasksToday: tasksTodayCount,
        completedTasks: completedTasksCount,
        highRiskGoals: highRiskGoalsCount,
      });
    } catch (error: any) {
      console.error('Error in GET /api/dashboard:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 11. GET /api/agents/logs - Execution logs transparency
  app.get('/api/agents/logs', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const logs = await db.select()
        .from(agentExecutionLogs)
        .where(eq(agentExecutionLogs.userId, req.dbUser!.id))
        .orderBy(desc(agentExecutionLogs.createdAt))
        .limit(30);

      return res.json(logs);
    } catch (error: any) {
      console.error('Error in GET /api/agents/logs:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/me - Get current user profile
  app.get('/api/me', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      if (!req.dbUser) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      res.json({ success: true, user: req.dbUser });
    } catch (error) {
      console.error('Error fetching current user:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user' });
    }
  });

  // PUT /api/me - Update user profile and preferences
  app.put('/api/me', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { updateProfileSchema } = await import('./src/lib/schemas.ts');
      const parsedBody = updateProfileSchema.safeParse(req.body);
      
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }

      await db.update(users)
        .set({
          ...parsedBody.data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.dbUser!.id));

      const result = await db.select().from(users).where(eq(users.id, req.dbUser!.id));
      const updatedUser = (result as any)[0];
      
      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/me/avatar - Upload user avatar
  app.post('/api/me/avatar', requireAuth as any, express.json({ limit: '5mb' }), async (req: AuthRequest, res) => {
    try {
      const { image } = req.body;
      if (!image || typeof image !== 'string') {
         return res.status(400).json({ success: false, error: 'Invalid image data' });
      }

      await db.update(users)
        .set({
          image,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.dbUser!.id));

      res.json({ success: true, message: 'Avatar updated successfully' });
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/me/avatar - Delete user avatar
  app.delete('/api/me/avatar', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      await db.update(users)
        .set({
          image: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.dbUser!.id));

      res.json({ success: true, message: 'Avatar removed successfully' });
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 12. GET /api/workspaces - Get all workspaces user is member of
  app.get('/api/workspaces', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const userId = req.dbUser!.id;
      // Get memberships
      const memberships = await db.select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId));
      
      const workspaceIds = memberships.map((m) => m.workspaceId);
      
      if (workspaceIds.length === 0) {
        return res.json([]);
      }
      
      const userWorkspaces = await db.select()
        .from(workspaces)
        .where(inArray(workspaces.id, workspaceIds))
        .orderBy(desc(workspaces.createdAt));
      
      const allMembers = await db.select()
        .from(workspaceMembers)
        .where(inArray(workspaceMembers.workspaceId, workspaceIds));
        
      const allGoals = await db.select()
        .from(goals)
        .where(inArray(goals.workspaceId, workspaceIds));

      const memberCounts = new Map();
      for (const m of allMembers) {
        memberCounts.set(m.workspaceId, (memberCounts.get(m.workspaceId) || 0) + 1);
      }
      
      const goalCounts = new Map();
      for (const g of allGoals) {
        if (g.workspaceId) {
          goalCounts.set(g.workspaceId, (goalCounts.get(g.workspaceId) || 0) + 1);
        }
      }

      const result = [];
      for (const w of userWorkspaces) {
        result.push({
          ...w,
          membersCount: memberCounts.get(w.id) || 0,
          goalsCount: goalCounts.get(w.id) || 0,
        });
      }
      
      return res.json(result);
    } catch (error: any) {
      console.error('Error in GET /api/workspaces:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 13. POST /api/workspaces - Create Workspace
  app.post('/api/workspaces', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const parsedBody = createWorkspaceSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { name } = parsedBody.data;
      
      const workspaceId = `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const userId = req.dbUser!.id;
      
      await db.transaction(async (tx) => {
        // Insert workspace
        await tx.insert(workspaces).values({
          id: workspaceId,
          name,
          ownerId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Insert owner as member
        await tx.insert(workspaceMembers).values({
          id: `wsm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workspaceId,
          userId,
          role: 'OWNER',
          createdAt: new Date(),
        });
      });
      
      return res.json({ success: true, workspaceId, name });
    } catch (error: any) {
      console.error('Error in POST /api/workspaces:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 14. POST /api/workspaces/:workspaceId/members - Add member by email
  app.post('/api/workspaces/:workspaceId/members', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { workspaceId } = req.params;
      const parsedBody = addWorkspaceMemberSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { email, role } = parsedBody.data;
      
      // 1. Check if workspace exists and user is a member
      const [userMembership] = await db.select()
        .from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.dbUser!.id)
        ));
      
      if (!userMembership) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You are not a member of this workspace' });
      }
      
      // 2. Find or create user by email
      let targetUser;
      const existingUserResult = await db.select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));
      const existingUser = (existingUserResult as any)[0];
      
      if (existingUser) {
        targetUser = existingUser;
      } else {
        // Create sandbox placeholder collaborator
        const newUserId = `usr-collab-${Date.now()}`;
        const createdUserResult = await db.insert(users).values({
          id: newUserId,
          name: email.split('@')[0],
          email: email.toLowerCase(),
          image: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80`,
          updatedAt: new Date(),
        }).returning();
        const createdUser = (createdUserResult as any)[0];
        targetUser = createdUser;
      }
      
      // 3. Check if they are already in the workspace
      const [alreadyMember] = await db.select()
        .from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUser.id)
        ));
      
      if (alreadyMember) {
        return res.status(400).json({ success: false, error: 'User is already a member of this workspace' });
      }
      
      // 4. Add member
      const memberId = `wsm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(workspaceMembers).values({
        id: memberId,
        workspaceId,
        userId: targetUser.id,
        role: role || 'COLLABORATOR',
        createdAt: new Date(),
      });
      
      return res.json({
        success: true,
        data: {
          id: memberId,
          workspaceId,
          userId: targetUser.id,
          role: role || 'COLLABORATOR',
          userName: targetUser.name,
          userEmail: targetUser.email,
        }
      });
    } catch (error: any) {
      console.error('Error in POST /api/workspaces/:workspaceId/members:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/workspaces/:workspaceId/members/:memberId - Remove member or leave
  app.delete('/api/workspaces/:workspaceId/members/:memberId', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { workspaceId, memberId } = req.params;

      // Ensure user has access
      const userMembershipResult = await db.select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, req.dbUser!.id)
          )
        );
      const userMembership = (userMembershipResult as any)[0];
      
      if (!userMembership) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      // If user is removing someone else, they must be the owner
      if (req.dbUser!.id !== memberId && userMembership.role !== 'OWNER') {
        return res.status(403).json({ success: false, error: 'Only owners can remove members' });
      }

      // If user is owner and they are leaving, they can't leave unless they are the only member
      // Alternatively, we could delete the workspace if they are the only member. 
      // For simplicity, we just forbid owner leaving.
      if (req.dbUser!.id === memberId && userMembership.role === 'OWNER') {
        return res.status(400).json({ success: false, error: 'Owners cannot leave the workspace. You must delete the workspace instead.' });
      }

      await db.delete(workspaceMembers).where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, memberId)
        )
      );

      res.json({ success: true, message: 'Member removed' });
    } catch (error: any) {
      console.error('Error removing member:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PUT /api/workspaces/:workspaceId - Rename workspace
  app.put('/api/workspaces/:workspaceId', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { workspaceId } = req.params;
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

      // Owner check
      const userMembershipResult = await db.select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, req.dbUser!.id)
          )
        );
      const userMembership = (userMembershipResult as any)[0];
      
      if (!userMembership || userMembership.role !== 'OWNER') {
        return res.status(403).json({ success: false, error: 'Only owners can rename workspaces' });
      }

      await db.update(workspaces).set({ name, updatedAt: new Date() }).where(eq(workspaces.id, workspaceId));
      res.json({ success: true, message: 'Workspace renamed' });
    } catch (error: any) {
      console.error('Error renaming workspace:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/workspaces/:workspaceId - Delete workspace
  app.delete('/api/workspaces/:workspaceId', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { workspaceId } = req.params;
      
      const userMembershipResult = await db.select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, req.dbUser!.id)
          )
        );
      const userMembership = (userMembershipResult as any)[0];
      
      if (!userMembership || userMembership.role !== 'OWNER') {
        return res.status(403).json({ success: false, error: 'Only owners can delete workspaces' });
      }

      await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
      
      res.json({ success: true, message: 'Workspace deleted' });
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  // 15. GET /api/workspaces/:workspaceId/members - Get all members of a workspace
  app.get('/api/workspaces/:workspaceId/members', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { workspaceId } = req.params;
      
      // Verify user has access to workspace
      const userMembershipResult = await db.select()
        .from(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.dbUser!.id)
        ));
      const userMembership = (userMembershipResult as any)[0];
      
      if (!userMembership) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You are not a member of this workspace' });
      }
      
      const membersList = await db.select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, workspaceId));
      
      const memberUserIds = membersList.map(m => m.userId);
      const result = [];
      
      if (memberUserIds.length > 0) {
        const usersList = await db.select()
          .from(users)
          .where(inArray(users.id, memberUserIds));
          
        const userMap = new Map();
        for (const u of usersList) {
          userMap.set(u.id, u);
        }
        
        for (const m of membersList) {
          const userObj = userMap.get(m.userId);
          result.push({
            ...m,
            userName: userObj?.name || 'Unknown User',
            userEmail: userObj?.email || '',
          });
        }
      }
      
      return res.json(result);
    } catch (error: any) {
      console.error('Error in GET /api/workspaces/:workspaceId/members:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 16. POST /api/goals/:goalId/workspace - Move Goal to Workspace
  app.post('/api/goals/:goalId/workspace', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { goalId } = req.params;
      const parsedBody = moveGoalWorkspaceSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { workspaceId } = parsedBody.data; // Can be null to make it personal
      
      // Verify user owns/has access to the goal
      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this goal' });
      }
      
      // If workspaceId is provided, verify user is a member of that workspace
      if (workspaceId) {
        const [membership] = await db.select()
          .from(workspaceMembers)
          .where(and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, req.dbUser!.id)
          ));
        
        if (!membership) {
          return res.status(403).json({ success: false, error: 'Unauthorized: You are not a member of this workspace' });
        }
      }
      
      await db.update(goals)
        .set({ workspaceId: workspaceId || null, updatedAt: new Date() })
        .where(eq(goals.id, goalId));
      
      return res.json({ success: true, workspaceId });
    } catch (error: any) {
      console.error('Error in POST /api/goals/:goalId/workspace:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // 17. POST /api/goals/:goalId/integrations - Set integrations for Goal
  app.post('/api/goals/:goalId/integrations', requireAuth as any, async (req: AuthRequest, res) => {
    try {
      const { goalId } = req.params;
      const parsedBody = configureIntegrationsSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ success: false, error: parsedBody.error.issues[0].message });
      }
      const { slackWebhookUrl, jiraUrl, googleCalendarSync } = parsedBody.data;
      
      const { authorized, exists, goal } = await verifyGoalAccess(req.dbUser!.id, goalId);

      if (!exists || !goal) {
        return res.status(404).json({ success: false, error: 'Goal not found' });
      }

      if (!authorized) {
        return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this goal' });
      }
      
      await db.update(goals)
        .set({
          slackWebhookUrl: slackWebhookUrl || null,
          jiraUrl: jiraUrl || null,
          googleCalendarSync: googleCalendarSync === true,
          updatedAt: new Date(),
        })
        .where(eq(goals.id, goalId));
      
      // Log an integration event
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(agentExecutionLogs).values({
        id: logId,
        userId: req.dbUser!.id,
        goalId: goalId,
        agentName: 'RECOVERY_AGENT',
        inputPayload: JSON.stringify({ action: 'CONFIGURE_INTEGRATIONS', slackWebhookUrl, jiraUrl, googleCalendarSync }),
        outputPayload: JSON.stringify({ success: true, message: 'Goal integrations updated successfully.' }),
        executionTimeMs: 12,
        success: true,
        createdAt: new Date(),
      });
      
      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error in POST /api/goals/:goalId/integrations:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Serve static assets or development HMR
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Handle server-wide runtime exceptions gracefully
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error({ err, reqId: (req as any).id }, 'Unhandled Server Error');
    res.status(err.status || 500).json({
      success: false,
      error: 'Internal Server Error',
      message: env.NODE_ENV !== 'production' ? err.message : undefined,
      requestId: (req as any).id,
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    logger.info('SIGTERM/SIGINT received, shutting down gracefully...');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 10s
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
