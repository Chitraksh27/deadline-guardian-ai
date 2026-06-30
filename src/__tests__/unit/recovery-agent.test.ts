import { describe, it, expect, vi } from 'vitest';
import { generateRecoveryPlan } from '../../agents/recovery-agent/service.ts';

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          riskBefore: 75,
          riskAfter: 20,
          recommendations: ['Reassign tasks', 'Extend deadline']
        })
      })
    };
  }
}));

vi.mock('../../db/index.ts', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue([
          { id: 'goal-1', title: 'Mock Goal', deadline: new Date(), estimatedHours: 10, createdAt: new Date() }
        ])
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'log-1' }])
      })
    })
  }
}));

describe('Recovery Agent', () => {
  it('should generate a recovery plan for a goal', async () => {
    const result = await generateRecoveryPlan('user-1', 'goal-1', 75, '2024-01-01');
    expect(result).toBeDefined();
    expect(result.riskAfter).toBe(20);
    expect(result.recommendations).toContain('Reassign tasks');
  });
});
