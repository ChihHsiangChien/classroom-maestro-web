
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deployment to Firebase App Hosting (with GitHub CI/CD)

This application is configured for automated deployment from a GitHub repository using [Firebase App Hosting](https://firebase.google.com/docs/hosting/app-hosting).

The deployment process uses **Google Cloud Secret Manager** to securely provide your Firebase API keys to the live application. This is the standard and most secure method for CI/CD workflows, as it avoids ever storing secret keys in your source code or a local `.env` file.

### Step 1: Find Your Firebase Config Values

You will need the configuration values for your specific Firebase project.

1.  **Go to Firebase Project Settings**:
    *   Open your Firebase project.
    *   Click the gear icon (⚙️) next to "Project Overview".
    *   Select **Project settings**.

2.  **Find Your Web App Config**:
    *   Under the "General" tab, scroll down to "Your apps".
    *   Find your web app and look for the `firebaseConfig` object. It contains all the values you need for the next step (e.g., `apiKey`, `authDomain`, `projectId`, etc.).

### Step 2: Create Secrets in Google Cloud Secret Manager

Now, you will create a "secret" for each required environment variable. Your `apphosting.yaml` file tells App Hosting which secrets to look for.

1.  **Go to Google Cloud Secret Manager**:
    *   Open the [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager) for your project.
    *   Ensure you are in the correct Google Cloud project.

2.  **Create a Secret for Each Variable**:
    You must create a secret for **each** of the following variables listed in your `apphosting.yaml` file. The process is the same for all of them.

    *   `GOOGLE_API_KEY` (The value is the `apiKey` from your `firebaseConfig`)
    *   `NEXT_PUBLIC_FIREBASE_API_KEY` (The value is also the `apiKey` from your `firebaseConfig`)
    *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    *   `NEXT_PUBLIC_FIREBASE_APP_ID`

    **For each variable, follow these steps:**
    *   Click **CREATE SECRET**.
    *   **Name**: Enter the exact secret name (e.g., `GOOGLE_API_KEY`).
    *   **Secret value**: Paste the corresponding value from your `firebaseConfig` object.
    *   Leave other settings as default and click **CREATE SECRET**.

### Step 3: Grant Access to Your App Hosting Backend

After creating the secrets, you must grant your App Hosting backend permission to access them.

1.  **Go to the Permissions Page for a Secret**:
    *   In the Secret Manager list, click on the name of a secret you just created (e.g., `GOOGLE_API_KEY`).
    *   Click the **Permissions** tab.

2.  **Grant Access**:
    *   Click **GRANT ACCESS**.
    *   **New principals**: In the text box, you need to add the service account for your App Hosting backend.
        *   **How to find the principal**:
            1. Open the [**IAM & Admin** page](https://console.cloud.google.com/iam-admin/iam) in a new tab.
            2. In the list of principals, find the one with "App Hosting" in its name. It will look like `service-[YOUR-PROJECT-NUMBER]@gcp-sa-apphosting.iam.gserviceaccount.com`.
            3. Copy this entire email-like address.
            4. Paste it into the "New principals" box back on the Secret Manager page.
    *   **Role**: Search for and select the **Secret Manager Secret Accessor** role.
    *   Click **SAVE**.

3.  **Repeat for All Secrets**:
    *   **Important**: You must repeat this permission-granting process for **every single secret** you created in Step 2. A faster way is to go to the [IAM page](https://console.cloud.google.com/iam-admin/iam), find the App Hosting principal, click the pencil icon, and add the "Secret Manager Secret Accessor" role once, which grants it project-wide access.

### Step 4: Deploy

Once all secrets are created and permissions are granted, your CI/CD workflow is ready.

*   **Commit and Push**: Commit the changes to your `apphosting.yaml` and `README.md` files and push them to your GitHub repository.
    ```bash
    git add apphosting.yaml README.md
    git commit -m "Configure App Hosting for CI/CD with Secret Manager"
    git push
    ```
*   **Automatic Deployment**: The push will trigger the App Hosting CI/CD pipeline. It will build your application, securely inject the secrets you configured, and deploy the new version.

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
