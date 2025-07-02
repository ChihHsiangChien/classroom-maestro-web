
"use client";

import React, { useState } from "react";
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
import { ActiveQuestion, type Submission } from "@/components/active-poll";
import type { QuestionData } from "@/components/create-poll-form";
import { StudentManagement } from "@/components/student-management";
import type { Student } from "@/components/student-management";
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

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
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [openSections, setOpenSections] = useState({
    roster: true,
    responses: true,
    management: true,
  });

  const handleToggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleEndQuestion = () => {
    setActiveQuestion(null);
  };
  
  const handleQuestionCreate = (question: QuestionData) => {
    setActiveQuestion(question);
    setSubmissions([]);
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
      setLoggedInStudents(prev => [...prev, { ...student, isFocused: true }]);
    }
  };

  const handleToggleStudentFocus = (studentId: number) => {
    setLoggedInStudents(prev => prev.map(s => 
      s.id === studentId ? { ...s, isFocused: !(s.isFocused ?? true) } : s
    ));
  };


  return (
    <SidebarProvider>
      <Sidebar side="right">
        <SidebarContent className="space-y-6 p-2">
           <StudentManagement
                students={students}
                loggedInStudents={loggedInStudents}
                onAddStudent={handleAddStudent}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onKickStudent={handleKickStudent}
                onStudentLogin={handleStudentLogin}
                onToggleStudentFocus={handleToggleStudentFocus}
                isManagementOpen={openSections.management}
                onManagementToggle={() => handleToggleSection('management')}
                isRosterOpen={openSections.roster}
                onRosterToggle={() => handleToggleSection('roster')}
            />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/">Exit Classroom</Link>
              </Button>
              <SidebarTrigger />
            </div>
          </header>

          <div className="space-y-6">
            {!activeQuestion ? (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Create a New Question</CardTitle>
                  <CardDescription>
                    Engage your students with a real-time question.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CreateQuestionForm onQuestionCreate={handleQuestionCreate} />
                </CardContent>
              </Card>
            ) : (
              <ActiveQuestion 
                question={activeQuestion} 
                onEndQuestion={handleEndQuestion}
                students={students}
                submissions={submissions}
                onSubmissionsChange={setSubmissions}
                isResponsesOpen={openSections.responses}
                onResponsesToggle={() => handleToggleSection('responses')}
              />
            )}
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
