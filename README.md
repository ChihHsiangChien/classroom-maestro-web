# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deployment

This application is configured for deployment using [Firebase App Hosting](https://firebase.google.com/docs/hosting/app-hosting).

To deploy your application, you will need the Firebase CLI.

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

The CLI will build your Next.js application and deploy it to Firebase App Hosting. Once complete, it will provide you with the URL to your live application.

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
*   `isAdmin()`: Checks if the user's UID exists in the `/admins` collection.
*   `isOwner(resource)`: Checks if the logged-in user's UID matches the `ownerId` field of the document they are trying to access.

### 3. Collection-Specific Rules

Here is a breakdown of the permissions for each data collection:

#### `/admins/{adminId}`
*   **Read, Write**: Only other Admins can read or modify the list of administrators. This is for security.

#### `/users/{userId}`
*   **Read, Update**: A user can only read or update their own document (e.g., to update `lastActivity`). Admins can read any user's document.
*   **Create**: Any authenticated user can create their own user document upon first sign-in.

#### `/aiUsageLogs/{logId}`
*   **Read**: Only Admins can view the AI usage logs.
*   **Create**: Any authenticated Teacher can write to the log. This prevents anonymous students from creating log entries.

#### `/classrooms/{classroomId}`
*   **Read (Get a single document)**: Any authenticated user (including anonymous Students) can `get` a single classroom. This is essential for the "Join Class" page to function.
*   **Read (List documents)**: Only Teachers and Admins can `list` classrooms. The app's front-end query ensures teachers can only request the list of classrooms they own.
*   **Create**: Only Teachers can create new classrooms. The rules enforce that the `ownerId` must be their own UID.
*   **Update, Delete**: Only the Teacher who owns the classroom (`isOwner`) or an Admin can modify or delete it.

#### `/classrooms/{classroomId}/submissions/{submissionId}`
*   **Read**: Any authenticated user can read submissions. This is needed for the teacher's dashboard and for students to see their results.
*   **Create**: Any authenticated user (including anonymous Students) can create a new submission. The rules enforce that all required fields are present.
*   **Update, Delete**: No one can modify or delete submissions from the client-side to preserve data integrity.

#### `/classrooms/{classroomId}/presence/{studentId}`
*   **Read, Write**: Any authenticated user can read or write to the presence subcollection. This allows students to update their online status and for the teacher's dashboard to reflect it.

#### `/courseware/{coursewareId}`
*   The rules for this collection mirror the `classrooms` collection rules to ensure consistent permissions for teacher-owned resources.
*   **List**: Only Teachers and Admins.
*   **Create**: Only Teachers.
*   **Update, Delete**: Only the owner or an Admin.
