
'use client';

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Hourglass, CheckSquare, School, AlertTriangle } from "lucide-react";
import { StudentQuestionForm } from "@/components/student-poll";
import type { QuestionData } from "@/components/create-poll-form";
import { useI18n } from "@/lib/i18n/provider";
import { useClassroom, type Classroom } from "@/contexts/classroom-context";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


function ClassroomPageContent() {
  console.log("DEBUG: ClassroomPageContent rendering...");
  const { t } = useI18n();
  const params = useParams();
  const searchParams = useSearchParams();
  const { listenForClassroom, addSubmission } = useClassroom();
  
  const classId = params.nickname as string;
  const studentId = searchParams.get('studentId');
  const studentName = searchParams.get('name') || t('studentManagement.default_student_name');

  console.log("DEBUG: classId from params:", classId);
  console.log("DEBUG: studentId from searchParams:", studentId);
  console.log("DEBUG: studentName from searchParams:", studentName);


  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [lastAnsweredQuestionId, setLastAnsweredQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (classId) {
      console.log("DEBUG: useEffect triggered to listen for classroom", classId);
      const unsubscribe = listenForClassroom(classId, (updatedClassroom) => {
        console.log("DEBUG: Received classroom update", updatedClassroom);
        setClassroom(updatedClassroom);
        const question = updatedClassroom.activeQuestion ?? null;
        
        const currentQuestionId = activeQuestion ? (activeQuestion as any).id : null;
        
        // If question changes, allow student to answer again
        if (question?.id !== currentQuestionId) {
          setActiveQuestion(question);
          setLastAnsweredQuestionId(null);
        }
      });
      return () => {
        console.log("DEBUG: Unsubscribing from classroom listener");
        unsubscribe();
      }
    }
  }, [classId, listenForClassroom, activeQuestion]);


  const handleVoteSubmit = (answer: string | string[]) => {
    const questionId = activeQuestion ? (activeQuestion as any).id : null;
    if (questionId && classId && studentId) {
      addSubmission(classId, questionId, studentId, studentName, answer);
      setLastAnsweredQuestionId(questionId);
    }
  };

  const hasVoted = activeQuestion ? lastAnsweredQuestionId === (activeQuestion as any).id : false;
  
  if (!studentId || !classId) {
    console.error("DEBUG: Missing studentId or classId. Cannot render page content.");
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('joinPage.error_title')}</AlertTitle>
        <AlertDescription>
          {t('joinPage.invalid_link_error')}
        </AlertDescription>
      </Alert>
    );
  }

  const renderContent = () => {
    if (activeQuestion && !hasVoted) {
      return (
        <StudentQuestionForm question={activeQuestion} onVoteSubmit={handleVoteSubmit} />
      );
    }
    
    if (hasVoted) {
      return (
        <Card className="w-full max-w-2xl animate-in fade-in text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{t('classroomPage.submission_received_title')}</CardTitle>
            <CardDescription>
              {t('classroomPage.submission_received_description')}
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }
    
    return (
      <Card className="w-full max-w-2xl text-center shadow-lg">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Hourglass className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t('classroomPage.welcome_title', { studentName })}</CardTitle>
          <CardDescription>
            {t('classroomPage.welcome_description')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  };

  return renderContent();
}

// Wrap the client component in a Suspense boundary
export default function ClassroomPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center">
                    <School className="h-12 w-12 animate-pulse text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading classroom...</p>
                </div>
            }>
                <ClassroomPageContent />
            </Suspense>
        </main>
    );
}
