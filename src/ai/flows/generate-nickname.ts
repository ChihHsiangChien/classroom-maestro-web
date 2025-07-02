'use server';

/**
 * @fileOverview Generates a suitable nickname for students.
 *
 * - generateNickname - A function that generates a nickname for a student.
 * - GenerateNicknameInput - The input type for the generateNickname function.
 * - GenerateNicknameOutput - The return type for the generateNickname function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNicknameInputSchema = z.object({
  seed: z.string().describe('A seed to generate a unique nickname.'),
});
export type GenerateNicknameInput = z.infer<typeof GenerateNicknameInputSchema>;

const GenerateNicknameOutputSchema = z.object({
  nickname: z.string().describe('A friendly and appropriate nickname for a student, including a relevant emoji.'),
});
export type GenerateNicknameOutput = z.infer<typeof GenerateNicknameOutputSchema>;

export async function generateNickname(input: GenerateNicknameInput): Promise<GenerateNicknameOutput> {
  return generateNicknameFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNicknamePrompt',
  input: {schema: GenerateNicknameInputSchema},
  output: {schema: GenerateNicknameOutputSchema},
  prompt: `You are a helpful assistant that generates friendly and appropriate nicknames for students.

The nickname should be short, easy to remember, and include a relevant emoji.

Seed: {{{seed}}}

Desired format: "Nickname 🚀"
`,
});

const generateNicknameFlow = ai.defineFlow(
  {
    name: 'generateNicknameFlow',
    inputSchema: GenerateNicknameInputSchema,
    outputSchema: GenerateNicknameOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
