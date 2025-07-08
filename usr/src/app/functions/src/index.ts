import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const checkAndDismissClassrooms = functions
  .region("asia-east1") // Match App Hosting region
  .pubsub.schedule("every 1 minutes").onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    functions.logger.info("Checking for classrooms to dismiss...", {
      now: now.toDate().toISOString(),
    });

    const classroomsToDismissQuery = db.collection("classrooms")
      .where("isDismissed", "==", false)
      .where("sessionEndTime", "<=", now);

    const snapshot = await classroomsToDismissQuery.get();

    if (snapshot.empty) {
      functions.logger.info("No classrooms to dismiss.");
      return null;
    }

    const batch = db.batch();
    const presenceDeletionPromises: Promise<any>[] = [];

    snapshot.forEach((classroomDoc) => {
      functions.logger.info(`Scheduling dismissal for classroom ${classroomDoc.id}`);
      // Mark the classroom as dismissed
      batch.update(classroomDoc.ref, { isDismissed: true });

      // Find and schedule deletion for all presence documents in the subcollection
      const presenceColRef = classroomDoc.ref.collection('presence');
      const promise = presenceColRef.get().then(presenceSnapshot => {
        presenceSnapshot.forEach(presenceDoc => {
          batch.delete(presenceDoc.ref);
        });
      });
      presenceDeletionPromises.push(promise);
    });

    // Wait for all the subcollection reads to finish and add their deletions to the batch
    await Promise.all(presenceDeletionPromises);

    // Commit all the changes (updates and deletes) at once
    await batch.commit();
    functions.logger.info(`Successfully dismissed ${snapshot.size} classrooms and cleared presence.`);
    return null;
  });
