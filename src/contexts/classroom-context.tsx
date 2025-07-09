
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  writeBatch,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  runTransaction,
  orderBy
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/provider';
import { claimRaceAction } from '@/app/actions';
import type { QuestionData } from '@/components/create-poll-form';

export interface PresenceData {
  isOnline?: boolean;
  lastSeen?: Timestamp;
  forceLogout?: boolean;
}

export interface Student extends PresenceData {
  id: string;
  name: string;
}

export interface Submission {
  id: string;
  studentId: string;
  studentName: string;
  answer: string | string[] | number | number[];
  questionId: string;
  questionText: string;
  questionType: string;
  timestamp: Timestamp;
}

export interface RaceData {
  id: string;
  startTime: Timestamp;
  status: 'pending' | 'finished';
  winnerName?: string | null;
  winnerId?: string | null;
}

export interface Classroom {
  id:string;
  name: string;
  students: Student[];
  ownerId: string;
  order: number;
  activeQuestion?: QuestionData | null;
  isLocked?: boolean;
  race?: RaceData | null;
  pingRequest?: { id: string; timestamp: Timestamp };
  scores?: { [studentId: string]: number };
  sessionEndTime?: Timestamp;
  isDismissed?: boolean;
}

interface ClassroomContextType {
  classrooms: Classroom[];
  activeClassroom: Classroom | null;
  setActiveClassroom: (classroom: Classroom | null) => void;
  loading: boolean;
  addClassroom: (name: string) => Promise<void>;
  updateClassroom: (id: string, name: string) => Promise<void>;
  deleteClassroom: (id: string) => Promise<void>;
  addStudent: (classroomId: string, studentName: string) => Promise<void>;
  updateStudent: (classroomId: string, studentId: string, newName: string) => Promise<void>;
  deleteStudent: (classroomId: string, studentId: string) => Promise<void>;
  importStudents: (classroomId: string, studentNames: string[]) => Promise<void>;
  reorderStudents: (classroomId: string, students: Student[]) => Promise<void>;
  reorderClassrooms: (reorderedClassrooms: Classroom[]) => Promise<void>;
  setActiveQuestionInDB: (classroomId: string, question: any | null) => Promise<void>;
  revealAnswer: (classroomId: string) => Promise<void>;
  addSubmission: (classroomId: string, questionId: string, questionText: string, questionType: string, studentId: string, studentName: string, answer: string | string[] | number | number[]) => Promise<void>;
  listenForSubmissions: (classroomId: string, questionId: string, callback: (submissions: Submission[]) => void) => () => void;
  listenForClassroom: (classroomId: string, callback: (classroom: Classroom | null) => void) => () => void;
  listenForStudentPresence: (classroomId: string, studentId: string, callback: (presence: PresenceData | null) => void) => () => void;
  kickStudent: (classroomId: string, studentId: string) => Promise<void>;
  updateStudentPresence: (classroomId: string, studentId: string, isOnline: boolean) => Promise<void>;
  acknowledgeKick: (classroomId: string, studentId: string) => Promise<void>;
  toggleClassroomLock: (classroomId: string, isLocked: boolean) => Promise<void>;
  fetchAllSubmissions: (classroomId: string) => Promise<Submission[]>;
  deleteActivityHistory: (classroomId: string) => Promise<void>;
  startRace: (classroomId: string) => Promise<void>;
  claimRace: (classroomId: string, studentAuthId: string, studentName: string) => Promise<boolean>;
  resetRace: (classroomId: string) => Promise<void>;
  deleteTeacherAndData: (ownerId: string) => Promise<void>;
  pingStudents: (classroomId: string) => Promise<void>;
  startClassSession: (classroomId: string) => Promise<void>;
  awardPoints: (classroomId: string, studentIds: string[], points: number) => Promise<void>;
  updateUserLastActivity: () => Promise<void>;
  dismissClass: (classroomId: string) => Promise<void>;
  extendSession: (classroomId: string, currentEndTime: Timestamp) => Promise<void>;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);

export function ClassroomProvider({ children }: { children: React.ReactNode }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [internalActiveClassroom, setInternalActiveClassroom] = useState<Classroom | null>(null);
  const [activePresenceData, setActivePresenceData] = useState<{ [key: string]: PresenceData }>({});
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const handleFirestoreErrorRef = useRef<(error: any, action: string) => void>();
  const classroomsRef = useRef(classrooms);

  useEffect(() => {
    classroomsRef.current = classrooms;
  }, [classrooms]);

  const handleFirestoreError = useCallback((error: any, action: string) => {
    console.error(`Error performing '${action}':`, error);
    let title = t('common.error');
    let description = `Could not perform action '${action}'. Please try again.`;

    if (error.code === 'permission-denied') {
      title = t('firebase.firestore_permission_denied_title');
      description = t('firebase.firestore_permission_denied_description');
      toast({
        variant: "destructive",
        duration: 10000,
        title,
        description: (
          <div>
            <p>{description}</p>
            <a 
              href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore/rules`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-bold underline text-destructive-foreground"
            >
              {t('firebase.firestore_permission_denied_button')}
            </a>
          </div>
        )
      });
      return;
    }
    
    toast({ variant: "destructive", title, description });
  }, [toast, t]);
  handleFirestoreErrorRef.current = handleFirestoreError;
  
  // Effect for the main classroom list for the authenticated teacher
  useEffect(() => {
    // Only run this for authenticated teachers, not for anonymous students
    if (user && !user.isAnonymous && db) {
      setLoading(true);
      let q;
      if (isAdmin) {
          q = query(collection(db, "classrooms"));
      } else {
          q = query(collection(db, "classrooms"), where("ownerId", "==", user.uid));
      }

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedClassrooms = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Classroom));
        
        fetchedClassrooms.sort((a, b) => (a.order || 0) - (b.order || 0));

        setClassrooms(fetchedClassrooms);
        setLoading(false);
      }, (error) => {
        handleFirestoreErrorRef.current?.(error, 'fetch-classrooms');
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setClassrooms([]);
      setInternalActiveClassroom(null);
      setLoading(false);
    }
  }, [user, isAdmin]);

  // Effect to sync internal active classroom with the main list
  useEffect(() => {
    if (internalActiveClassroom?.id) {
        const updatedClassroom = classrooms.find(c => c.id === internalActiveClassroom.id);
        if (updatedClassroom) {
            const currentStudents = activeClassroom?.students || updatedClassroom.students;
            setInternalActiveClassroom({ ...updatedClassroom, students: currentStudents });
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classrooms, internalActiveClassroom?.id]);

  // Effect to listen for real-time presence data for the active classroom
  useEffect(() => {
    if (!internalActiveClassroom || !db) {
        setActivePresenceData({});
        return;
    };

    const presenceCol = collection(db, 'classrooms', internalActiveClassroom.id, 'presence');
    const unsubscribe = onSnapshot(presenceCol, (snapshot) => {
        const newPresenceData: { [key: string]: PresenceData } = {};
        snapshot.forEach(doc => {
            newPresenceData[doc.id] = doc.data() as PresenceData;
        });
        setActivePresenceData(newPresenceData);
    }, (error) => {
        handleFirestoreErrorRef.current?.(error, 'listen-for-presence');
    });

    return () => unsubscribe();
  }, [internalActiveClassroom]);

  const activeClassroom = useMemo<Classroom | null>(() => {
    if (!internalActiveClassroom) return null;

    const studentsWithPresence = internalActiveClassroom.students.map(s => ({
        ...s,
        ...activePresenceData[s.id]
    }));

    return { ...internalActiveClassroom, students: studentsWithPresence };
  }, [internalActiveClassroom, activePresenceData]);

  const updateUserLastActivity = useCallback(async () => {
    if (!user || !db) return;
    try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { lastActivity: serverTimestamp() });
    } catch (error) {
        console.error("Failed to update user last activity timestamp:", error);
    }
  }, [user]);

  const addClassroom = useCallback(async (name: string) => {
    if (!user || !db) return;
    try {
      const userClassrooms = classroomsRef.current.filter(c => c.ownerId === user.uid);
      const newOrder = userClassrooms.length > 0 ? Math.max(...userClassrooms.map(c => c.order)) + 1 : 0;
      await addDoc(collection(db, "classrooms"), { name, ownerId: user.uid, students: [], isLocked: false, order: newOrder, scores: {} });
      await updateUserLastActivity();
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'add-classroom');
    }
  }, [user, updateUserLastActivity]);

  const updateClassroom = useCallback(async (id: string, name: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classrooms', id), { name });
      await updateUserLastActivity();
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'update-classroom');
    }
  }, [updateUserLastActivity]);

  const deleteClassroom = useCallback(async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'classrooms', id));
      if (internalActiveClassroom?.id === id) {
        setInternalActiveClassroom(null);
      }
      await updateUserLastActivity();
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'delete-classroom');
    }
  }, [internalActiveClassroom?.id, updateUserLastActivity]);

  const updateStudentList = useCallback(async (classroomId: string, newStudents: Student[]) => {
      if (!db) return;
      try {
          const studentRoster = newStudents.map(({ id, name }) => ({ id, name }));
          await updateDoc(doc(db, 'classrooms', classroomId), { students: studentRoster });
          await updateUserLastActivity();
      } catch (error) {
          handleFirestoreErrorRef.current?.(error, 'update-student-list');
      }
  }, [updateUserLastActivity]);

  const addStudent = useCallback(async (classroomId: string, studentName: string) => {
    const classroom = classroomsRef.current.find(c => c.id === classroomId);
    if (!classroom) return;
    const newStudent: Student = { id: generateId(), name: studentName.trim() };
    await updateStudentList(classroomId, [...classroom.students, newStudent]);
  }, [updateStudentList]);
  
  const updateStudent = useCallback(async (classroomId: string, studentId: string, newName: string) => {
    const classroom = classroomsRef.current.find(c => c.id === classroomId);
    if (!classroom) return;
    const updatedStudents = classroom.students.map(s => s.id === studentId ? { ...s, name: newName.trim() } : s);
    await updateStudentList(classroomId, updatedStudents);
  }, [updateStudentList]);

  const reorderStudents = useCallback(async (classroomId: string, students: Student[]) => {
    await updateStudentList(classroomId, students);
  }, [updateStudentList]);

  const reorderClassrooms = useCallback(async (reorderedClassrooms: Classroom[]) => {
    if (!db) return;
    setClassrooms(reorderedClassrooms);
    try {
        const batch = writeBatch(db);
        reorderedClassrooms.forEach((classroom, index) => {
            const classroomRef = doc(db, 'classrooms', classroom.id);
            batch.update(classroomRef, { order: index });
        });
        await batch.commit();
        await updateUserLastActivity();
    } catch (error) {
        handleFirestoreErrorRef.current?.(error, 'reorder-classrooms');
    }
  }, [updateUserLastActivity]);

  const deleteStudent = useCallback(async (classroomId: string, studentId: string) => {
    const classroom = classroomsRef.current.find(c => c.id === classroomId);
    if (!classroom) return;
    const updatedStudents = classroom.students.filter(s => s.id !== studentId);
    await updateStudentList(classroomId, updatedStudents);
  }, [updateStudentList]);
  
  const importStudents = useCallback(async (classroomId: string, studentNames: string[]) => {
    const classroom = classroomsRef.current.find(c => c.id === classroomId);
    if (!classroom) return;
    const newStudents: Student[] = studentNames.map(name => ({ id: generateId(), name }));
    await updateStudentList(classroomId, [...classroom.students, ...newStudents]);
  }, [updateStudentList]);

  const setActiveQuestionInDB = useCallback(async (classroomId: string, question: any | null) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classrooms', classroomId), { activeQuestion: question });
      await updateUserLastActivity();
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'set-active-question');
    }
  }, [updateUserLastActivity]);

  const revealAnswer = useCallback(async (classroomId: string) => {
    if (!db) return;
    const classroomDocRef = doc(db, 'classrooms', classroomId);
    try {
      await runTransaction(db, async (transaction) => {
        const classroomDoc = await transaction.get(classroomDocRef);
        if (!classroomDoc.exists()) {
          throw "Document does not exist!";
        }
        const currentQuestion = classroomDoc.data().activeQuestion;
        if (currentQuestion) {
          const newQuestion = { ...currentQuestion, showAnswer: true };
          transaction.update(classroomDocRef, { activeQuestion: newQuestion });
        }
      });
      await updateUserLastActivity();
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'reveal-answer');
    }
  }, [updateUserLastActivity]);
  
  const addSubmission = useCallback(async (
    classroomId: string, 
    questionId: string, 
    questionText: string,
    questionType: string,
    studentId: string, 
    studentName: string, 
    answer: string | string[] | number | number[]
  ) => {
    if (!db) return;
    try {
      const submissionData = {
        studentId,
        studentName,
        answer,
        questionId,
        questionText,
        questionType,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'classrooms', classroomId, 'submissions'), submissionData);
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'add-submission');
    }
  }, []);

  const listenForSubmissions = useCallback((classroomId: string, questionId: string, callback: (submissions: Submission[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'classrooms', classroomId, 'submissions'), where("questionId", "==", questionId));
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      callback(submissions);
    }, (error) => {
      handleFirestoreErrorRef.current?.(error, 'listen-for-submissions');
    });
  }, []);

  const listenForClassroom = useCallback((classroomId: string, callback: (classroom: Classroom | null) => void) => {
    if (!db) return () => {};
    const classroomDocRef = doc(db, 'classrooms', classroomId);
    
    const unsubscribe = onSnapshot(classroomDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        callback({ id: docSnapshot.id, ...docSnapshot.data() } as Classroom);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreErrorRef.current?.(error, 'listen-for-classroom');
    });

    return unsubscribe;
  }, []);

  const listenForStudentPresence = useCallback((classroomId: string, studentId: string, callback: (presence: PresenceData | null) => void) => {
    if (!db || !classroomId || !studentId) return () => { };
    const presenceRef = doc(db, 'classrooms', classroomId, 'presence', studentId);
    return onSnapshot(presenceRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() as PresenceData : null);
    }, (error) => {
      handleFirestoreErrorRef.current?.(error, 'listen-for-student-presence');
    });
  }, []);

  const updateStudentPresence = useCallback(async (classroomId: string, studentId: string, isOnline: boolean) => {
    if (!db || !classroomId || !studentId) return;
    try {
        const presenceRef = doc(db, 'classrooms', classroomId, 'presence', studentId);
        const dataToSet: PresenceData = { isOnline };
        if (isOnline) {
            dataToSet.lastSeen = Timestamp.now();
        }
        await setDoc(presenceRef, dataToSet, { merge: true });
    } catch (error) {
        console.error("Failed to update presence:", error);
    }
  }, []);

  const kickStudent = useCallback(async (classroomId: string, studentId: string) => {
      if (!db || !classroomId || !studentId) return;
      try {
          const presenceRef = doc(db, 'classrooms', classroomId, 'presence', studentId);
          await setDoc(presenceRef, { forceLogout: true, isOnline: false }, { merge: true });
          toast({ title: t('studentManagement.toast_student_kicked_title') });
      } catch (error) {
          handleFirestoreErrorRef.current?.(error, 'kick-student');
      }
  }, [t, toast]);

  const acknowledgeKick = useCallback(async (classroomId: string, studentId: string) => {
    if (!db || !classroomId || !studentId) return;
    try {
        const presenceRef = doc(db, 'classrooms', classroomId, 'presence', studentId);
        await setDoc(presenceRef, { forceLogout: false }, { merge: true });
    } catch (error) {
        console.error("Failed to acknowledge kick:", error);
    }
  }, []);
  
  const toggleClassroomLock = useCallback(async (classroomId: string, isLocked: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classrooms', classroomId), { isLocked });
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'toggle-classroom-lock');
    }
  }, []);

  const fetchAllSubmissions = useCallback(async (classroomId: string): Promise<Submission[]> => {
    if (!db) return [];
    try {
      const submissionsRef = collection(db, 'classrooms', classroomId, 'submissions');
      const q = query(submissionsRef);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'fetch-all-submissions');
      return [];
    }
  }, []);

  const deleteActivityHistory = useCallback(async (classroomId: string) => {
    if (!db) return;
    try {
      const submissionsRef = collection(db, 'classrooms', classroomId, 'submissions');
      const snapshot = await getDocs(query(submissionsRef));
      
      if (snapshot.empty) {
          toast({ title: t('dashboard.toast_history_no_data_to_delete') });
          return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      toast({ title: t('dashboard.toast_history_deleted') });
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'delete-activity-history');
    }
  }, [t, toast]);

    const startRace = useCallback(async (classroomId: string) => {
        if (!db) return;
        try {
            const raceId = `race_${Date.now()}`;
            const raceData: RaceData = {
                id: raceId,
                status: 'pending',
                winnerName: null,
                winnerId: null,
                startTime: serverTimestamp() as Timestamp,
            };
            await updateDoc(doc(db, 'classrooms', classroomId), {
                race: raceData
            });
            await updateUserLastActivity();
        } catch (error) {
            handleFirestoreErrorRef.current?.(error, 'start-race');
        }
    }, [updateUserLastActivity]);

    const claimRace = useCallback(async (classroomId: string, studentAuthId: string, studentName: string): Promise<boolean> => {
        try {
            const result = await claimRaceAction({ classroomId, studentAuthId, studentName });
            if (!result.success) {
                console.log(`Claim race failed: ${result.error}`);
            }
            return result.success;
        } catch (error) {
            console.error("Fatal error calling claimRaceAction:", error);
            return false;
        }
    }, []);

    const resetRace = useCallback(async (classroomId: string) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, 'classrooms', classroomId), {
                race: null
            });
        } catch (error) {
            handleFirestoreErrorRef.current?.(error, 'reset-race');
        }
    }, []);

    const deleteTeacherAndData = useCallback(async (ownerId: string) => {
        if (!db || !user || !user.uid) {
            toast({ variant: "destructive", title: t('admin.error_not_logged_in') });
            return;
        };
        try {
            const batch = writeBatch(db);

            const classroomsQuery = query(collection(db, "classrooms"), where("ownerId", "==", ownerId));
            const classroomsSnapshot = await getDocs(classroomsQuery);
            
            if (classroomsSnapshot.empty) {
                console.log("No classrooms found for this teacher, deleting user doc only.");
            } else {
                 for (const classroomDoc of classroomsSnapshot.docs) {
                    console.log(`Scheduling deletion for classroom ${classroomDoc.id}`);
                    batch.delete(classroomDoc.ref);
                    
                    const submissionsRef = collection(db, 'classrooms', classroomDoc.id, 'submissions');
                    const presenceRef = collection(db, 'classrooms', classroomDoc.id, 'presence');
                    const subsSnapshot = await getDocs(submissionsRef);
                    subsSnapshot.forEach(subDoc => batch.delete(subDoc.ref));
                    const presenceSnapshot = await getDocs(presenceRef);
                    presenceSnapshot.forEach(pDoc => batch.delete(pDoc.ref));
                }
            }

            const userDocRef = doc(db, 'users', ownerId);
            batch.delete(userDocRef);

            await batch.commit();

            toast({ title: t('admin.delete_data_success_title') });

        } catch (error) {
            handleFirestoreErrorRef.current?.(error, 'delete-teacher-data');
        }
    }, [user, toast, t]);
    
  const pingStudents = useCallback(async (classroomId: string) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'classrooms', classroomId), {
            pingRequest: {
                id: `ping_${Date.now()}_${Math.random()}`,
                timestamp: serverTimestamp()
            }
        });
    } catch (error) {
        handleFirestoreErrorRef.current?.(error, 'ping-students');
    }
  }, []);

  const startClassSession = useCallback(async (classroomId: string) => {
    if (!db) return;
    const CLASS_DURATION_MS = 100 * 60 * 1000;
    const endTime = Timestamp.fromMillis(Date.now() + CLASS_DURATION_MS);

    try {
        const batch = writeBatch(db);

        // Clean up presence from any previous session. This makes the system self-healing.
        const presenceColRef = collection(db, 'classrooms', classroomId, 'presence');
        const presenceSnapshot = await getDocs(presenceColRef);
        presenceSnapshot.forEach(presenceDoc => {
            batch.delete(presenceDoc.ref);
        });
        
        // Reset the classroom state for a new session
        const classroomRef = doc(db, 'classrooms', classroomId);
        batch.update(classroomRef, { 
            scores: {},
            sessionEndTime: endTime,
            isDismissed: false,
        });

        await batch.commit();

    } catch (error) {
        handleFirestoreErrorRef.current?.(error, 'start-class-session');
    }
  }, []);

  const awardPoints = useCallback(async (classroomId: string, studentIds: string[], points: number) => {
    if (!db || studentIds.length === 0) return;
    const classroomRef = doc(db, 'classrooms', classroomId);
    try {
        await runTransaction(db, async (transaction) => {
            const classroomDoc = await transaction.get(classroomRef);
            if (!classroomDoc.exists()) {
                throw "Classroom does not exist!";
            }
            const scores = classroomDoc.data().scores || {};
            const newScores = { ...scores };
            studentIds.forEach(id => {
                newScores[id] = (newScores[id] || 0) + points;
            });
            transaction.update(classroomRef, { scores: newScores });
        });
    } catch (error) {
        handleFirestoreErrorRef.current?.(error, 'award-points');
    }
  }, []);

  const dismissClass = useCallback(async (classroomId: string) => {
    if (!db) return;
    try {
        const batch = writeBatch(db);

        // 1. Mark the classroom as dismissed
        const classroomRef = doc(db, 'classrooms', classroomId);
        batch.update(classroomRef, { isDismissed: true });

        // 2. Get all presence documents for this classroom to clear them
        const presenceColRef = collection(db, 'classrooms', classroomId, 'presence');
        const presenceSnapshot = await getDocs(presenceColRef);
        
        // 3. Add deletions to the batch
        presenceSnapshot.forEach(presenceDoc => {
            batch.delete(presenceDoc.ref);
        });

        // 4. Commit all batched writes atomically
        await batch.commit();

        // 5. Optimistically update local state to reflect the change immediately
        setActivePresenceData({});
        setClassrooms(prev => prev.map(c => c.id === classroomId ? {...c, isDismissed: true} : c));

        toast({ title: t('sessionTimer.class_dismissed_toast') });
    } catch (error) {
        handleFirestoreErrorRef.current?.(error, 'dismiss-class');
    }
  }, [t, toast]);

  const extendSession = useCallback(async (classroomId: string, currentEndTime: Timestamp) => {
    if (!db) return;
    const EXTENSION_MS = 5 * 60 * 1000;
    const newEndTime = Timestamp.fromMillis(currentEndTime.toMillis() + EXTENSION_MS);
    try {
        await updateDoc(doc(db, 'classrooms', classroomId), { sessionEndTime: newEndTime });
        toast({ title: t('sessionTimer.time_extended_toast') });
    } catch (error) {
        handleFirestoreErrorRef.current?.(error, 'extend-session');
    }
  }, [t, toast]);


  const value = useMemo(() => ({
    classrooms,
    activeClassroom,
    setActiveClassroom: setInternalActiveClassroom,
    loading,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    reorderStudents,
    reorderClassrooms,
    setActiveQuestionInDB,
    revealAnswer,
    addSubmission,
    listenForSubmissions,
    listenForClassroom,
    listenForStudentPresence,
    kickStudent,
    updateStudentPresence,
    acknowledgeKick,
    toggleClassroomLock,
    fetchAllSubmissions,
    deleteActivityHistory,
    startRace,
    claimRace,
    resetRace,
    deleteTeacherAndData,
    pingStudents,
    startClassSession,
    awardPoints,
    updateUserLastActivity,
    dismissClass,
    extendSession,
  }), [
    classrooms,
    activeClassroom,
    loading,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    addStudent,
    updateStudent,
    deleteStudent,
    importStudents,
    reorderStudents,
reorderClassrooms,
    setActiveQuestionInDB,
    revealAnswer,
    addSubmission,
    listenForSubmissions,
    listenForClassroom,
    listenForStudentPresence,
    kickStudent,
    updateStudentPresence,
    acknowledgeKick,
    toggleClassroomLock,
    fetchAllSubmissions,
    deleteActivityHistory,
    startRace,
    claimRace,
    resetRace,
    deleteTeacherAndData,
    pingStudents,
    startClassSession,
    awardPoints,
    updateUserLastActivity,
    dismissClass,
    extendSession,
  ]);

  return (
    <ClassroomContext.Provider value={value}>
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const context = useContext(ClassroomContext);
  if (context === undefined) {
    throw new Error('useClassroom must be used within a ClassroomProvider');
  }
  return context;
}
