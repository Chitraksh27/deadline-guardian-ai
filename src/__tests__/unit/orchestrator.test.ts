import { describe, it, expect, vi } from 'vitest';
import { AgentOrchestrator } from '../../agents/orchestrator/orchestrator.ts';
import * as goalAgent from '../../agents/goal-agent/service.ts';
import * as planningAgent from '../../agents/planning-agent/service.ts';
import * as schedulingAgent from '../../agents/scheduling-agent/service.ts';
import * as riskEngine from '../../agents/risk-engine/service.ts';

// Mock dependencies
vi.mock('../../db/index.ts', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-goal' }])
      })
    })
  }
}));

vi.mock('../../agents/goal-agent/service.ts', () => ({
  parseGoal: vi.fn()
}));

vi.mock('../../agents/planning-agent/service.ts', () => ({
  generateTaskPlan: vi.fn()
}));

vi.mock('../../agents/scheduling-agent/service.ts', () => ({
  generateSchedule: vi.fn()
}));

vi.mock('../../agents/risk-engine/service.ts', () => ({
  calculateGoalRisk: vi.fn()
}));

describe('AgentOrchestrator', () => {
  it('should execute the create goal flow correctly', async () => {
    // Setup mocks
    vi.mocked(goalAgent.parseGoal).mockResolvedValue({
      title: 'Test Goal',
      deadline: '2024-12-31',
      complexity: 'HIGH',
      estimatedHours: 40
    });

    vi.mocked(planningAgent.generateTaskPlan).mockResolvedValue([
      { title: 'Task 1', description: 'Desc', estimatedHours: 10, priorityScore: 5, position: 0, dependsOnTitles: [] }
    ]);

    vi.mocked(schedulingAgent.generateSchedule).mockResolvedValue([
      { taskId: 'task-1', taskTitle: 'Task 1', scheduledDate: '2024-01-01', startTime: new Date(), endTime: new Date() }
    ]);

    vi.mocked(riskEngine.calculateGoalRisk).mockResolvedValue({
      score: 45,
      level: 'MEDIUM',
      reason: 'Standard complexity'
    });

    const result = await AgentOrchestrator.createGoalFlow('user-1', 'Build a test suite', '2024-01-01');

    expect(result).toBeDefined();
    expect(result.goalTitle).toBe('Test Goal');
    expect(result.tasksCount).toBe(1);
    expect(result.scheduleSlotsCount).toBe(1);
    expect(result.riskScore).toBe(45);
    expect(result.riskLevel).toBe('MEDIUM');

    // Verify correct functions were called
    expect(goalAgent.parseGoal).toHaveBeenCalledWith('user-1', 'Build a test suite', '2024-01-01');
    expect(planningAgent.generateTaskPlan).toHaveBeenCalled();
    expect(schedulingAgent.generateSchedule).toHaveBeenCalled();
    expect(riskEngine.calculateGoalRisk).toHaveBeenCalled();
  });
});
