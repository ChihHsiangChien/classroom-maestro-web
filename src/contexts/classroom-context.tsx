
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
  writeBatch,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/provider';

export interface Student {
  id: string;
  name: string;
  isOnline?: boolean;
  lastSeen?: Timestamp;
  forceLogout?: boolean;
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
  setActiveClassroom: React.Dispatch<React.SetStateAction<Classroom | null>>;
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
  listenForClassroom: (classroomId: string, callback: (classroom: Classroom) => void) => () => void;
  kickStudent: (classroomId: string, studentId: string) => Promise<void>;
  updateStudentPresence: (classroomId: string, studentId: string, isOnline: boolean) => Promise<void>;
  acknowledgeKick: (classroomId: string, studentId: string) => Promise<void>;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();

  // Use a ref to hold the latest classrooms data to prevent stale closures in callbacks.
  const classroomsRef = useRef(classrooms);
  classroomsRef.current = classrooms;

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
        handleFirestoreError(error, 'fetch-classrooms');
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setClassrooms([]);
      setActiveClassroom(null);
      setLoading(false);
    }
  }, [user, handleFirestoreError]);

  const addClassroom = useCallback(async (name: string) => {
    if (!user || !db) return;
    try {
      await addDoc(collection(db, "classrooms"), { name, ownerId: user.uid, students: [] });
    } catch (error) {
      handleFirestoreError(error, 'add-classroom');
    }
  }, [user, handleFirestoreError]);

  const updateClassroom = useCallback(async (id: string, name: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classrooms', id), { name });
    } catch (error) {
      handleFirestoreError(error, 'update-classroom');
    }
  }, [handleFirestoreError]);

  const deleteClassroom = useCallback(async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'classrooms', id));
      if (activeClassroom?.id === id) {
        setActiveClassroom(null);
      }
    } catch (error) {
      handleFirestoreError(error, 'delete-classroom');
    }
  }, [activeClassroom?.id, handleFirestoreError]);

  const addStudent = useCallback(async (classroomId: string, studentName: string) => {
    const classroom = classroomsRef.current.find(c => c.id === classroomId);
    if (!db || !classroom) return;
    const newStudent: Student = { id: generateId(), name: studentName.trim() };
    try {
      await updateDoc(doc(db, 'classrooms', classroomId), {
        students: [newStudent, ...classroom.students]
      });
    } catch (error) {
      handleFirestoreError(error, 'add-student');
    }
  }, [handleFirestoreError]);
  
  const updateStudent = useCallback(async (classroomId: string, studentId: string, newName: string) => {
    const classroom = classroomsRef.current.find(c => c.id === classroomId);
    if (!db || !classroom) return;
    const updatedStudents = classroom.students.map(s => s.id === studentId ? { ...s, name: newName.trim() } : s);
    try {
      await updateDoc(doc(db, 'classrooms', classroomId), { students: updatedStudents });
    } catch (error) {
      handleFirestoreError(error, 'update-student');
    }
  }, [handleFirestoreError]);

  const reorderStudents = useCallback(async (classroomId: string, students: Student[]) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classrooms', classroomId), { students });
    } catch (error) {
      handleFirestoreError(error, 'reorder-students');
    }
  }, [handleFirestoreError]);

  const deleteStudent = useCallback(async (classroomId: string, studentId: string) => {
    const classroom = classroomsRef.current.find(c => c.id === classroomId);
    if (!db || !classroom) return;
    const updatedStudents = classroom.students.filter(s => s.id !== studentId);
    try {
      await updateDoc(doc(db, 'classrooms', classroomId), { students: updatedStudents });
    } catch (error) {
      handleFirestoreError(error, 'delete-student');
    }
  }, [handleFirestoreError]);
  
  const importStudents = useCallback(async (classroomId: string, studentNames: string[]) => {
      const classroom = classroomsRef.current.find(c => c.id === classroomId);
      if (!db || !classroom) return;
      const newStudents: Student[] = studentNames.map(name => ({ id: generateId(), name }));
      try {
        const classroomRef = doc(db, 'classrooms', classroomId);
        await updateDoc(classroomRef, { students: [...newStudents, ...classroom.students] });
      } catch (error) {
        handleFirestoreError(error, 'import-students');
      }
  }, [handleFirestoreError]);

  const setActiveQuestionInDB = useCallback(async (classroomId: string, question: any | null) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'classrooms', classroomId), { activeQuestion: question });
    } catch (error) {
      handleFirestoreError(error, 'set-active-question');
    }
  }, [handleFirestoreError]);
  
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
      handleFirestoreError(error, 'add-submission');
    }
  }, [handleFirestoreError]);

  const listenForSubmissions = useCallback((classroomId: string, questionId: string, callback: (submissions: Submission[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'classrooms', classroomId, 'submissions'), where("questionId", "==", questionId));
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission));
      callback(submissions);
    }, (error) => {
      handleFirestoreError(error, 'listen-for-submissions');
    });
  }, [handleFirestoreError]);

  const listenForClassroom = useCallback((classroomId: string, callback: (classroom: Classroom) => void) => {
    if (!db) return () => {};
    const classroomRef = doc(db, 'classrooms', classroomId);
    return onSnapshot(classroomRef, (doc) => {
        if (doc.exists()) {
            callback({ id: doc.id, ...doc.data() } as Classroom);
        }
    }, (error) => {
        handleFirestoreError(error, 'listen-for-classroom');
    });
  }, [handleFirestoreError]);

  const updateStudentPresence = useCallback(async (classroomId: string, studentId: string, isOnline: boolean) => {
    if (!db || !classroomId || !studentId) return;
    const classroom = classroomsRef.current.find(c => c.id === classroomId);
    if (!classroom) return;
    
    try {
        const classroomRef = doc(db, 'classrooms', classroomId);
        const updatedStudents = classroom.students.map(s =>
            s.id === studentId ? { ...s, isOnline, lastSeen: Timestamp.now() } : s
        );
        await updateDoc(classroomRef, { students: updatedStudents });
    } catch (error) {
        console.error("Failed to update presence:", error);
    }
  }, []);

  const kickStudent = useCallback(async (classroomId: string, studentId: string) => {
      if (!db || !classroomId || !studentId) return;
      const classroom = classroomsRef.current.find(c => c.id === classroomId);
      if (!classroom) return;
      try {
          const classroomRef = doc(db, 'classrooms', classroomId);
          const updatedStudents = classroom.students.map(s =>
              s.id === studentId ? { ...s, forceLogout: true } : s
          );
          await updateDoc(classroomRef, { students: updatedStudents });
          toast({ title: t('studentManagement.toast_student_kicked_title') });
      } catch (error) {
          handleFirestoreError(error, 'kick-student');
      }
  }, [handleFirestoreError, t, toast]);

  const acknowledgeKick = useCallback(async (classroomId: string, studentId: string) => {
      if (!db || !classroomId || !studentId) return;
      const classroom = classroomsRef.current.find(c => c.id === classroomId);
      if (!classroom) return;
      try {
          const classroomRef = doc(db, 'classrooms', classroomId);
          const updatedStudents = classroom.students.map(s =>
              s.id === studentId ? { ...s, forceLogout: false } : s
          );
          await updateDoc(classroomRef, { students: updatedStudents });
      } catch (error) {
          console.error("Failed to acknowledge kick:", error);
      }
  }, []);

  const value = useMemo(() => ({
    classrooms,
    activeClassroom,
    setActiveClassroom,
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
