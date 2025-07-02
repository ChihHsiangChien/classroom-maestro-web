"use server";

import {
  generateNickname,
  type GenerateNicknameInput,
} from "@/ai/flows/generate-nickname";
import {
  generatePoll,
  type GeneratePollInput,
} from "@/ai/flows/generate-poll";
import {
  analyzeShortAnswers,
  type AnalyzeShortAnswersInput,
} from "@/ai/flows/analyze-short-answers";

export async function generateNicknameAction(input: GenerateNicknameInput) {
  try {
    const result = await generateNickname(input);
    if (!result || !result.nickname) {
      throw new Error("AI did not return a nickname.");
    }
    return { nickname: result.nickname, error: null };
  } catch (error) {
    console.error("Error generating nickname:", error);
    return {
      nickname: null,
      error: "Could not generate a nickname. Please try again.",
    };
  }
}

export async function generatePollAction(input: GeneratePollInput) {
  try {
    const result = await generatePoll(input);
    if (!result || !result.question || !result.options) {
      throw new Error("AI did not return a valid poll.");
    }
    return { poll: result, error: null };
  } catch (error) {
    console.error("Error generating poll:", error);
    return {
      poll: null,
      error:
        "Could not generate a poll. Please try again or enter one manually.",
    };
  }
}

export async function analyzeShortAnswersAction(
  input: AnalyzeShortAnswersInput
) {
  try {
    const result = await analyzeShortAnswers(input);
    if (!result) {
      throw new Error("AI did not return an analysis.");
    }
    return { analysis: result, error: null };
  } catch (error) {
    console.error("Error analyzing answers:", error);
    return {
      analysis: null,
      error: "Could not analyze the answers. Please try again.",
    };
  }
}
