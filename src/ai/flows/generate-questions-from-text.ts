
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
  answer: z.number().int().min(0).max(1).describe('The 0-based index of the correct answer. 0 for True (O), 1 for False (X).'),
});

const ShortAnswerQuestionSchema = z.object({
    type: z.enum(['short-answer']),
    question: z.string().describe('An open-ended short-answer question that encourages critical thinking based on the text.')
});

const DrawingQuestionSchema = z.object({
    type: z.enum(['drawing']),
    question: z.string().describe('A creative prompt that requires students to draw a concept, diagram, or scene related to the text.')
});

const QuestionDataSchema = z.discriminatedUnion("type", [
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
  prompt: `You are an expert AI educator. Your task is to generate a precise set of questions based on the provided text and specifications.

**ABSOLUTE, CRITICAL INSTRUCTIONS:**
1.  **YOU MUST GENERATE EXACTLY THE SPECIFIED NUMBER OF QUESTIONS FOR EACH TYPE.** Do not substitute one type for another.
    - True/False: {{{numTrueFalse}}}
    - Single-Choice: {{{numSingleChoice}}}
    - Multiple-Answer: {{{numMultipleAnswer}}}
    - Short-Answer: {{{numShortAnswer}}}
    - Drawing: {{{numDrawing}}}
2.  **YOUR ENTIRE OUTPUT MUST BE A SINGLE, VALID JSON OBJECT** that strictly follows the schemas described in the examples below. Do not include any text, explanations, or markdown formatting outside of the JSON object.
3.  All generated content (questions, options, etc.) **MUST be in Traditional Chinese (繁體中文)**.

**JSON FORMAT AND EXAMPLES:**

Your output will be a JSON object with a single key "questions", which is an array of question objects. Each question object **MUST** have a "type" field.

1.  **True/False (\`"type": "true-false"\`)**
    - **Keys**: \`type\`, \`question\`, \`answer\`.
    - **Rules**: \`answer\` MUST be a NUMBER: \`0\` for True, \`1\` for False.
    - **DO NOT** include \`options\` or \`allowMultipleAnswers\`.
    - **Example**:
      \`\`\`json
      {
        "type": "true-false",
        "question": "虎克是第一位觀察到軟木塞細胞的科學家。",
        "answer": 0
      }
      \`\`\`

2.  **Single-Choice (\`"type": "multiple-choice"\`)**
    - **Keys**: \`type\`, \`question\`, \`options\`, \`allowMultipleAnswers\`, \`answer\`.
    - **Rules**:
        - \`options\` MUST be an array of EXACTLY 4 objects.
        - \`allowMultipleAnswers\` MUST be \`false\`.
        - \`answer\` MUST be an array with ONE number index.
    - **Example**:
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
    - **Keys**: \`type\`, \`question\`, \`options\`, \`allowMultipleAnswers\`, \`answer\`.
    - **Rules**:
        - \`options\` MUST be an array of EXACTLY 4 objects.
        - \`allowMultipleAnswers\` MUST be \`true\`.
        - \`answer\` MUST be an array with one OR MORE number indices.
    - **Example**:
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
    - **Keys**: \`type\`, \`question\`.
    - **Rules**: MUST NOT include \`options\` or \`answer\`.
    - **Example**:
      \`\`\`json
      {
        "type": "short-answer",
        "question": "請簡單描述細胞學說的要點。"
      }
      \`\`\`

5.  **Drawing (\`"type": "drawing"\`)**
    - **Keys**: \`type\`, \`question\`.
    - **Rules**: MUST NOT include \`options\` or \`answer\`.
    - **Example**:
      \`\`\`json
      {
        "type": "drawing",
        "question": "請繪製一個植物細胞的示意圖，並標示出細胞壁、細胞膜和細胞核。"
      }
      \`\`\`

**Context Text To Use:**
---
{{{context}}}
---

**Final Check:** Before you output your response, review your work against the instructions.
- Did you generate exactly {{{numTrueFalse}}} questions of type 'true-false'?
- Did you generate exactly {{{numSingleChoice}}} questions of type 'multiple-choice' with \`allowMultipleAnswers: false\`?
- Did you generate exactly {{{numMultipleAnswer}}} questions of type 'multiple-choice' with \`allowMultipleAnswers: true\`?
- Did you generate exactly {{{numShortAnswer}}} questions of type 'short-answer'?
- Did you generate exactly {{{numDrawing}}} questions of type 'drawing'?
- Is your entire output a single, valid JSON object with no extra text?
- Is all content in Traditional Chinese?

Now, generate the JSON object based on these exact rules and the provided context.
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
    
    const response = await prompt(input);
    const rawText = response.text.trim();

    try {
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("No JSON object found in the AI's response.");
        }
        const jsonString = rawText.substring(jsonStart, jsonEnd + 1);

        const parsedJson = JSON.parse(jsonString);

        const validatedOutput = GenerateQuestionsFromTextOutputSchema.parse(parsedJson);
        return validatedOutput;

    } catch (e: any) {
        const errorMessage = e.message || "An unknown error occurred during parsing.";
        console.error("AI Output Parsing Error:", errorMessage);
        console.error("Raw AI Output:", rawText);
        throw new Error(`AI output could not be processed. Error: ${errorMessage}. Raw response:\n\n${rawText}`);
    }
  }
);
