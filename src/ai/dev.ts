import { config } from 'dotenv';
config();

import '@/ai/flows/generate-poll.ts';
import '@/ai/flows/analyze-short-answers.ts';
import '@/ai/flows/generate-image.ts';
import '@/ai/flows/generate-questions-from-text.ts';
