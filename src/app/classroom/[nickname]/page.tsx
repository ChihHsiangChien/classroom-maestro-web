
'use client';

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Hourglass, CheckSquare } from "lucide-react";
import { StudentQuestionForm } from "@/components/student-poll";
import type { QuestionData } from "@/components/create-poll-form";
import { useI18n } from "@/lib/i18n/provider";
import { useClassroom, type Classroom } from "@/contexts/classroom-context";

interface ClassroomPageProps {
  params: {
    classId: string;
    studentId: string;
  };
}

export default function ClassroomPage({ params }: ClassroomPageProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { listenForClassroom, addSubmission } = useClassroom();
  
  const classId = params.classId;
  const studentId = params.studentId;
  const studentName = searchParams.get('name') || 'Student';

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [lastAnsweredQuestionId, setLastAnsweredQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (classId) {
      const unsubscribe = listenForClassroom(classId, (updatedClassroom) => {
        setClassroom(updatedClassroom);
        const question = updatedClassroom.activeQuestion ?? null;
        setActiveQuestion(question);
        // If question changes, allow student to answer again
        if (question?.id !== activeQuestion?.id) {
          setLastAnsweredQuestionId(null);
        }
      });
      return () => unsubscribe();
    }
  }, [classId, listenForClassroom, activeQuestion?.id]);

  const handleVoteSubmit = (answer: string | string[]) => {
    if (activeQuestion && classId && studentId) {
      addSubmission(classId, (activeQuestion as any).id, studentId, studentName, answer);
      setLastAnsweredQuestionId((activeQuestion as any).id);
    }
  };

  const hasVoted = activeQuestion ? lastAnsweredQuestionId === (activeQuestion as any).id : false;

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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckSquare className="h-6 w-6 text-green-600" />
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      {renderContent()}
    </main>
  );
}
