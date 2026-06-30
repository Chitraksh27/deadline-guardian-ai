import { GoogleGenAI } from '@google/genai';
import { env } from './env.ts';

if (!env.GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not defined in the environment variables.');
}

export const ai = new GoogleGenAI({
  apiKey: env.GEMINI_API_KEY,
  httpOptions: {
    // Add reasonable timeout for GenAI
    timeout: 30000,
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Utility wrapper for retries with backoff and timeout handling
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      if (attempt >= maxRetries) {
        throw error;
      }
      // Simple exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Gemini] Request failed. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Unreachable code');
}
