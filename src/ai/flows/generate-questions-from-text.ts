
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
  prompt: `You are an AI educator. Based on the provided text, generate a set of questions in a specific JSON format.

**CRITICAL INSTRUCTIONS:**
1. You MUST generate the exact number of questions for each type as specified.
   - True/False: {{{numTrueFalse}}}
   - Single-Choice: {{{numSingleChoice}}}
   - Multiple-Answer: {{{numMultipleAnswer}}}
   - Short-Answer: {{{numShortAnswer}}}
   - Drawing: {{{numDrawing}}}
2. Your entire output MUST be a single, valid JSON object matching the schema. Do not output any text outside of the JSON structure.
3. All content (questions, options, etc.) MUST be in Traditional Chinese (繁體中文).

**JSON Structure and Rules with Examples:**

Your output will be a JSON object with a single key "questions", which is an array of question objects. Each question object must have a "type" field.

1.  **True/False (\`"type": "true-false"\`)**
    - MUST have a \`question\` (string) and an \`answer\` ('O' for true, 'X' for false).
    - MUST NOT have \`options\` or \`allowMultipleAnswers\`.
    - *Example:*
      \`\`\`json
      {
        "type": "true-false",
        "question": "虎克是第一位觀察到細胞的科學家。",
        "answer": "O"
      }
      \`\`\`

2.  **Single-Choice (\`"type": "multiple-choice"\`)**
    - MUST have a \`question\` (string), \`options\` (array of 4 objects with a \`value\` string), \`allowMultipleAnswers: false\`, and \`answer\` (array with ONE number index).
    - *Example:*
      \`\`\`json
      {
        "type": "multiple-choice",
        "question": "發現細胞核的科學家是誰？",
        "options": [
          {"value": "虎克"},
          {"value": "布朗"},
          {"value": "許旺"},
          {"value": "許來登"}
        ],
        "allowMultipleAnswers": false,
        "answer": [1]
      }
      \`\`\`

3.  **Multiple-Answer (\`"type": "multiple-choice"\`)**
    - MUST have \`allowMultipleAnswers: true\` and an \`answer\` array with one or more number indices.
    - *Example:*
      \`\`\`json
      {
        "type": "multiple-choice",
        "question": "細胞學說的貢獻者包含哪些科學家？",
        "options": [
          {"value": "許旺"},
          {"value": "達爾文"},
          {"value": "許來登"},
          {"value": "虎克"}
        ],
        "allowMultipleAnswers": true,
        "answer": [0, 2]
      }
      \`\`\`

4.  **Short-Answer (\`"type": "short-answer"\`)**
    - MUST have a \`question\` (string).
    - *Example:*
      \`\`\`json
      {
        "type": "short-answer",
        "question": "請簡單描述細胞學說的要點。"
      }
      \`\`\`

5.  **Drawing (\`"type": "drawing"\`)**
    - MUST have a \`question\` (string).
    - *Example:*
      \`\`\`json
      {
        "type": "drawing",
        "question": "請繪製一個植物細胞的示意圖，並標示出細胞壁、細胞膜和細胞核。"
      }
      \`\`\`

**Context Text:**
---
{{{context}}}
---

Now, generate the JSON object based on these rules and the provided context.
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
