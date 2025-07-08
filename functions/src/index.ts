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
    snapshot.forEach((doc) => {
      functions.logger.info(`Dismissing classroom ${doc.id}`);
      batch.update(doc.ref, { isDismissed: true });
    });

    await batch.commit();
    functions.logger.info(`Successfully dismissed ${snapshot.size} classrooms.`);
    return null;
  });
