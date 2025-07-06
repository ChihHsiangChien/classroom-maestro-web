'use server';
/**
 * @fileOverview Generates a poll question and options based on a topic.
 *
 * - generatePoll - A function that generates a poll.
 * - GeneratePollInput - The input type for the generatePoll function.
 * - GeneratePollOutput - The return type for the generatePoll function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePollInputSchema = z.object({
  topic: z.string().describe('The topic for the poll.'),
});
export type GeneratePollInput = z.infer<typeof GeneratePollInputSchema>;

const GeneratePollOutputSchema = z.object({
  question: z.string().describe('The generated poll question.'),
  options: z
    .array(z.object({value: z.string()}))
    .min(4)
    .max(4)
    .describe('A list of exactly 4 plausible options for the poll.'),
  answer: z
    .array(z.string())
    .min(1)
    .max(1)
    .describe('An array containing the single correct option value.'),
});
export type GeneratePollOutput = z.infer<typeof GeneratePollOutputSchema>;

export async function generatePoll(
  input: GeneratePollInput
): Promise<GeneratePollOutput> {
  return generatePollFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePollPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: GeneratePollInputSchema},
  output: {schema: GeneratePollOutputSchema},
  prompt: `You are an expert educator who creates engaging poll questions for students.
      Generate a single-choice poll question about the following topic: {{{topic}}}.
      The question should be interesting and suitable for a classroom setting.
      You must provide exactly 4 plausible options. One option must be clearly correct, and the others should be thought-provoking distractors.
      You must also specify the correct answer in the 'answer' field. The answer must be one of the provided option values.
      
      The entire output, including the question, all options, and the answer, must be in Traditional Chinese (繁體中文).
      
      Return the question, options, and answer in the specified JSON format.
      `,
});

const generatePollFlow = ai.defineFlow(
  {
    name: 'generatePollFlow',
    inputSchema: GeneratePollInputSchema,
    outputSchema: GeneratePollOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
