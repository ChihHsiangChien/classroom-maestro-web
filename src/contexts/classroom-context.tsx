
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
  getDoc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/provider';

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
  answer: string | string[];
  questionId: string;
  timestamp: Timestamp;
}

export interface Classroom {
  id:string;
  name: string;
  students: Student[];
  ownerId: string;
  activeQuestion?: any | null;
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
  setActiveQuestionInDB: (classroomId: string, question: any | null) => Promise<void>;
  addSubmission: (classroomId: string, questionId: string, studentId: string, studentName: string, answer: string | string[]) => Promise<void>;
  listenForSubmissions: (classroomId: string, questionId: string, callback: (submissions: Submission[]) => void) => () => void;
  listenForClassroom: (classroomId: string, callback: (classroom: Classroom | null) => void) => () => void;
  listenForStudentPresence: (classroomId: string, studentId: string, callback: (presence: PresenceData | null) => void) => () => void;
  kickStudent: (classroomId: string, studentId: string) => Promise<void>;
  updateStudentPresence: (classroomId: string, studentId: string, isOnline: boolean) => Promise<void>;
  acknowledgeKick: (classroomId: string, studentId: string) => Promise<void>;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [internalActiveClassroom, setInternalActiveClassroom] = useState<Classroom | null>(null);
  const [activePresenceData, setActivePresenceData] = useState<{ [key: string]: PresenceData }>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const handleFirestoreErrorRef = useRef<(error: any, action: string) => void>();

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
    if (user && db) {
      setLoading(true);
      const q = query(collection(db, "classrooms"), where("ownerId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedClassrooms = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Classroom));
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
  }, [user]);

  // Effect to sync internal active classroom with the main list
  useEffect(() => {
    if (internalActiveClassroom?.id) {
        const updatedClassroom = classrooms.find(c => c.id === internalActiveClassroom.id);
        if (updatedClassroom) {
            setInternalActiveClassroom(updatedClassroom);
        }
    }
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

  // The publicly exposed activeClassroom is a memoized merge of roster and live presence data
  const activeClassroom = useMemo<Classroom | null>(() => {
    if (!internalActiveClassroom) return null;

    const studentsWithPresence = internalActiveClassroom.students.map(s => ({
        ...s,
        ...activePresenceData[s.id] // Merges isOnline, lastSeen, forceLogout
    }));

    return { ...internalActiveClassroom, students: studentsWithPresence };
  }, [internalActiveClassroom, activePresenceData]);

  const addClassroom = useCallback(async (name: string) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, "classrooms"), { name, ownerId: user.uid, students: [] });
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'add-classroom');
    }
  }, [user]);

  const updateClassroom = useCallback(async (id: string, name: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classrooms', id), { name });
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'update-classroom');
    }
  }, []);

  const deleteClassroom = useCallback(async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'classrooms', id));
      if (internalActiveClassroom?.id === id) {
        setInternalActiveClassroom(null);
      }
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'delete-classroom');
    }
  }, [internalActiveClassroom?.id]);

  const updateStudentList = useCallback(async (classroomId: string, newStudents: Student[]) => {
      if (!db) return;
      try {
          // We only update the 'name' and 'id' fields, stripping presence data
          const studentRoster = newStudents.map(({ id, name }) => ({ id, name }));
          await updateDoc(doc(db, 'classrooms', classroomId), { students: studentRoster });
      } catch (error) {
          handleFirestoreErrorRef.current?.(error, 'update-student-list');
      }
  }, []);

  const addStudent = useCallback(async (classroomId: string, studentName: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) return;
    const newStudent: Student = { id: generateId(), name: studentName.trim() };
    await updateStudentList(classroomId, [newStudent, ...classroom.students]);
  }, [classrooms, updateStudentList]);
  
  const updateStudent = useCallback(async (classroomId: string, studentId: string, newName: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) return;
    const updatedStudents = classroom.students.map(s => s.id === studentId ? { ...s, name: newName.trim() } : s);
    await updateStudentList(classroomId, updatedStudents);
  }, [classrooms, updateStudentList]);

  const reorderStudents = useCallback(async (classroomId: string, students: Student[]) => {
    await updateStudentList(classroomId, students);
  }, [updateStudentList]);

  const deleteStudent = useCallback(async (classroomId: string, studentId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) return;
    const updatedStudents = classroom.students.filter(s => s.id !== studentId);
    await updateStudentList(classroomId, updatedStudents);
  }, [classrooms, updateStudentList]);
  
  const importStudents = useCallback(async (classroomId: string, studentNames: string[]) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!classroom) return;
    const newStudents: Student[] = studentNames.map(name => ({ id: generateId(), name }));
    await updateStudentList(classroomId, [...newStudents, ...classroom.students]);
  }, [classrooms, updateStudentList]);

  const setActiveQuestionInDB = useCallback(async (classroomId: string, question: any | null) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classrooms', classroomId), { activeQuestion: question });
    } catch (error) {
      handleFirestoreErrorRef.current?.(error, 'set-active-question');
    }
  }, []);
  
  const addSubmission = useCallback(async (classroomId: string, questionId: string, studentId: string, studentName: string, answer: string | string[]) => {
    if (!db) return;
    try {
      const submissionData = {
        studentId,
        studentName,
        answer,
        questionId,
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
    const classroomRef = doc(db, 'classrooms', classroomId);

    // If there is a logged-in user (teacher), use a real-time listener.
    if (user) {
        return onSnapshot(classroomRef, (doc) => {
            if (doc.exists()) {
                callback({ id: doc.id, ...doc.data() } as Classroom);
            } else {
                callback(null);
            }
        }, (error) => {
            handleFirestoreErrorRef.current?.(error, 'listen-for-classroom');
        });
    }
    
    // If no logged-in user (student), poll the document every few seconds using getDoc.
    // This works with the `allow get: true` rule for unauthenticated users.
    let isCancelled = false;
    let pollTimeout: NodeJS.Timeout;
    const poll = async () => {
        if (isCancelled) return;
        try {
            const docSnap = await getDoc(classroomRef);
            if (!isCancelled) {
              if (docSnap.exists()) {
                  callback({ id: docSnap.id, ...docSnap.data() } as Classroom);
              } else {
                  callback(null);
              }
            }
        } catch(error) {
            handleFirestoreErrorRef.current?.(error, 'poll-for-classroom');
        }
        
        if (!isCancelled) {
            pollTimeout = setTimeout(poll, 3000); // Poll every 3 seconds
        }
    };
    poll();
    
    // Return a function to stop the polling
    return () => {
        isCancelled = true;
        clearTimeout(pollTimeout);
    };
  }, [user]);

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
        await setDoc(presenceRef, { isOnline, lastSeen: Timestamp.now() }, { merge: true });
    } catch (error) {
        // Log silently to avoid spamming user with toasts for background tasks
        console.error("Failed to update presence:", error);
    }
  }, []);

  const kickStudent = useCallback(async (classroomId: string, studentId: string) => {
      if (!db || !classroomId || !studentId) return;
      try {
          const presenceRef = doc(db, 'classrooms', classroomId, 'presence', studentId);
          await setDoc(presenceRef, { forceLogout: true }, { merge: true });
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
    setActiveQuestionInDB,
    addSubmission,
    listenForSubmissions,
    listenForClassroom,
    listenForStudentPresence,
    kickStudent,
    updateStudentPresence,
    acknowledgeKick
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
    setActiveQuestionInDB,
    addSubmission,
    listenForSubmissions,
    listenForClassroom,
    listenForStudentPresence,
    kickStudent,
    updateStudentPresence,
    acknowledgeKick
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
