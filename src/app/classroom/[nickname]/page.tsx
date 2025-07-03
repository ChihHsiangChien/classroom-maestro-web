
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useClassroom } from '@/contexts/classroom-context';
import type { Classroom } from '@/contexts/classroom-context';
import { StudentQuestionForm } from '@/components/student-poll';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { School, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

function ClassroomPageContent() {
  console.log('[DEBUG] ClassroomPageContent: Component rendering started.');
  const { t } = useI18n();
  const params = useParams();
  const searchParams = useSearchParams();

  const classId = params.nickname as string;
  const studentId = searchParams.get('studentId') as string;
  const studentName = searchParams.get('name') as string;

  console.log(`[DEBUG] ClassroomPageContent: Received params: classId=${classId}, studentId=${studentId}, studentName=${decodeURIComponent(studentName || '')}`);

  const { listenForClassroom, addSubmission, listenForSubmissions } = useClassroom();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('[DEBUG] ClassroomPageContent: First useEffect triggered.');
    if (!classId) {
      console.log('[DEBUG] ClassroomPageContent: classId is missing, returning from useEffect.');
      return;
    }

    setLoading(true);
    console.log('[DEBUG] ClassroomPageContent: Setting up classroom listener.');
    const unsubscribe = listenForClassroom(classId, (classroomData) => {
      console.log('[DEBUG] ClassroomPageContent: Received classroom data from listener.', classroomData);
      setClassroom(classroomData);
      setLoading(false);
    });

    return () => {
      console.log('[DEBUG] ClassroomPageContent: Cleaning up classroom listener.');
      unsubscribe();
    }
  }, [classId, listenForClassroom]);

  useEffect(() => {
    console.log('[DEBUG] ClassroomPageContent: Second useEffect triggered.');
    if (!classId || !studentId || !classroom?.activeQuestion?.id) {
       console.log('[DEBUG] ClassroomPageContent: Missing data for submission listener, returning.', { classId, studentId, activeQuestionId: classroom?.activeQuestion?.id });
       return;
    }
    
    console.log('[DEBUG] ClassroomPageContent: Setting up submissions listener.');
    const unsubscribe = listenForSubmissions(classId, classroom.activeQuestion.id, (submissions) => {
      console.log('[DEBUG] ClassroomPageContent: Received submissions data from listener.', submissions);
      const studentHasSubmitted = submissions.some(s => s.studentId === studentId);
      if (studentHasSubmitted) {
        console.log('[DEBUG] ClassroomPageContent: Student has submitted for the active question.');
        setSubmittedQuestionIds(prev => new Set(prev).add(classroom.activeQuestion!.id));
      }
    });

    return () => {
       console.log('[DEBUG] ClassroomPageContent: Cleaning up submissions listener.');
       unsubscribe();
    }

  }, [classId, studentId, classroom?.activeQuestion?.id, listenForSubmissions]);


  const handleVoteSubmit = async (answer: string | string[]) => {
    if (!classroom?.activeQuestion?.id || !studentId || !studentName) return;

    try {
      console.log(`[DEBUG] ClassroomPageContent: Submitting vote:`, { classId, questionId: classroom.activeQuestion.id, studentId, studentName, answer });
      await addSubmission(classId, classroom.activeQuestion.id, studentId, studentName, answer);
      setSubmittedQuestionIds(prev => new Set(prev).add(classroom.activeQuestion!.id));
    } catch (error) {
      console.error("Failed to submit answer:", error);
    }
  };

  if (loading) {
    console.log('[DEBUG] ClassroomPageContent: Render - Loading state.');
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const activeQuestion = classroom?.activeQuestion;
  const hasSubmitted = activeQuestion && submittedQuestionIds.has(activeQuestion.id);

  if (activeQuestion && !hasSubmitted) {
    console.log('[DEBUG] ClassroomPageContent: Render - Showing question form.');
    return <StudentQuestionForm question={activeQuestion} onVoteSubmit={handleVoteSubmit} />;
  }
  
  if (hasSubmitted) {
    console.log('[DEBUG] ClassroomPageContent: Render - Showing submission received message.');
    return (
      <Card className="w-full max-w-md text-center animate-in fade-in">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <School className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle>{t('classroomPage.submission_received_title')}</CardTitle>
          <CardDescription>{t('classroomPage.submission_received_description')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  console.log('[DEBUG] ClassroomPageContent: Render - Showing welcome message.');
  return (
    <Card className="w-full max-w-md text-center animate-in fade-in">
      <CardHeader>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <School className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{t('classroomPage.welcome_title', { studentName: decodeURIComponent(studentName || 'Student') })}</CardTitle>
        <CardDescription>{t('classroomPage.welcome_description')}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function ClassroomPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }>
        <ClassroomPageContent />
      </Suspense>
    </main>
  );
}
