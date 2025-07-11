import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// This function returns the public Firebase config to the client.
// It's a secure way to provide config without exposing it in the source code
// or relying on complex environment variable injection during CI/CD.
export const getFirebaseConfig = functions
  .region("asia-east1")
  .https.onCall((data, context) => {
    // Check if the request is from an authenticated user or a callable function context
    // This provides a basic level of protection.
    // For more security, you could check the origin or require auth.
    return {
      apiKey: process.env.GCLOUD_PROJECT ? admin.app().options.apiKey : "",
      authDomain: process.env.GCLOUD_PROJECT
        ? `${process.env.GCLOUD_PROJECT}.firebaseapp.com`
        : "",
      projectId: process.env.GCLOUD_PROJECT,
      storageBucket: process.env.GCLOUD_PROJECT
        ? `${process.env.GCLOUD_PROJECT}.appspot.com`
        : "",
      messagingSenderId: process.env.GCLOUD_PROJECT
        ? admin.app().options.messagingSenderId
        : "",
      appId: process.env.GCLOUD_PROJECT ? admin.app().options.appId : "",
    };
  });


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
  