
'use server';
/**
 * @fileOverview Generates questions from a given text context.
 *
 * - generateQuestionsFromText - A function that generates questions.
 * - GenerateQuestionsFromTextInput - The input type for the function.
 * - GenerateQuestionsFromTextOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateQuestionsFromTextInputSchema = z.object({
  context: z.string().describe('The text content to generate questions from.'),
});
export type GenerateQuestionsFromTextInput = z.infer<typeof GenerateQuestionsFromTextInputSchema>;

const MultipleChoiceQuestionSchema = z.object({
  type: z.enum(['multiple-choice']),
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.object({ value: z.string() })).min(4).max(4).describe('A list of exactly 4 plausible options.'),
  allowMultipleAnswers: z.boolean().default(false).describe('Whether multiple answers are allowed.'),
});

const TrueFalseQuestionSchema = z.object({
  type: z.enum(['true-false']),
  question: z.string().describe('The true/false question.'),
});

const QuestionDataSchema = z.union([MultipleChoiceQuestionSchema, TrueFalseQuestionSchema]);
export type QuestionData = z.infer<typeof QuestionDataSchema>;

const GenerateQuestionsFromTextOutputSchema = z.object({
  questions: z.array(QuestionDataSchema).describe('A list of generated questions.'),
});
export type GenerateQuestionsFromTextOutput = z.infer<typeof GenerateQuestionsFromTextOutputSchema>;


export async function generateQuestionsFromText(
  input: GenerateQuestionsFromTextInput
): Promise<GenerateQuestionsFromTextOutput> {
  return generateQuestionsFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuestionsFromTextPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: GenerateQuestionsFromTextInputSchema},
  output: {schema: GenerateQuestionsFromTextOutputSchema},
  prompt: `You are an expert educator creating classroom materials. Based on the following text context, please generate a mix of 3 to 5 multiple-choice and true/false questions.

For multiple-choice questions, you must provide exactly 4 plausible options. One option must be the correct answer, and the others should be plausible but incorrect distractors. For true/false questions, create a clear statement that is definitively true or false based on the text.

The entire output, including questions and all options, must be in Traditional Chinese (繁體中文).

It is crucial that your output is a single, valid JSON object that strictly adheres to the requested schema. Do not add any extra text, explanations, or markdown formatting outside of the JSON structure.

Context:
---
{{{context}}}
---

Please generate the questions and return them in the specified JSON format.
`,
});

const generateQuestionsFromTextFlow = ai.defineFlow(
  {
    name: 'generateQuestionsFromTextFlow',
    inputSchema: GenerateQuestionsFromTextInputSchema,
    outputSchema: GenerateQuestionsFromTextOutputSchema,
  },
  async input => {
    const response = await prompt(input);
    const rawText = response.text;

    // For debugging, we log the raw output from the AI.
    console.log("Raw AI output:", rawText);

    if (!rawText) {
      // Throw a detailed error if the AI returns nothing.
      throw new Error("AI returned an empty response. No text was received.");
    }

    try {
      // The AI might wrap the JSON in ```json ... ```, so we extract it.
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}');
      
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error(`Could not find a JSON object in the AI response.`);
      }
      
      const jsonString = rawText.substring(jsonStart, jsonEnd + 1);
      const parsedJson = JSON.parse(jsonString);
      
      console.log("Successfully parsed AI output:", JSON.stringify(parsedJson, null, 2));

      // Validate the parsed JSON against our schema.
      const validationResult = GenerateQuestionsFromTextOutputSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        // If validation fails, throw an error with details.
        throw new Error(`AI output failed validation. Details: ${validationResult.error.message}`);
      }

      return validationResult.data;
    } catch (e: any) {
      // If parsing or validation fails, throw a comprehensive error including the raw text.
      // This is crucial for debugging in environments without direct terminal access.
      throw new Error(`Failed to parse or validate AI response. Raw output:\n---\n${rawText}\n---`);
    }
  }
);
