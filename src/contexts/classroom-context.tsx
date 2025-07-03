
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove,
  writeBatch
} from 'firebase/firestore';

export interface Student {
  id: string;
  name: string;
}

export interface Submission {
  studentId: number;
  studentName: string;
  answer: string | string[];
}

export interface Classroom {
  id: string;
  name: string;
  students: Student[];
  ownerId: string;
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
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user && db) {
      setLoading(true);
      const fetchClassrooms = async () => {
        try {
          const q = query(collection(db, "classrooms"), where("ownerId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const fetchedClassrooms = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Classroom));
          setClassrooms(fetchedClassrooms);
        } catch (error) {
          console.error("Failed to fetch classrooms:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchClassrooms();
    } else {
      setClassrooms([]);
      setActiveClassroom(null);
      setLoading(false);
    }
  }, [user]);

  const updateLocalClassroom = (classroomId: string, updater: (classroom: Classroom) => Classroom) => {
    const updaterWithActive = (c: Classroom) => {
      const updated = updater(c);
      if (activeClassroom?.id === classroomId) {
        setActiveClassroom(updated);
      }
      return updated;
    }
    setClassrooms(prev => prev.map(c => c.id === classroomId ? updaterWithActive(c) : c));
  };
  
  const addClassroom = async (name: string) => {
    if (!user || !db) return;
    const newClassroomData = { name, ownerId: user.uid, students: [] };
    const docRef = await addDoc(collection(db, "classrooms"), newClassroomData);
    setClassrooms(prev => [...prev, { id: docRef.id, ...newClassroomData }]);
  };

  const updateClassroom = async (id: string, name: string) => {
    if (!db) return;
    const classroomRef = doc(db, 'classrooms', id);
    await updateDoc(classroomRef, { name });
    updateLocalClassroom(id, c => ({ ...c, name }));
  };

  const deleteClassroom = async (id: string) => {
    if (!db) return;
    const classroomRef = doc(db, 'classrooms', id);
    await deleteDoc(classroomRef);
    setClassrooms(prev => prev.filter(c => c.id !== id));
    if (activeClassroom?.id === id) {
      setActiveClassroom(null);
    }
  };

  const addStudent = async (classroomId: string, studentName: string) => {
    if (!db) return;
    const newStudent: Student = { id: `${Date.now()}`, name: studentName };
    const classroomRef = doc(db, 'classrooms', classroomId);
    await updateDoc(classroomRef, { students: arrayUnion(newStudent) });
    updateLocalClassroom(classroomId, c => ({ ...c, students: [...c.students, newStudent] }));
  };
  
  const updateStudent = async (classroomId: string, studentId: string, newName: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!db || !classroom) return;
    const updatedStudents = classroom.students.map(s => s.id === studentId ? { ...s, name: newName } : s);
    const classroomRef = doc(db, 'classrooms', classroomId);
    await updateDoc(classroomRef, { students: updatedStudents });
    updateLocalClassroom(classroomId, c => ({ ...c, students: updatedStudents }));
  };

  const deleteStudent = async (classroomId: string, studentId: string) => {
    const classroom = classrooms.find(c => c.id === classroomId);
    if (!db || !classroom) return;
    const studentToDelete = classroom.students.find(s => s.id === studentId);
    if (!studentToDelete) return;
    const classroomRef = doc(db, 'classrooms', classroomId);
    await updateDoc(classroomRef, { students: arrayRemove(studentToDelete) });
    updateLocalClassroom(classroomId, c => ({ ...c, students: c.students.filter(s => s.id !== studentId) }));
  };

  const importStudents = async (classroomId: string, studentNames: string[]) => {
    if (!db) return;
    const newStudents: Student[] = studentNames.map(name => ({ id: `${Date.now()}-${name.replace(/\s/g, '-')}`, name }));
    const classroomRef = doc(db, 'classrooms', classroomId);
    await updateDoc(classroomRef, { students: arrayUnion(...newStudents) });
    updateLocalClassroom(classroomId, c => ({ ...c, students: [...c.students, ...newStudents] }));
  };

  const value = {
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
    importStudents
  };

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
