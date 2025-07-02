'use server';
/**
 * @fileOverview Analyzes a collection of short answer responses from students.
 *
 * - analyzeShortAnswers - A function that summarizes answers, extracts keywords, and prepares data for visualization.
 * - AnalyzeShortAnswersInput - The input type for the analyzeShortAnswers function.
 * - AnalyzeShortAnswersOutput - The return type for the analyzeShortAnswers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const AnalyzeShortAnswersInputSchema = z.object({
  answers: z.array(z.string()).describe('A list of student answers to a short-answer question.'),
});
export type AnalyzeShortAnswersInput = z.infer<typeof AnalyzeShortAnswersInputSchema>;

export const AnalyzeShortAnswersOutputSchema = z.object({
  summary: z.string().describe('A concise summary of all the student answers, identifying common themes and misconceptions.'),
  wordCloud: z.array(z.object({
    text: z.string().describe('A keyword or phrase.'),
    value: z.number().describe('A numerical weight for the keyword, suitable for a word cloud.'),
  })).describe('An array of keywords and their weights (from 10 to 100) for generating a word cloud. Combine similar concepts.'),
  barChart: z.array(z.object({
    word: z.string().describe('A keyword or phrase.'),
    count: z.number().describe('The frequency of the keyword.'),
  })).describe('An array of the top 5-10 keywords and their frequencies for generating a bar chart.'),
});
export type AnalyzeShortAnswersOutput = z.infer<typeof AnalyzeShortAnswersOutputSchema>;

export async function analyzeShortAnswers(input: AnalyzeShortAnswersInput): Promise<AnalyzeShortAnswersOutput> {
  return analyzeShortAnswersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeShortAnswersPrompt',
  input: {schema: AnalyzeShortAnswersInputSchema},
  output: {schema: AnalyzeShortAnswersOutputSchema},
  prompt: `You are an expert educational analyst. Your task is to analyze a list of student answers to a short-answer question.

Please perform the following steps:
1.  Read all the student answers provided.
2.  Write a brief, insightful summary that captures the main ideas, common themes, and any potential misconceptions present in the answers.
3.  Extract the most important keywords and phrases. Crucially, you must consolidate synonyms and closely related concepts into a single, representative term (e.g., "cell's energy source" and "powerhouse" should be merged into "Mitochondria").
4.  From these consolidated keywords, generate a list for a word cloud. Assign a weight (a number between 10 and 100) to each keyword based on its frequency and importance. More frequent/important words should have a higher weight.
5.  From the same consolidated keywords, generate a list of the top 5 to 10 most frequent terms and their counts for a bar chart.

Here are the student answers:
{{#each answers}}
- {{{this}}}
{{/each}}

Produce the output in the specified JSON format.
`,
});

const analyzeShortAnswersFlow = ai.defineFlow(
  {
    name: 'analyzeShortAnswersFlow',
    inputSchema: AnalyzeShortAnswersInputSchema,
    outputSchema: AnalyzeShortAnswersOutputSchema,
  },
  async input => {
    // Filter out empty or whitespace-only answers before sending to the AI
    const nonEmptyAnswers = input.answers.filter(answer => answer.trim() !== '');
    if (nonEmptyAnswers.length === 0) {
      return {
        summary: "No answers were provided to analyze.",
        wordCloud: [],
        barChart: [],
      };
    }
    const {output} = await prompt({ answers: nonEmptyAnswers });
    return output!;
  }
);
