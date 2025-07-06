
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

      // Check 1: Is there a pending race with the correct ID?
      if (!race || race.id !== raceId || race.status !== 'pending') {
        throw new Error("Race not available to be claimed.");
      }
      
      // Check 2: Is the server-side start time available?
      if (!race.startTime || !('toMillis' in race.startTime)) {
        // This can happen if the transaction runs before the serverTimestamp is resolved.
        // It's a very small window but possible. We should tell the user to try again.
        throw new Error("Race is not ready yet. Please try again in a moment.");
      }
      
      // Check 3: Has the 3-second countdown passed ACCORDING TO THE SERVER?
      // This is the authoritative check.
      const activationTime = (race.startTime as Timestamp).toMillis() + 3000;
      const now = Timestamp.now().toMillis();
      
      // We add a small buffer (e.g., 200ms) to account for network latency and client-side clock skew.
      // The client might be slightly ahead and send the request a fraction of a second "too early".
      const buffer = 200; // 200ms
      if (now < activationTime - buffer) {
          const timeLeft = activationTime - now;
          throw new Error(`Claim attempt was too early. Time left: ${timeLeft}ms`);
      }
      
      // If we passed all checks, this is a valid claim. The transaction ensures atomicity.
      transaction.update(classroomRef, {
        'race.winnerName': studentName,
        'race.winnerId': studentId,
        'race.status': 'finished'
      });
    });
    return { success: true };
  } catch (error: any) {
    // This will catch errors from the transaction, including our explicit `throw new Error` checks.
    console.log(`Claim race failed inside action: ${error.message}`);
    return { success: false, error: error.message };
  }
}
