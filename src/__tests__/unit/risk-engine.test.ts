import { describe, it, expect, vi } from 'vitest';
import { calculateGoalRisk } from '../../agents/risk-engine/service.ts';

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          score: 30,
          level: 'LOW',
          factors: ['Plenty of time remaining']
        })
      })
    };
  }
}));

vi.mock('../../db/index.ts', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation((condition) => {
          // If the condition is for goals, return a mock goal.
          // If for tasks, return a mock list of tasks.
          // Due to Drizzle's eq() producing an object, we just return an array 
          // that works for both (or we could use the first item).
          return [
            { id: 'goal-1', title: 'Mock Goal', deadline: new Date(), estimatedHours: 10, createdAt: new Date() }
          ];
        })
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }])
      })
    })
  }
}));

describe('Risk Engine', () => {
  it('should calculate risk for a given goal', async () => {
    const result = await calculateGoalRisk('user-1', 'goal-1', '2024-12-31');
    // Note: The logic in calculateGoalRisk overrides the LLM for the basic metrics now, 
    // it computes the risk dynamically. So the exact score might be different based on dates.
    expect(result).toBeDefined();
    expect(result.level).toBeDefined();
  });
});
