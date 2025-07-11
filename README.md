
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deployment to Firebase App Hosting

This application is configured for deployment using [Firebase App Hosting](https://firebase.google.com/docs/hosting/app-hosting).

To deploy your application, you will need the Firebase CLI and a local `.env` file containing your Firebase project's credentials.

### 1. Create your `.env` file

Your project needs a file named `.env` in the root directory. This file stores your secret keys and configuration.

1.  **Find Your Firebase Config**:
    *   Go to your Firebase Project Settings by clicking the gear icon (⚙️) next to "Project Overview".
    *   Under the "General" tab, scroll down to "Your apps".
    *   Find your web app and look for the `firebaseConfig` object. It will contain all the values you need.

2.  **Create the file**:
    Create a file named `.env` in the root of your project and paste the following content into it. **Replace `YOUR_..._HERE` with the actual values from your `firebaseConfig` object.**

    ```env
    # Firebase Public Keys (copied from Firebase Console)
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN_HERE
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID_HERE
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET_HERE
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID_HERE
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID_HERE
    
    # Genkit Server-Side Secret Key
    # NOTE: The value is the same as NEXT_PUBLIC_FIREBASE_API_KEY
    GOOGLE_API_KEY=YOUR_API_KEY_HERE
    ```
    
    **Important**: The `.gitignore` file is already configured to prevent `.env` from being uploaded to your repository, keeping your keys safe.

### 2. Initial Deployment

1.  **Install the Firebase CLI** (if you haven't already):
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase**:
    ```bash
    firebase login
    ```

3.  **Deploy your application**:
    From the root of your project directory, run the following command:
    ```bash
    firebase deploy
    ```
The CLI will build your Next.js application, read your `.env` file to configure the backend, and deploy it to Firebase App Hosting. Once complete, it will provide you with the URL to your live application.

### 3. Configuring the `GOOGLE_API_KEY` Secret

After the first deployment, your live application might show an error related to the AI features. This is because the `GOOGLE_API_KEY` needs to be managed as a secure "secret" in the cloud.

1.  **Go to Google Cloud Secret Manager**:
    *   Go to the [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager).
    *   Ensure you are in the correct project.

2.  **Create the Secret**:
    *   Click "**Create secret**".
    *   **Name**: `GOOGLE_API_KEY` (This must match the name in `apphosting.yaml`).
    *   **Secret value**: Paste the `apiKey` from your `firebaseConfig` (the same value as `NEXT_PUBLIC_FIREBASE_API_KEY`).
    *   Leave other settings as default and click "**Create secret**".

3.  **Grant Access to App Hosting**:
    *   After creating the secret, you must grant your App Hosting backend access to it.
    *   Click on the `GOOGLE_API_KEY` secret name in the list.
    *   Go to the **Permissions** tab.
    *   Click **GRANT ACCESS**.
    *   **New principals**: Search for and select the service account associated with your App Hosting backend. It usually looks like `app-hosting-backend-id@...`.
    *   **Role**: Search for and select "**Secret Manager Secret Accessor**".
    *   Click **SAVE**.

4.  **Redeploy**:
    *   After setting up the secret, you must redeploy your application for the changes to take effect.
    ```bash
    firebase deploy
    ```
Your application should now be fully configured and running correctly on Firebase App Hosting.

## Firebase Security Rules

This section documents the logic behind the `firestore.rules` file, which governs access to the database.

### 1. Role-Based Access Control (RBAC)

The rules are based on a three-role system:

*   **Admin**: A user whose UID is present in the `/admins` collection. Has full read/write access to all data for administrative purposes.
*   **Teacher (Authenticated User)**: A user who has signed in with a standard provider (e.g., Google). They are not anonymous. Teachers can manage their own resources.
*   **Student (Anonymous User)**: A user who has been authenticated anonymously. They have very limited permissions, primarily to join a class and submit answers.

### 2. Helper Functions

To keep the rules clean and readable, several helper functions are defined:

*   `isAuthenticated()`: Returns `true` if a user is logged in (either as a Teacher or an anonymous Student).
*   `isAnonymous()`: Returns `true` if the user is specifically an anonymous user.
*   `isTeacher()`: Returns `true` if the user is logged in and is **not** anonymous.
*   `isAdmin()`: Checks if the user's UID exists in the `/admins` collection. This check does not incur a read operation and is safe from recursive loops.
*   `isOwner(resource)`: Checks if the logged-in user's UID matches the `ownerId` field of the document they are trying to access.

### 3. Collection-Specific Rules

Here is a breakdown of the permissions for each data collection:

#### `/admins/{adminId}`
*   **Get**: Any user can check their **own** admin status (`/admins/their-own-id`). Admins can check anyone's status. This is crucial for the login flow to work for all users.
*   **List, Write**: Only other Admins can list, create, or delete administrators.

#### `/users/{userId}`
*   **Read (Get), Update, Create**: A user can only read, update, or create their own document (e.g., to update `lastActivity`). 
*   **Read (List)**: Only Admins can list all user documents. This is for the Admin Panel.

#### `/aiUsageLogs/{logId}`
*   **Read**: Only Admins can view the AI usage logs.
*   **Create**: Any authenticated Teacher can write to the log. This prevents anonymous students from creating log entries.

#### `/classrooms/{classroomId}`
*   **Read (Get a single document)**: 
    *   The **owner** of the classroom or an **Admin** can `get` the document.
    *   **Students** (anonymous users) can also `get` a single classroom. This is essential for the "Join Class" page to function.
*   **Read (List documents)**: 
    *   **Admins** can `list` all classrooms.
    *   **Teachers** can `list` classrooms **only if** they are querying for classrooms they own (`where('ownerId', '==', their_uid)`). This rule is tied directly to the frontend query for security.
*   **Create**: Only Teachers can create new classrooms. The rules enforce that the `ownerId` must be their own UID.
*   **Update**:
    *   **General**: The Teacher who owns the classroom (`isOwner`) or an Admin can modify the document.
    *   **Exception for "Race" Feature**: A Student (`isAuthenticated()`) is allowed to update a classroom **only if all** of the following conditions are met:
        1.  The existing `race.status` is `'pending'`.
        2.  The student is claiming the win for themselves (`request.resource.data.race.winnerId == request.auth.uid`).
        3.  The only field being changed is the `race` field (`request.resource.data.diff(resource.data).affectedKeys().hasOnly(['race'])`).
*   **Delete**: Only the Teacher who owns the classroom (`isOwner`) or an Admin can delete it.

#### `/classrooms/{classroomId}/submissions/{submissionId}`
*   **Read**: Any authenticated user can read submissions. This is needed for the teacher's dashboard and for students to see their results.
*   **Create**: Any authenticated user (including anonymous Students) can create a new submission.
*   **Update, Delete**: No one can modify or delete submissions from the client-side to preserve data integrity.

#### `/classrooms/{classroomId}/presence/{studentId}`
*   **Read, Write**: Any authenticated user can read or write to the presence subcollection. This allows students to update their online status and for the teacher's dashboard to reflect it.

#### `/courseware/{coursewareId}`
*   The rules for this collection mirror the `classrooms` collection rules to ensure consistent permissions for teacher-owned resources.
*   **Read (Get)**: Only the owner or an Admin.
*   **Read (List)**: Only Teachers who are querying their own courseware or Admins.
*   **Create**: Only Teachers creating for themselves.
*   **Update, Delete**: Only the owner or an Admin.

## AI Development Learnings & Best Practices

This section documents key lessons learned during the development process to prevent recurring errors, particularly concerning Firebase Security Rules.

### 1. Firestore Rules: The `list` vs. `get` Distinction is Critical

*   **Mistake**: Repeatedly confusing `allow read` with a universal read permission. `read` is a shorthand for `get` (single document) and `list` (collection query). Rules that rely on `resource` data (e.g., `isOwner(resource)`) work for `get` but will **always fail** for `list` because `resource` is not available during a list query.
*   **Symptom**: Non-admin users could not see their own list of classrooms/courseware, even though the frontend query `where('ownerId', '==', request.auth.uid)` was correct. This is because the overly-strict `list` rule rejected the query before it could even be executed.
*   **Correct Pattern**:
    *   `allow list`: Use broader checks that don't rely on `resource` (e.g., `isTeacher()`). Trust the frontend query to filter the data.
    *   `allow get`: Use specific, resource-based checks (e.g., `isOwner(resource)`). This acts as a second layer of defense, ensuring that even if the `list` is broad, users can only access the content of documents they are permitted to.

### 2. Firestore Rules: Account for the "Bootstrap" State of New Users

*   **Mistake**: Writing rules that require a certain state or role to even check for that state. For instance, requiring admin privileges to read the `/admins` collection, creating a catch-22 for new users trying to see if they are admins.
*   **Symptom**: Non-admin users would get a permission error immediately upon login because the initial `isAdmin` check would fail.
*   **Correct Pattern**: Always allow a user to read their **own** document in role-defining collections (e.g., `allow get: if request.auth.uid == adminId;`). Similarly, ensure new authenticated users can `create` their own initial profile in the `/users` collection.

### 3. Frontend Logic: Global Contexts Must be Role-Aware

*   **Mistake**: Having global context providers (`ClassroomProvider`, `CoursewareProvider`) that unconditionally fetch data as soon as *any* user logs in.
*   **Symptom**: Anonymous students would trigger permission errors because the providers tried to fetch a list of classrooms/courseware for them, which they are not permitted to do. The main page functionality still worked, creating a confusing "ghost error".
*   **Correct Pattern**: The context provider's `useEffect` hook for fetching data must first check the user's role (e.g., `if (user && !user.isAnonymous)`) before initiating data queries intended for authenticated teachers.

### 4. Consistency is Key

*   **Mistake**: Applying a fix to one part of the system (e.g., the security rules for `classrooms`) but forgetting to apply the identical fix to a parallel part (e.g., `courseware`).
*   **Symptom**: An error that was thought to be fixed reappears in a different context, leading to confusion and repeated work.
*   **Correct Pattern**: When two collections serve a similar purpose for the user (like `classrooms` and `courseware`), their security rules should be structured identically to ensure consistent and predictable behavior.

### 5. Transactional Updates vs. General Permissions

*   **Mistake**: Assuming that because a high-privilege user (teacher) initiates a feature, the permissions for subsequent actions within that feature are automatically covered for all participants.
*   **Symptom**: The "Race" (搶權) feature, started by a teacher, fails with `permission-denied` when a student tries to claim the win.
*   **Root Cause**: The feature requires a low-privilege user (student) to update a document owned by a high-privilege user (the teacher's `classroom` document). The general security rule correctly restricts `update` to the owner, blocking the student's legitimate action. The atomicity of a Firestore Transaction does not bypass this fundamental permission check.
*   **Learning & Correct Pattern**: Never broadly open up `update` permissions. Instead, create a **narrow, surgical exception** for the specific cross-privilege action. The rule must validate the state transition and ensure no other data is tampered with. The correct rule for the "Race" feature should enforce all of the following:
    1.  The user must be authenticated (`isAuthenticated()`).
    2.  The race must currently be in the `pending` state (`resource.data.race.status == 'pending'`).
    3.  The student must be claiming the win for themselves (`request.resource.data.race.winnerId == request.auth.uid`).
    4.  The only field being modified in the entire document must be the `race` field (`request.resource.data.diff(resource.data).affectedKeys().hasOnly(['race'])`).
    This keeps the document secure while enabling the feature.
