
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
  numTrueFalse: z.number().int().min(0).describe('The desired number of true/false questions.'),
  numSingleChoice: z.number().int().min(0).describe('The desired number of single-choice questions.'),
  numMultipleAnswer: z.number().int().min(0).describe('The desired number of multiple-answer questions.'),
  numShortAnswer: z.number().int().min(0).describe('The desired number of short-answer questions.'),
  numDrawing: z.number().int().min(0).describe('The desired number of drawing questions.'),
});
export type GenerateQuestionsFromTextInput = z.infer<typeof GenerateQuestionsFromTextInputSchema>;

const MultipleChoiceQuestionSchema = z.object({
  type: z.enum(['multiple-choice']),
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.object({ value: z.string() })).min(4).max(4).describe('A list of exactly 4 plausible options.'),
  allowMultipleAnswers: z.boolean().describe('Whether multiple answers are allowed. Set to `false` for single-choice, `true` for multiple-answer.'),
  answer: z.array(z.number().int()).min(1).describe("An array containing the 0-based index/indices of the correct option(s)."),
});

const TrueFalseQuestionSchema = z.object({
  type: z.enum(['true-false']),
  question: z.string().describe('The true/false question.'),
  answer: z.enum(['O', 'X']).describe('The correct answer, either "O" for true or "X" for false.'),
});

const ShortAnswerQuestionSchema = z.object({
    type: z.enum(['short-answer']),
    question: z.string().describe('An open-ended short-answer question that encourages critical thinking based on the text.')
});

const DrawingQuestionSchema = z.object({
    type: z.enum(['drawing']),
    question: z.string().describe('A creative prompt that requires students to draw a concept, diagram, or scene related to the text.')
});

const QuestionDataSchema = z.union([
    MultipleChoiceQuestionSchema,
    TrueFalseQuestionSchema,
    ShortAnswerQuestionSchema,
    DrawingQuestionSchema
]);
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
  prompt: `You are an expert educator creating classroom materials. Based on the following text context, please generate a mix of questions as specified.

Question Generation Instructions:
- Generate exactly {{{numTrueFalse}}} true/false questions.
- Generate exactly {{{numSingleChoice}}} single-choice questions.
- Generate exactly {{{numMultipleAnswer}}} multiple-answer questions.
- Generate exactly {{{numShortAnswer}}} short-answer questions.
- Generate exactly {{{numDrawing}}} drawing-prompt questions.

If a number for a question type is 0, do not generate any questions of that type.

Rules for each question type:
1.  **True/False (\`true-false\`)**:
    - Create a clear statement that is definitively true or false based on the text.
    - You MUST provide the correct answer ('O' for true, 'X' for false) in the 'answer' field.

2.  **Single-Choice (\`multiple-choice\`)**:
    - You must provide exactly 4 plausible options.
    - Exactly one option must be the correct answer. The others should be plausible but incorrect distractors.
    - The \`allowMultipleAnswers\` field MUST be \`false\`.
    - CRITICAL: The 'answer' field MUST be an array containing a SINGLE NUMBER, which is the 0-based index of the correct option (e.g., \`[1]\`).

3.  **Multiple-Answer (\`multiple-choice\`)**:
    - You must provide exactly 4 plausible options.
    - One or more options must be correct.
    - The \`allowMultipleAnswers\` field MUST be \`true\`.
    - CRITICAL: The 'answer' field MUST be an array of NUMBERS, representing the 0-based indices of ALL correct options (e.g., \`[0, 3]\`).

4.  **Short-Answer (\`short-answer\`)**:
    - Create an open-ended question that prompts for a brief written response based on the text.
    - The question should encourage understanding, not just rote memorization.

5.  **Drawing (\`drawing\`)**:
    - Create a prompt that requires students to visualize and draw a concept, diagram, or scene from the text.
    - The prompt should be clear and actionable (e.g., "Draw a diagram showing...", "Illustrate the process of...").

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
    if (input.numTrueFalse === 0 && input.numSingleChoice === 0 && input.numMultipleAnswer === 0 && input.numShortAnswer === 0 && input.numDrawing === 0) {
      return { questions: [] };
    }
    
    const {output} = await prompt(input);
    return output!;
  }
);
