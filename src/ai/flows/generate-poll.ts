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
    .describe('A list of 2 to 4 options for the poll.'),
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
      Generate a multiple-choice poll question about the following topic: {{{topic}}}.
      The question should be interesting and suitable for a classroom setting.
      Provide between 2 and 4 plausible options. One option should be clearly correct, but the others should be thought-provoking distractors.
      
      The entire output, including the question and all options, must be in Traditional Chinese (繁體中文).
      
      Return the question and options in the specified format.
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
