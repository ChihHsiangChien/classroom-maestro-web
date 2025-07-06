
"use server";

import {
  generatePoll,
  type GeneratePollInput,
} from "@/ai/flows/generate-poll";
import {
  analyzeShortAnswers,
  type AnalyzeShortAnswersInput,
} from "@/ai/flows/analyze-short-answers";
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
  raceId: string;
  studentId: string;
  studentName: string;
}

export async function claimRaceAction(input: ClaimRaceInput): Promise<{ success: boolean; error?: string }> {
  const { classroomId, raceId, studentId, studentName } = input;
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

      const classroomData = classroomSnap.data();
      const race = classroomData.race as RaceData | undefined;

      // The transaction ensures that only the first person to change the status from 'pending' will succeed.
      // All subsequent attempts will fail this check and throw an error.
      // This is more reliable than comparing client/server timestamps which can have skews.
      if (!race || race.id !== raceId || race.status !== 'pending') {
        throw new Error("Race not available to be claimed.");
      }
      
      transaction.update(classroomRef, {
        'race.winnerName': studentName,
        'race.winnerId': studentId,
        'race.status': 'finished'
      });
    });
    return { success: true };
  } catch (error: any) {
    // This will catch the "Race not available" error for all but the first student, which is expected.
    console.log("Claim race failed inside action:", error.message);
    return { success: false, error: error.message };
  }
}
