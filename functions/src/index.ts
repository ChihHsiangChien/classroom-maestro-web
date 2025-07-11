import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// MECHANISM 2: DYNAMIC CONFIGURATION (for frontend)
// This function serves as a secure, server-side endpoint that provides the
// public Firebase configuration details to the client-side application.
// In a CI/CD environment, the frontend app cannot access environment variables
// directly during its build process.
// By fetching this config from a trusted Cloud Function at runtime, the frontend
// can initialize the Firebase SDK without needing NEXT_PUBLIC_ variables
// to be managed via complex build-time injection or insecure methods.
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
