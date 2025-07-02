"use server";

import {
  generateNickname,
  type GenerateNicknameInput,
} from "@/ai/flows/generate-nickname";

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
