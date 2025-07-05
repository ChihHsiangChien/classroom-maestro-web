
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
import { RaceModal } from "@/components/race-modal";
import { CoursewarePicker } from "@/components/courseware-picker";
import { useI18n } from "@/lib/i18n/provider";
import { useClassroom } from "@/contexts/classroom-context";
import { useToast } from "@/hooks/use-toast";
import { PanelLeftClose, PanelLeftOpen, Eye, Loader2, UserCheck } from "lucide-react";
import { ManagementPanel } from "@/components/management-panel";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

// Add a unique ID to the QuestionData type
type QuestionDataWithId = QuestionData & { id: string };

export default function ActivityPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { activeClassroom, setActiveQuestionInDB, listenForSubmissions, loading: classroomLoading, startRace, resetRace, updateTeacherHeartbeat, pingStudents } = useClassroom();
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // --- Lottery State ---
  const [isLotteryModalOpen, setIsLotteryModalOpen] = useState(false);
  const [lotteryStudent, setLotteryStudent] = useState<(Student & { submission?: Submission }) | null>(null);
  const [pickedStudentIds, setPickedStudentIds] = useState<string[]>([]);
  const [lotteryPoolSource, setLotteryPoolSource] = useState<'all' | 'online'>('all');
  const [isUniquePick, setIsUniquePick] = useState(true);


  const activeQuestion = activeClassroom?.activeQuestion || null;
  const race = activeClassroom?.race || null;

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

  useEffect(() => {
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

  // Heartbeat effect to signal teacher presence
  useEffect(() => {
      if (!activeClassroom) return;

      // Initial heartbeat
      updateTeacherHeartbeat(activeClassroom.id);

      const intervalId = setInterval(() => {
          updateTeacherHeartbeat(activeClassroom.id);
      }, 30000); // Update every 30 seconds

      return () => {
          clearInterval(intervalId);
      };
  }, [activeClassroom, updateTeacherHeartbeat]);

  const handleEndQuestion = async () => {
    if (activeClassroom) {
      await setActiveQuestionInDB(activeClassroom.id, null);
    }
  };
  
  const handleQuestionCreate = async (question: QuestionData) => {
    if (!activeClassroom) return;

    const baseQuestion = {
      id: `q_${Date.now()}`,
      type: question.type,
      question: question.question,
    };

    let newQuestion: QuestionDataWithId;

    switch (question.type) {
      case 'multiple-choice':
        newQuestion = {
          ...baseQuestion,
          type: 'multiple-choice',
          options: question.options || [],
          allowMultipleAnswers: question.allowMultipleAnswers || false,
        };
        break;
      case 'image-annotation':
        newQuestion = {
          ...baseQuestion,
          type: 'image-annotation',
          imageUrl: question.imageUrl,
        };
        break;
      case 'true-false':
         newQuestion = {
          ...baseQuestion,
          type: 'true-false',
        };
        break;
      case 'short-answer':
        newQuestion = {
          ...baseQuestion,
          type: 'short-answer',
        };
        break;
      case 'drawing':
        newQuestion = {
          ...baseQuestion,
          type: 'drawing',
        };
        break;
      default:
        // This should not be reached if all question types are handled
        console.error("Unknown question type:", question);
        return;
    }
    
    await setActiveQuestionInDB(activeClassroom.id, newQuestion);
    setSubmissions([]);
  };

  const handlePickStudent = () => {
    if (!activeClassroom || !activeClassroom.students || activeClassroom.students.length === 0) {
      return;
    }

    const studentPool = lotteryPoolSource === 'all'
        ? activeClassroom.students
        : activeClassroom.students.filter(student => 
            student.isOnline === true && student.lastSeen && (Timestamp.now().seconds - student.lastSeen.seconds < 45)
          );
          
    const availableStudents = isUniquePick
        ? studentPool.filter(s => !pickedStudentIds.includes(s.id))
        : studentPool;

    if (availableStudents.length === 0) {
        toast({
            variant: "destructive",
            title: t('lotteryModal.lottery_no_students_in_pool'),
        });
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableStudents.length);
    const student = availableStudents[randomIndex];

    if (isUniquePick) {
      setPickedStudentIds(prev => [...prev, student.id]);
    }
    
    const submission = submissions.find(s => s.studentId.toString() === student.id);
    setLotteryStudent({ ...student, submission });
  };

  const handleResetLottery = () => {
    setPickedStudentIds([]);
    setLotteryStudent(null);
    toast({ title: t('lotteryModal.lottery_reset_toast') });
  };

  const handleCloseLottery = (open: boolean) => {
    setIsLotteryModalOpen(open);
    if (!open) {
      setLotteryStudent(null);
    }
  };
  
  const handleStartRace = () => {
    if (activeClassroom) {
      startRace(activeClassroom.id);
    }
  };

  const handleEndRace = () => {
     if (activeClassroom) {
      resetRace(activeClassroom.id);
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
  
  const activityInProgress = !!activeQuestion || !!race;

  return (
    <>
      <div className="mx-auto w-full max-w-full">
        <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
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
            <Button variant="outline" onClick={handleStartRace} disabled={activityInProgress}>
              {t('studentManagement.snatch_button')}
            </Button>
            <Button variant="outline" onClick={() => setIsLotteryModalOpen(true)} disabled={activityInProgress || !activeClassroom.students || activeClassroom.students.length === 0}>
               <UserCheck className="mr-2 h-4 w-4" />
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
              {!activeQuestion && !race ? (
                <div className="space-y-6">
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
                  <CoursewarePicker onQuestionSelect={handleQuestionCreate} />
                </div>
              ) : activeQuestion ? (
                <ActiveQuestion 
                  question={activeQuestion} 
                  onEndQuestion={handleEndQuestion}
                  students={activeClassroom.students}
                  submissions={submissions}
                />
              ) : null}
            </main>
        </div>
      </div>
       <LotteryModal 
          isOpen={isLotteryModalOpen}
          onOpenChange={handleCloseLottery}
          classroom={activeClassroom}
          pickedStudent={lotteryStudent}
          pickedStudentIds={pickedStudentIds}
          activeQuestion={activeQuestion}
          poolSource={lotteryPoolSource}
          onPoolSourceChange={setLotteryPoolSource}
          isUniquePick={isUniquePick}
          onIsUniquePickChange={setIsUniquePick}
          onPickStudent={handlePickStudent}
          onReset={handleResetLottery}
      />
      <RaceModal
          race={race}
          isOpen={!!race}
          onOpenChange={(open) => {
              if (!open) {
                  handleEndRace();
              }
          }}
          onReset={handleStartRace}
      />
    </>
  );
}
