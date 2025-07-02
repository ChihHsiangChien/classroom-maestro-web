"use client";

import React, { useState } from "react";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { CreateQuestionForm } from "@/components/create-poll-form";
import { ActiveQuestion } from "@/components/active-poll";
import type { QuestionData } from "@/components/create-poll-form";
import { StudentManagement } from "@/components/student-management";
import type { Student } from "@/components/student-management";

const initialStudents: Student[] = [
    { id: 1, name: '01王大明' },
    { id: 2, name: '02李小花' },
    { id: 3, name: '03張三' },
    { id: 4, name: '04陳四' },
    { id: 5, name: '05林美麗' },
];

export default function TeacherPage() {
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [loggedInStudents, setLoggedInStudents] = useState<Student[]>([]);

  const handleEndQuestion = () => {
    setActiveQuestion(null);
  };
  
  // These functions simulate what would be API calls to a backend
  const handleAddStudent = (name: string) => {
    setStudents(prev => [...prev, { id: Date.now(), name }]);
  };

  const handleUpdateStudent = (id: number, name: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    setLoggedInStudents(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };
  
  const handleDeleteStudent = (id: number) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    setLoggedInStudents(prev => prev.filter(s => s.id !== id));
  };
  
  const handleKickStudent = (id: number) => {
    setLoggedInStudents(prev => prev.filter(s => s.id !== id));
  };
  
  // This would be triggered by a websocket/realtime event from students
  const handleStudentLogin = (student: Student) => {
    if (!loggedInStudents.find(s => s.id === student.id)) {
      setLoggedInStudents(prev => [...prev, student]);
    }
  };


  return (
    <React.Fragment>
      <main className="min-h-screen bg-muted/40 p-4 md:p-8">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <Button asChild variant="outline">
              <Link href="/">Exit Classroom</Link>
            </Button>
          </header>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {!activeQuestion ? (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle>Create a New Question</CardTitle>
                    <CardDescription>
                      Engage your students with a real-time question.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CreateQuestionForm onQuestionCreate={setActiveQuestion} />
                  </CardContent>
                </Card>
              ) : (
                <ActiveQuestion question={activeQuestion} onEndQuestion={handleEndQuestion} />
              )}
            </div>

            <aside className="space-y-6">
              <StudentManagement
                  students={students}
                  loggedInStudents={loggedInStudents}
                  onAddStudent={handleAddStudent}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onKickStudent={handleKickStudent}
                  // This is a mock function to simulate a student logging in
                  onStudentLogin={handleStudentLogin}
              />
              <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Lesson Status
                  </CardTitle>
                  <Clapperboard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {activeQuestion ? "Question Active" : "Idle"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeQuestion
                      ? "Waiting for responses"
                      : "Start a question to begin"}
                  </p>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </React.Fragment>
  );
}
