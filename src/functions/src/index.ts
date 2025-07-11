import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// MECHANISM 2: DYNAMIC CONFIGURATION (for frontend)
// This function serves as a secure, server-side endpoint that provides the
// public Firebase configuration details to the client-side application.
//
// WHY IS THIS NEEDED?
// In a CI/CD environment (like App Hosting from GitHub), the frontend app
// cannot access environment variables (like .env files) directly during its build process.
// Hardcoding keys is insecure.
//
// HOW IT WORKS (AUTOMATICALLY):
// 1. DEPLOYMENT: This function is automatically deployed with the rest of your app.
// 2. SELF-CONFIGURATION: When running in the Google Cloud environment, `admin.initializeApp()`
//    automatically discovers all necessary project credentials. There's nothing to manually configure.
// 3. RUNTIME CALL: The frontend calls this function once on startup to fetch the config.
//
// As a developer, you DO NOT need to execute or configure this function manually.
// Its existence and deployment handle the configuration retrieval automatically.
export const getFirebaseConfig = functions
  .region("asia-east1")
  .https.onCall((data, context) => {
    // This function reads the configuration from the server environment where
    // it's automatically available, and returns only the public-safe values.
    // Note: process.env.GCLOUD_PROJECT is a standard variable available in
    // Cloud Functions and App Engine environments.
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
