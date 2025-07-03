
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Student {
  id: string;
  name: string;
}

export interface Classroom {
  id: string;
  name: string;
  students: Student[];
}

interface ClassroomContextType {
  classrooms: Classroom[];
  setClassrooms: React.Dispatch<React.SetStateAction<Classroom[]>>;
  activeClassroom: Classroom | null;
  setActiveClassroom: React.Dispatch<React.SetStateAction<Classroom | null>>;
  addStudent: (classroomId: string, studentName: string) => void;
  updateStudent: (classroomId: string, studentId: string, newName: string) => void;
  deleteStudent: (classroomId: string, studentId: string) => void;
  importStudents: (classroomId: string, studentNames: string[]) => void;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

const CLASSROOM_DATA_KEY = 'classroom_data';

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroom, setActiveClassroom] = useState<Classroom | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(CLASSROOM_DATA_KEY);
      if (savedData) {
        setClassrooms(JSON.parse(savedData));
      }
    } catch (error) {
      console.error("Failed to load classroom data from localStorage", error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CLASSROOM_DATA_KEY, JSON.stringify(classrooms));
      } catch (error) {
        console.error("Failed to save classroom data to localStorage", error);
      }
    }
  }, [classrooms, isLoaded]);

  const updateClassroom = (classroomId: string, updater: (classroom: Classroom) => Classroom) => {
    setClassrooms(prev => prev.map(c => c.id === classroomId ? updater(c) : c));
  };
  
  const addStudent = (classroomId: string, studentName: string) => {
    const newStudent: Student = { id: Date.now().toString(), name: studentName };
    updateClassroom(classroomId, c => ({ ...c, students: [...c.students, newStudent] }));
  };

  const updateStudent = (classroomId: string, studentId: string, newName: string) => {
    updateClassroom(classroomId, c => ({
      ...c,
      students: c.students.map(s => s.id === studentId ? { ...s, name: newName } : s),
    }));
  };

  const deleteStudent = (classroomId: string, studentId: string) => {
    updateClassroom(classroomId, c => ({
      ...c,
      students: c.students.filter(s => s.id !== studentId),
    }));
  };

  const importStudents = (classroomId: string, studentNames: string[]) => {
    const newStudents: Student[] = studentNames.map(name => ({ id: `${Date.now()}-${name}`, name }));
    updateClassroom(classroomId, c => ({ ...c, students: [...c.students, ...newStudents] }));
  };

  const value = {
    classrooms,
    setClassrooms,
    activeClassroom,
    setActiveClassroom,
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
