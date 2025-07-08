
"use server";

import {
  generatePoll,
  type GeneratePollInput,
} from "@/ai/flows/generate-poll";
import {
  analyzeShortAnswers,
  type AnalyzeShortAnswersInput,
} from "@/ai/flows/analyze-short-answers";
import {
  generateImage,
  type GenerateImageInput,
} from "@/ai/flows/generate-image";
import {
  generateQuestionsFromText,
  type GenerateQuestionsFromTextInput,
} from "@/ai/flows/generate-questions-from-text";
import { db } from "@/lib/firebase";
import { doc, runTransaction, type Timestamp } from "firebase/firestore";
import type { Classroom, RaceData } from "@/contexts/classroom-context";


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

export interface ClaimRaceInput {
  classroomId: string;
  studentAuthId: string;
  studentName: string;
}

export async function claimRaceAction(input: ClaimRaceInput): Promise<{ success: boolean; error?: string }> {
  const { classroomId, studentAuthId, studentName } = input;
  if (!db) {
    return { success: false, error: "Database not configured." };
  }

  try {
    await runTransaction(db, async (transaction) => {
      const classroomRef = doc(db, 'classrooms', classroomId);
      const classroomSnap = await transaction.get(classroomRef);

      if (!classroomSnap.exists()) {
        throw new Error("Classroom does not exist.");
      }

      const classroomData = classroomSnap.data() as Classroom;
      const race = classroomData.race;

      // This is the critical check that the transaction's atomicity protects.
      // Only the first user to pass this check will succeed.
      if (!race || race.status !== 'pending') {
        throw new Error("Race not available to be claimed.");
      }
      
      // Construct the complete new state for the race object.
      // This is a more robust way to update, ensuring the security rule `hasOnly(['race'])` behaves as expected.
      const newRaceData: RaceData = {
        ...race,
        winnerName: studentName,
        winnerId: studentAuthId,
        status: 'finished',
      };
      
      // Update the entire 'race' field with the new object.
      transaction.update(classroomRef, { race: newRaceData });
    });
    return { success: true };
  } catch (error: any) {
    // This will catch errors from the transaction, including our explicit `throw new Error` checks.
    console.log(`Claim race failed inside action: ${error.message}`);
    return { success: false, error: error.message };
  }
}


export async function generateImageAction(input: GenerateImageInput) {
  try {
    const result = await generateImage(input);
    if (!result || !result.imageUrl) {
      throw new Error("AI did not return a valid image.");
    }
    return { imageUrl: result.imageUrl, error: null };
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      imageUrl: null,
      error: "Could not generate an image. Please try again.",
    };
  }
}

export async function generateQuestionsFromTextAction(input: GenerateQuestionsFromTextInput) {
  try {
    const result = await generateQuestionsFromText(input);
    if (!result || !result.questions) {
      throw new Error("AI did not return valid questions.");
    }
    return { questions: result.questions, error: null };
  } catch (error) {
    console.error("Error generating questions:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while generating questions.";
    return {
      questions: null,
      error: errorMessage,
    };
  }
}
