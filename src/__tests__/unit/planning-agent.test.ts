import { describe, it, expect, vi } from 'vitest';
import { generateTaskPlan } from '../../agents/planning-agent/service.ts';
import { db } from '../../db/index.ts';

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          tasks: [
            { id: 't1', title: 'Task 1', estimatedHours: 5, priority: 'HIGH', dependsOn: [] }
          ]
        })
      })
    };
  }
}));

vi.mock('../../db/index.ts', () => ({
  db: {
    transaction: vi.fn().mockImplementation(async (cb) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([])
          })
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'task-1' }])
          })
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({})
        })
      };
      return cb(tx);
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'log-1' }])
      })
    })
  }
}));

describe('Planning Agent', () => {
  it('should generate a task plan from goal context', async () => {
    const result = await generateTaskPlan('user-1', 'goal-1', 'Mock Goal', 'LOW', '2024-12-31', 10);
    expect(result).toBeDefined();
    expect(result.length).toBe(1);
  });
});
