
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CreateQuestionForm } from "@/components/create-poll-form";
import { ActiveQuestion } from "@/components/active-poll";
import type { QuestionData } from "@/components/create-poll-form";
import type { Student, Submission } from "@/contexts/classroom-context";
import { LotteryModal } from "@/components/lottery-modal";
import { useI18n } from "@/lib/i18n/provider";
import { useClassroom } from "@/contexts/classroom-context";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen, Eye, Loader2 } from "lucide-react";
import { ManagementPanel } from "@/components/management-panel";
import { cn } from "@/lib/utils";

// Add a unique ID to the QuestionData type
type QuestionDataWithId = QuestionData & { id: string };

export default function ActivityPage() {
  const { t } = useI18n();
  const router = useRouter();
  // Get the real-time active classroom directly from the context. This is the single source of truth.
  const { activeClassroom, setActiveQuestionInDB, listenForSubmissions, loading: classroomLoading } = useClassroom();
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [lotteryStudent, setLotteryStudent] = useState<(Student & { submission?: Submission }) | null>(null);
  const [excludePicked, setExcludePicked] = useState(true);
  const [pickedStudentIds, setPickedStudentIds] = useState<string[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // The active question is now derived directly from the live classroom data.
  const activeQuestion = activeClassroom?.activeQuestion || null;

  // If loading is finished and there's no active classroom, redirect back to the dashboard.
  useEffect(() => {
    if (!classroomLoading && !activeClassroom) {
      router.replace('/dashboard');
    }
  }, [activeClassroom, classroomLoading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && activeClassroom) {
        setJoinUrl(`${window.location.origin}/join?classId=${activeClassroom.id}`);
    }
  }, [activeClassroom]);

  // Listen for submissions in real-time when a question is active
  useEffect(() => {
    // When the active question ends (becomes null), clear the submissions.
    if (!activeQuestion) {
      setSubmissions([]);
      return;
    }
    
    if (activeClassroom) {
      const unsubscribe = listenForSubmissions(activeClassroom.id, activeQuestion.id, (newSubmissions) => {
        setSubmissions(newSubmissions);
      });
      return () => unsubscribe();
    }
  }, [activeQuestion, activeClassroom, listenForSubmissions]);

  const handleEndQuestion = async () => {
    if (activeClassroom) {
      await setActiveQuestionInDB(activeClassroom.id, null);
    }
    setPickedStudentIds([]);
  };
  
  const handleQuestionCreate = async (question: QuestionData) => {
    if (!activeClassroom) return;
    const newQuestion: QuestionDataWithId = { ...question, id: `q_${Date.now()}` };
    await setActiveQuestionInDB(activeClassroom.id, newQuestion);
    setSubmissions([]);
    setPickedStudentIds([]);
  };
  
  const handlePickStudent = () => {
    if (!activeClassroom || !activeClassroom.students || activeClassroom.students.length === 0) {
      return;
    }
    
    let availableStudents = activeClassroom.students;
    if (excludePicked) {
        availableStudents = activeClassroom.students.filter(s => !pickedStudentIds.includes(s.id));
    }

    if (availableStudents.length === 0) {
        toast({
            title: t('lotteryModal.lottery_reset_title'),
            description: t('lotteryModal.lottery_reset_description'),
        });
        setPickedStudentIds([]);
        availableStudents = activeClassroom.students;
    }

    const randomIndex = Math.floor(Math.random() * availableStudents.length);
    const student = availableStudents[randomIndex];

    if (excludePicked) {
        setPickedStudentIds(prev => [...prev, student.id]);
    }

    const submission = submissions.find(s => s.studentId.toString() === student.id);
    setLotteryStudent({ ...student, submission });
  };

  const handleCloseLottery = (open: boolean) => {
    if (!open) {
      setLotteryStudent(null);
    }
  };

  const handleExcludeChange = (checked: boolean | 'indeterminate') => {
    const isChecked = !!checked;
    setExcludePicked(isChecked);
    if (!isChecked) {
        setPickedStudentIds([]);
    }
  };

  const openStudentSimulation = () => {
    if (joinUrl) {
      window.open(joinUrl, '_blank');
    }
  };

  if (classroomLoading || !activeClassroom) {
      return (
        <div className="flex h-full min-h-[calc(100vh-10rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>{t('common.loading')}</p>
          </div>
        </div>
      );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-full">
        <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsPanelOpen(!isPanelOpen)}>
              {isPanelOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{activeClassroom.name}</h1>
              <p className="text-muted-foreground">{t('teacherDashboard.title')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openStudentSimulation}>
              <Eye className="mr-2 h-4 w-4" />
              Simulate Student View
            </Button>
            <Button variant="outline" onClick={handlePickStudent} disabled={!activeClassroom.students || activeClassroom.students.length === 0}>
              {t('studentManagement.lottery_button')}
            </Button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row items-start gap-8">
            {isPanelOpen && (
              <aside className="w-full lg:w-1/3 lg:sticky lg:top-6 space-y-6 animate-in fade-in-0 slide-in-from-left-12 duration-300">
                  <ManagementPanel
                      classroom={activeClassroom}
                      submissions={submissions}
                      joinUrl={joinUrl}
                      activeQuestion={activeQuestion}
                      onEndQuestion={handleEndQuestion}
                  />
              </aside>
            )}
            
            <main className={cn(
                "w-full space-y-6 transition-all duration-300",
                isPanelOpen ? "lg:w-2/3" : "lg:w-full"
            )}>
              {!activeQuestion ? (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle>{t('teacherDashboard.create_question_card_title')}</CardTitle>
                    <CardDescription>
                      {t('teacherDashboard.create_question_card_description')}
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
                  students={activeClassroom.students}
                  submissions={submissions}
                />
              )}
            </main>
        </div>
      </div>
       <LotteryModal 
          studentData={lotteryStudent} 
          onOpenChange={handleCloseLottery}
          onPickAgain={handlePickStudent} 
          activeQuestion={activeQuestion}
          excludePicked={excludePicked}
          onExcludePickedChange={handleExcludeChange}
      />
    </>
  );
}
