/**
 * security.ts
 * Utility module for security hardening, input sanitization, and JSON verification.
 */

/**
 * Sanitizes user input to prevent XSS and strip model-level instruction-bypassing tags or keywords.
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Simple XSS tag removal
    .replace(/\[\/?(system|instruction|user|assistant|model|config)\]/gi, '') // Strip model delimiters/context injectors
    .replace(/\b(ignore previous instructions|ignore all previous instructions|bypass safety)\b/gi, '') // Mitigation for naive system instruction overrides
    .trim();
}

/**
 * Trims excessively long prompts to prevent payload size / cost exhaust attacks.
 */
export function trimPrompt(input: string, maxLength: number = 2000): string {
  if (!input) return '';
  if (input.length > maxLength) {
    return input.substring(0, maxLength) + '... [TRUNCATED]';
  }
  return input;
}

/**
 * Safely validates JSON returned by Gemini against the expected schemas.
 */
export function validateGoalOutput(data: any): { title: string; deadline: string; complexity: 'LOW' | 'MEDIUM' | 'HIGH'; estimatedHours: number } | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  
  const title = typeof data.title === 'string' ? sanitizeInput(data.title).substring(0, 150) : '';
  const deadline = typeof data.deadline === 'string' ? data.deadline.trim() : '';
  
  let complexity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
  if (['LOW', 'MEDIUM', 'HIGH'].includes(data.complexity)) {
    complexity = data.complexity;
  }
  
  let estimatedHours = 10;
  if (typeof data.estimatedHours === 'number' && !isNaN(data.estimatedHours)) {
    estimatedHours = Math.max(1, Math.min(200, data.estimatedHours));
  } else if (typeof data.estimatedHours === 'string') {
    const parsed = parseInt(data.estimatedHours, 10);
    if (!isNaN(parsed)) {
      estimatedHours = Math.max(1, Math.min(200, parsed));
    }
  }

  if (!title || !deadline) {
    return null;
  }

  return { title, deadline, complexity, estimatedHours };
}

export function validatePlanningOutput(data: any): { tasks: any[] } | null {
  if (typeof data !== 'object' || data === null || !Array.isArray(data.tasks)) {
    return null;
  }

  const validTasks = data.tasks.map((task: any) => {
    if (typeof task !== 'object' || task === null) return null;
    
    const title = typeof task.title === 'string' ? sanitizeInput(task.title).substring(0, 150) : 'Untitled Task';
    const description = typeof task.description === 'string' ? sanitizeInput(task.description).substring(0, 500) : '';
    
    let estimatedHours = 3;
    if (typeof task.estimatedHours === 'number' && !isNaN(task.estimatedHours)) {
      estimatedHours = Math.max(1, Math.min(100, task.estimatedHours));
    }

    let priorityScore = 50;
    if (typeof task.priorityScore === 'number' && !isNaN(task.priorityScore)) {
      priorityScore = Math.max(1, Math.min(100, task.priorityScore));
    }

    let position = 0;
    if (typeof task.position === 'number' && !isNaN(task.position)) {
      position = Math.max(0, task.position);
    }

    const dependsOnTitles = Array.isArray(task.dependsOnTitles)
      ? task.dependsOnTitles.filter((t: any) => typeof t === 'string').map((t: string) => sanitizeInput(t).substring(0, 150))
      : [];

    return {
      title,
      description,
      estimatedHours,
      priorityScore,
      position,
      dependsOnTitles
    };
  }).filter(Boolean);

  if (validTasks.length === 0) {
    return null;
  }

  return { tasks: validTasks };
}

export function validateRecoveryOutput(data: any): { riskBefore: number; riskAfter: number; recommendations: string[] } | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  let riskBefore = typeof data.riskBefore === 'number' ? data.riskBefore : 50;
  let riskAfter = typeof data.riskAfter === 'number' ? data.riskAfter : 30;
  
  const recommendations = Array.isArray(data.recommendations)
    ? data.recommendations.filter((r: any) => typeof r === 'string').map((r: string) => sanitizeInput(r).substring(0, 300))
    : [];

  if (recommendations.length === 0) {
    return null;
  }

  return {
    riskBefore,
    riskAfter,
    recommendations
  };
}
