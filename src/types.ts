export interface RiskAssessment {
  id: string;
  goalId: string;
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  reason: string;
  createdAt: string;
}

export interface Task {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  estimatedHours: number;
  actualHours: number;
  priorityScore: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
}

export interface ScheduleBlock {
  id: string;
  taskId: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  status: 'PLANNED' | 'COMPLETED' | 'MISSED';
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedHours: number;
  workspaceId: string | null;
  slackWebhookUrl: string | null;
  jiraUrl: string | null;
  googleCalendarSync: boolean;
  createdAt: string;
  updatedAt: string;
  risk?: RiskAssessment;
}

export interface GoalDetailed extends Goal {
  tasks: Task[];
  dependencies: TaskDependency[];
  schedule: ScheduleBlock[];
}

export interface AgentLog {
  id: string;
  userId: string;
  goalId: string | null;
  agentName: 'GOAL_AGENT' | 'PLANNING_AGENT' | 'SCHEDULING_AGENT' | 'RISK_ENGINE' | 'RECOVERY_AGENT';
  inputPayload: string;
  outputPayload: string;
  executionTimeMs: number;
  success: boolean;
  createdAt: string;
}

export interface DashboardMetrics {
  activeGoals: number;
  tasksToday: number;
  completedTasks: number;
  highRiskGoals: number;
}

export interface RecoveryPlan {
  riskBefore: number;
  riskAfter: number;
  recommendations: string[];
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  locale: string;
  timezone: string;
  theme: string;
  defaultWorkspaceId: string | null;
  compactMode: boolean;
  showCompletedGoals: boolean;
  schedulingPreferredWorkHours: string;
  schedulingDailyWorkCapacity: number;
  schedulingWeekendScheduling: boolean;
  schedulingPreferredFocusDuration: number;
  aiExplanationDetail: string;
  aiNotificationVerbosity: string;
  aiAutoGenerateRecoveryPlans: boolean;
  aiAutoRefreshRiskAnalysis: boolean;
  notificationEmail: boolean;
  notificationSlack: boolean;
  notificationBrowser: boolean;
  notificationDailySummary: boolean;
  notificationDeadlineReminders: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  membersCount?: number;
  goalsCount?: number;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'COLLABORATOR';
  userName?: string;
  userEmail?: string;
}

export interface WorkspaceDetailed extends Workspace {
  members: WorkspaceMember[];
  goals: Goal[];
}
