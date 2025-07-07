
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
  numMultipleChoice: z.number().int().min(0).describe('The desired number of multiple-choice questions.'),
  numTrueFalse: z.number().int().min(0).describe('The desired number of true/false questions.'),
});
export type GenerateQuestionsFromTextInput = z.infer<typeof GenerateQuestionsFromTextInputSchema>;

const MultipleChoiceQuestionSchema = z.object({
  type: z.enum(['multiple-choice']),
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.object({ value: z.string() })).min(4).max(4).describe('A list of exactly 4 plausible options.'),
  allowMultipleAnswers: z.boolean().default(false).describe('Whether multiple answers are allowed.'),
  answer: z.array(z.number().int()).min(1).describe("An array containing the 0-based index/indices of the correct option(s). For example, if the first option is correct, the value should be [0]."),
});

const TrueFalseQuestionSchema = z.object({
  type: z.enum(['true-false']),
  question: z.string().describe('The true/false question.'),
  answer: z.enum(['O', 'X']).describe('The correct answer, either "O" for true or "X" for false.'),
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
  prompt: `You are an expert educator creating classroom materials. Based on the following text context, please generate exactly {{{numMultipleChoice}}} multiple-choice questions and {{{numTrueFalse}}} true/false questions. If a number for a question type is 0, do not generate any questions of that type.

For each multiple-choice question, you must provide exactly 4 plausible options. One or more options must be the correct answer, and the others should be plausible but incorrect distractors. You MUST provide the 0-based index of the correct answer(s) in the 'answer' field. For example, if the first option is correct, the value should be [0].

For each true/false question, create a clear statement that is definitively true or false based on the text. You MUST provide the correct answer ('O' for true, 'X' for false) in the 'answer' field.

The entire output, including questions, all options, and answers, must be in Traditional Chinese (繁體中文).

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
    if (input.numMultipleChoice === 0 && input.numTrueFalse === 0) {
      return { questions: [] };
    }
    
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
        throw new Error(`Could not find a JSON object in the AI response. Raw output:\n---\n${rawText}\n---`);
      }
      
      const jsonString = rawText.substring(jsonStart, jsonEnd + 1);
      const parsedJson = JSON.parse(jsonString);
      
      console.log("Successfully parsed AI output:", JSON.stringify(parsedJson, null, 2));

      // Validate the parsed JSON against our schema.
      const validationResult = GenerateQuestionsFromTextOutputSchema.safeParse(parsedJson);
      if (!validationResult.success) {
        // If validation fails, throw an error with details.
        throw new Error(`AI output failed validation. Details: ${validationResult.error.message}. Raw output:\n---\n${rawText}\n---`);
      }

      return validationResult.data;
    } catch (e: any) {
      // If parsing or validation fails, throw a comprehensive error including the raw text.
      // This is crucial for debugging in environments without direct terminal access.
      throw new Error(`Failed to parse or validate AI response. Raw output:\n---\n${rawText}\n---`);
    }
  }
);
