import { describe, it, expect } from 'vitest';
import { createGoalSchema, addWorkspaceMemberSchema, configureIntegrationsSchema } from '../../lib/schemas.ts';

describe('Validation Schemas', () => {
  it('should validate createGoalSchema', () => {
    expect(createGoalSchema.safeParse({ goal: 'Test Goal' }).success).toBe(true);
    expect(createGoalSchema.safeParse({ goal: '' }).success).toBe(false);
  });

  it('should validate addWorkspaceMemberSchema', () => {
    expect(addWorkspaceMemberSchema.safeParse({ email: 'test@example.com', role: 'COLLABORATOR' }).success).toBe(true);
    expect(addWorkspaceMemberSchema.safeParse({ email: 'invalid-email' }).success).toBe(false);
  });

  it('should validate configureIntegrationsSchema', () => {
    expect(configureIntegrationsSchema.safeParse({ slackWebhookUrl: 'https://hooks.slack.com/services/test' }).success).toBe(true);
    expect(configureIntegrationsSchema.safeParse({ slackWebhookUrl: 'not-a-url' }).success).toBe(false);
  });
});
