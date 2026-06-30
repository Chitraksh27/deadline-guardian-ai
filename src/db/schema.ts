import { pgTable, text, timestamp, integer, boolean, doublePrecision, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID
  name: text('name'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  image: text('image'),
  
  // Profile settings
  locale: text('locale').default('en-US').notNull(),
  timezone: text('timezone').default('UTC').notNull(),
  
  // UI Preferences
  theme: text('theme').default('SYSTEM').notNull(),
  defaultWorkspaceId: text('default_workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  compactMode: boolean('compact_mode').default(false).notNull(),
  showCompletedGoals: boolean('show_completed_goals').default(true).notNull(),

  // Scheduling Preferences
  schedulingPreferredWorkHours: text('scheduling_preferred_work_hours').default('09:00-17:00').notNull(),
  schedulingDailyWorkCapacity: integer('scheduling_daily_work_capacity').default(4).notNull(), // hours
  schedulingWeekendScheduling: boolean('scheduling_weekend_scheduling').default(false).notNull(),
  schedulingPreferredFocusDuration: integer('scheduling_preferred_focus_duration').default(90).notNull(), // minutes

  // AI Preferences
  aiExplanationDetail: text('ai_explanation_detail').default('NORMAL').notNull(), // CONCISE, NORMAL, VERBOSE
  aiNotificationVerbosity: text('ai_notification_verbosity').default('NORMAL').notNull(), // LOW, NORMAL, HIGH
  aiAutoGenerateRecoveryPlans: boolean('ai_auto_generate_recovery_plans').default(true).notNull(),
  aiAutoRefreshRiskAnalysis: boolean('ai_auto_refresh_risk_analysis').default(true).notNull(),

  // Notifications
  notificationEmail: boolean('notification_email').default(true).notNull(),
  notificationSlack: boolean('notification_slack').default(false).notNull(),
  notificationBrowser: boolean('notification_browser').default(true).notNull(),
  notificationDailySummary: boolean('notification_daily_summary').default(true).notNull(),
  notificationDeadlineReminders: boolean('notification_deadline_reminders').default(true).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  goals: many(goals),
  agentExecutionLogs: many(agentExecutionLogs),
}));

// 2. Goals Table
export const goals = pgTable('goals', {
  id: text('id').primaryKey(), // Generated UUID in app
  userId: text('user_id').notNull().references(() => users.id),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  deadline: timestamp('deadline').notNull(),
  status: text('status').default('ACTIVE').notNull(), // ACTIVE, COMPLETED, CANCELLED, ARCHIVED
  complexity: text('complexity').default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH
  estimatedHours: doublePrecision('estimated_hours').default(0).notNull(),
  actualHours: doublePrecision('actual_hours').default(0).notNull(),
  slackWebhookUrl: text('slack_webhook_url'),
  jiraUrl: text('jira_url'),
  googleCalendarSync: boolean('google_calendar_sync').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    goalsUserIdIdx: index('goals_user_id_idx').on(table.userId),
    goalsWorkspaceIdIdx: index('goals_workspace_id_idx').on(table.workspaceId),
  };
});

// Goals Relations
export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [goals.workspaceId],
    references: [workspaces.id],
  }),
  tasks: many(tasks),
  riskAssessments: many(riskAssessments),
  agentExecutionLogs: many(agentExecutionLogs),
}));

// 3. Tasks Table
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  estimatedHours: doublePrecision('estimated_hours').default(0).notNull(),
  actualHours: doublePrecision('actual_hours').default(0).notNull(),
  priorityScore: integer('priority_score').default(0).notNull(),
  status: text('status').default('PENDING').notNull(), // PENDING, IN_PROGRESS, COMPLETED, MISSED
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    tasksGoalIdIdx: index('tasks_goal_id_idx').on(table.goalId),
  };
});

// Tasks Relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  goal: one(goals, {
    fields: [tasks.goalId],
    references: [goals.id],
  }),
  scheduleBlocks: many(scheduleBlocks),
  dependencies: many(taskDependencies, { relationName: 'task_dependencies' }),
  dependents: many(taskDependencies, { relationName: 'task_dependents' }),
}));

// 4. Task Dependencies Table (Self-referential join table)
export const taskDependencies = pgTable('task_dependencies', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  dependsOnTaskId: text('depends_on_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
}, (table) => {
  return {
    taskDependenciesTaskIdIdx: index('task_dependencies_task_id_idx').on(table.taskId),
    taskDependenciesDependsOnTaskIdIdx: index('task_dependencies_depends_on_task_id_idx').on(table.dependsOnTaskId),
  };
});

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
  task: one(tasks, {
    fields: [taskDependencies.taskId],
    references: [tasks.id],
    relationName: 'task_dependencies',
  }),
  dependsOnTask: one(tasks, {
    fields: [taskDependencies.dependsOnTaskId],
    references: [tasks.id],
    relationName: 'task_dependents',
  }),
}));

// 5. Schedule Blocks Table
export const scheduleBlocks = pgTable('schedule_blocks', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  scheduledDate: text('scheduled_date').notNull(), // YYYY-MM-DD
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: text('status').default('PLANNED').notNull(), // PLANNED, COMPLETED, MISSED
}, (table) => {
  return {
    scheduleBlocksTaskIdIdx: index('schedule_blocks_task_id_idx').on(table.taskId),
  };
});

export const scheduleBlocksRelations = relations(scheduleBlocks, ({ one }) => ({
  task: one(tasks, {
    fields: [scheduleBlocks.taskId],
    references: [tasks.id],
  }),
}));

// 6. Risk Assessments Table
export const riskAssessments = pgTable('risk_assessments', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(), // 0-100
  level: text('level').notNull(), // LOW, MEDIUM, HIGH
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    riskAssessmentsGoalIdIdx: index('risk_assessments_goal_id_idx').on(table.goalId),
  };
});

export const riskAssessmentsRelations = relations(riskAssessments, ({ one }) => ({
  goal: one(goals, {
    fields: [riskAssessments.goalId],
    references: [goals.id],
  }),
}));

// 7. Agent Execution Logs Table
export const agentExecutionLogs = pgTable('agent_execution_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  goalId: text('goal_id').references(() => goals.id, { onDelete: 'cascade' }),
  agentName: text('agent_name').notNull(), // GOAL_AGENT, PLANNING_AGENT, SCHEDULING_AGENT, RISK_ENGINE, RECOVERY_AGENT
  inputPayload: text('input_payload').notNull(), // Stringified JSON input
  outputPayload: text('output_payload').notNull(), // Stringified JSON output
  executionTimeMs: integer('execution_time_ms').notNull(),
  success: boolean('success').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agentExecutionLogsRelations = relations(agentExecutionLogs, ({ one }) => ({
  user: one(users, {
    fields: [agentExecutionLogs.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [agentExecutionLogs.goalId],
    references: [goals.id],
  }),
}));

// 8. Workspaces Table
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Workspaces Relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  goals: many(goals),
}));

// 9. Workspace Members Table
export const workspaceMembers = pgTable('workspace_members', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').default('COLLABORATOR').notNull(), // OWNER, COLLABORATOR
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    workspaceMembersWorkspaceIdIdx: index('workspace_members_workspace_id_idx').on(table.workspaceId),
    workspaceMembersUserIdIdx: index('workspace_members_user_id_idx').on(table.userId),
  };
});

// Workspace Members Relations
export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));
