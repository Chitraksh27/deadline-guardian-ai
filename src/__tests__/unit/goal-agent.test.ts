import { describe, it, expect, vi } from 'vitest';
import { parseGoal } from '../../agents/goal-agent/service.ts';
import { GoogleGenAI } from '@google/genai';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({
            title: 'Mock Goal Title',
            deadline: '2024-12-31',
            complexity: 'MEDIUM',
            estimatedHours: 20
          })
        })
      };
    }
  };
});

vi.mock('../../db/index.ts', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'log-1' }])
      })
    })
  }
}));

describe('Goal Agent', () => {
  it('should parse user intent into a structured goal', async () => {
    const result = await parseGoal('user-1', 'I want to build a testing suite by next month', '2024-01-01');
    expect(result.title).toBe('Mock Goal Title');
    expect(result.deadline).toBe('2024-12-31');
    expect(result.complexity).toBe('MEDIUM');
    expect(result.estimatedHours).toBe(20);
  });
});
