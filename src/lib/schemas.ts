import { z } from 'zod';

// Date regex to check YYYY-MM-DD format if provided
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// 1. Create Goal Schema
export const createGoalSchema = z.object({
  goal: z.string().min(1, 'Goal string cannot be empty'),
  referenceDate: z.string().regex(dateRegex, 'Reference date must be in YYYY-MM-DD format').optional().nullable(),
});

// 2. Plan Goal Schema (Regenerate plan)
export const planGoalSchema = z.object({
  referenceDate: z.string().regex(dateRegex, 'Reference date must be in YYYY-MM-DD format').optional().nullable(),
});

// 3. Schedule Goal Schema
export const scheduleGoalSchema = z.object({
  referenceDate: z.string().regex(dateRegex, 'Reference date must be in YYYY-MM-DD format').optional().nullable(),
});

// 4. Complete Task Schema
export const completeTaskSchema = z.object({
  referenceDate: z.string().regex(dateRegex, 'Reference date must be in YYYY-MM-DD format').optional().nullable(),
});

// 5. Missed Task Schema
export const missedTaskSchema = z.object({
  referenceDate: z.string().regex(dateRegex, 'Reference date must be in YYYY-MM-DD format').optional().nullable(),
});

// 6. Recovery Goal Schema
export const recoveryGoalSchema = z.object({
  currentRiskScore: z.number().min(0, 'Risk score cannot be negative').max(100, 'Risk score cannot exceed 100').optional().nullable(),
  referenceDate: z.string().regex(dateRegex, 'Reference date must be in YYYY-MM-DD format').optional().nullable(),
});

// 7. Create Workspace Schema
export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name cannot be empty').max(100, 'Workspace name is too long'),
});

// 8. Add Workspace Member Schema
export const addWorkspaceMemberSchema = z.object({
  email: z.string().email('Invalid email address format'),
  role: z.enum(['OWNER', 'COLLABORATOR']).default('COLLABORATOR'),
});

// 9. Move Goal Workspace Schema
export const moveGoalWorkspaceSchema = z.object({
  workspaceId: z.string().nullable().optional(),
});

// 11. Update Profile Schema
export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address format').optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  theme: z.enum(['SYSTEM', 'LIGHT', 'DARK']).optional(),
  defaultWorkspaceId: z.string().nullable().optional(),
  compactMode: z.boolean().optional(),
  showCompletedGoals: z.boolean().optional(),
  schedulingPreferredWorkHours: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Must be in HH:MM-HH:MM format').optional(),
  schedulingDailyWorkCapacity: z.number().min(1).max(24).optional(),
  schedulingWeekendScheduling: z.boolean().optional(),
  schedulingPreferredFocusDuration: z.number().min(15).max(480).optional(),
  aiExplanationDetail: z.enum(['CONCISE', 'NORMAL', 'VERBOSE']).optional(),
  aiNotificationVerbosity: z.enum(['LOW', 'NORMAL', 'HIGH']).optional(),
  aiAutoGenerateRecoveryPlans: z.boolean().optional(),
  aiAutoRefreshRiskAnalysis: z.boolean().optional(),
  notificationEmail: z.boolean().optional(),
  notificationSlack: z.boolean().optional(),
  notificationBrowser: z.boolean().optional(),
  notificationDailySummary: z.boolean().optional(),
  notificationDeadlineReminders: z.boolean().optional(),
});
// 10. Configure Integrations Schema
export const configureIntegrationsSchema = z.object({
  slackWebhookUrl: z.string()
    .url('Invalid Slack Webhook URL')
    .refine(url => !url || url.startsWith('https://hooks.slack.com/'), 'Must be a valid Slack webhook URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  jiraUrl: z.string()
    .url('Invalid Jira URL')
    .refine(url => !url || url.startsWith('https://'), 'Must be an HTTPS URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  googleCalendarSync: z.boolean().optional(),
});
