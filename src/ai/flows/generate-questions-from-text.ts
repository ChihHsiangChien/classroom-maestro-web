
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
  type: z.literal('multiple-choice'),
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.object({ value: z.string() })).min(2).max(4).describe('A list of 2 to 4 plausible options.'),
  allowMultipleAnswers: z.boolean().default(false).describe('Whether multiple answers are allowed.'),
});

const TrueFalseQuestionSchema = z.object({
  type: z.literal('true-false'),
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

For multiple-choice questions, provide between 2 to 4 plausible options. One option must be the correct answer, and the others should be plausible but incorrect distractors. For true/false questions, create a clear statement that is definitively true or false based on the text.

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

    if (!rawText) {
      throw new Error("AI returned an empty response. No text was received.");
    }

    // Attempt to find and parse the JSON block from the raw text
    try {
      const jsonStart = rawText.indexOf('{');
      const jsonEnd = rawText.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error(`Could not find a JSON object in the AI response. Raw output:\n---\n${rawText}\n---`);
      }

      const jsonString = rawText.substring(jsonStart, jsonEnd + 1);
      
      const parsedJson = JSON.parse(jsonString);
      const validationResult = GenerateQuestionsFromTextOutputSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        // Provide detailed validation errors along with the raw output for debugging
        const validationErrors = validationResult.error.errors.map(e => `  - Path: ${e.path.join('.')}, Message: ${e.message}`).join('\n');
        throw new Error(`AI output failed validation after parsing.\nValidation Errors:\n${validationErrors}\n\nRaw AI output:\n---\n${rawText}\n---`);
      }

      console.log('Successfully parsed AI output:', JSON.stringify(validationResult.data, null, 2));
      return validationResult.data;

    } catch (e: any) {
      console.error('AI output failed parsing. Raw text:', rawText, 'Error:', e);
      // Re-throw the error with the raw text included for client-side display
      throw new Error(`Failed to parse AI response. Raw output:\n---\n${rawText}\n---`);
    }
  }
);
