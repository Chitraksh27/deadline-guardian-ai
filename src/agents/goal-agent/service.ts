import { ai } from '../../lib/gemini.ts';
import { db } from '../../db/index.ts';
import { agentExecutionLogs } from '../../db/schema.ts';
import { sanitizeInput, trimPrompt, validateGoalOutput } from '../../lib/security.ts';

export interface StructuredGoal {
  title: string;
  deadline: string; // ISO string or YYYY-MM-DD
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedHours: number;
}

export async function parseGoal(
  userId: string,
  rawGoalInput: string,
  referenceDate: string = new Date().toISOString().split('T')[0]
): Promise<StructuredGoal> {
  const startTime = Date.now();
  let success = false;
  let parsedResult: StructuredGoal | null = null;

  // Prompt Injection Hardening: Sanitize and Trim user input
  const sanitizedInput = sanitizeInput(rawGoalInput);
  const trimmedInput = trimPrompt(sanitizedInput, 1000);

  const prompt = `
You are the Goal Understanding Agent for Deadline Guardian AI.
Analyze the user's raw goal input and extract a structured goal representation.

Current Reference Date: ${referenceDate}

Raw User Input: "${trimmedInput}"

Analyze carefully:
1. Extract the main "title" of the goal. Keep it concise, descriptive, and actionable.
2. Estimate the deadline based on the raw input (e.g., "by Friday", "by June 29", "in 10 days"). Resolve this relative to the reference date (${referenceDate}) and output in YYYY-MM-DD format.
3. Classify the "complexity" as LOW, MEDIUM, or HIGH based on estimated complexity.
4. Estimate the total "estimatedHours" required to successfully complete this goal.

Output format MUST be valid JSON matching this schema:
{
  "title": string,
  "deadline": "YYYY-MM-DD",
  "complexity": "LOW" | "MEDIUM" | "HIGH",
  "estimatedHours": number
}

Do not return any extra text, markdown wrappers, or explanation. Only return the JSON.
`;

  let failureReason: string | null = null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const contentText = response.text || '';
    const rawJson = JSON.parse(contentText.trim());
    
    // Validate schema structure securely
    const validated = validateGoalOutput(rawJson);
    if (!validated) {
      throw new Error('Gemini Goal Agent output failed schema validation');
    }

    parsedResult = validated;
    success = true;
    return parsedResult;
  } catch (error: any) {
    console.error('Goal Agent failed:', error);
    failureReason = error.message;
    // Fallback parser in case Gemini fails or is rate-limited
    parsedResult = {
      title: trimmedInput.substring(0, 50) || 'My Goal',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      complexity: 'MEDIUM',
      estimatedHours: 15,
    };
    return parsedResult;
  } finally {
    const executionTimeMs = Date.now() - startTime;
    try {
      // Log agent execution to the database
      const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(agentExecutionLogs).values({
        id: logId,
        userId: userId,
        agentName: 'GOAL_AGENT',
        inputPayload: JSON.stringify({ rawGoalInput, referenceDate }),
        outputPayload: JSON.stringify({
          result: parsedResult,
          ...(failureReason ? { error: failureReason, failureReason } : {}),
        }),
        executionTimeMs,
        success,
        createdAt: new Date(),
      });
    } catch (logErr) {
      console.error('Failed to save Goal Agent execution log:', logErr);
    }
  }
}
