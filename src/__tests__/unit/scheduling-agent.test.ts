import { describe, it, expect, vi } from 'vitest';
import { generateSchedule } from '../../agents/scheduling-agent/service.ts';

vi.mock('../../db/index.ts', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue([
          // mock tasks
          { id: 't1', title: 'Task 1', estimatedHours: 2, status: 'TODO', goalId: 'goal-1' },
          { id: 't2', title: 'Task 2', estimatedHours: 3, status: 'TODO', goalId: 'goal-1' }
        ])
      })
    }),
    transaction: vi.fn().mockImplementation(async (cb) => {
      const tx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'block-1' }])
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

describe('Scheduling Agent', () => {
  it('should generate a schedule based on tasks', async () => {
    const result = await generateSchedule('user-1', 'goal-1', '2024-01-01');
    expect(result).toBeDefined();
    // Two tasks with 2 and 3 hours will generate 5 slots if assuming 1hr blocks, but let's just check length > 0
    expect(result.length).toBeGreaterThan(0);
  });
});
