
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateQuestionForm } from "@/components/create-poll-form";
import { ActiveQuestion } from "@/components/active-poll";
import type { QuestionData, TrueFalseQuestion, MultipleChoiceQuestion } from "@/components/create-poll-form";
import type { Student, Submission } from "@/contexts/classroom-context";
import { LotteryModal } from "@/components/lottery-modal";
import { RaceModal } from "@/components/race-modal";
import { CoursewarePicker } from "@/components/courseware-picker";
import { useI18n } from "@/lib/i18n/provider";
import { useClassroom } from "@/contexts/classroom-context";
import { useCourseware } from "@/contexts/courseware-context";
import { useToast } from "@/hooks/use-toast";
import { PanelLeftClose, PanelLeftOpen, Eye, Loader2, UserCheck, Rocket, History, Save } from "lucide-react";
import { ManagementPanel } from "@/components/management-panel";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Add a unique ID to the QuestionData type
type QuestionDataWithId = QuestionData & { id: string; showAnswer?: boolean; };

// Helper to check for correct answers
const areArraysEqual = (arr1: (string|number)[], arr2: (string|number)[]) => {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((value, index) => String(value) === String(sorted2[index]));
};

export default function ActivityPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { activeClassroom, setActiveQuestionInDB, listenForSubmissions, loading: classroomLoading, startRace, resetRace, pingStudents, revealAnswer, awardPoints } = useClassroom();
  const { addCoursewareFromActivities } = useCourseware();
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

  // --- Session History State ---
  const [activityHistory, setActivityHistory] = useState<QuestionDataWithId[]>([]);
  const [isSaveCoursewareDialogOpen, setIsSaveCoursewareDialogOpen] = useState(false);
  const [newCoursewareName, setNewCoursewareName] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const activeQuestion = activeClassroom?.activeQuestion || null;
  const race = activeClassroom?.race || null;
  const activityInProgress = !!activeQuestion || !!race;

  // Create a ref to hold the latest activeClassroom data. This prevents stale closures in the unmount effect.
  const activeClassroomRef = useRef(activeClassroom);
  useEffect(() => {
    activeClassroomRef.current = activeClassroom;
  });

  // Automatically end the active question only when the teacher navigates away (component unmounts)
  useEffect(() => {
    return () => {
      const latestClassroom = activeClassroomRef.current;
      if (latestClassroom?.id && latestClassroom?.activeQuestion) {
        setActiveQuestionInDB(latestClassroom.id, null);
      }
    };
  }, [setActiveQuestionInDB]);

  useEffect(() => {
    if (!classroomLoading && (!activeClassroom || activeClassroom.isDismissed)) {
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

  const handleEndQuestion = async () => {
    if (activeClassroom) {
      await setActiveQuestionInDB(activeClassroom.id, null);
    }
  };

  const handleRevealAnswer = async () => {
    if (activeClassroom && activeQuestion && ('answer' in activeQuestion)) {
      const correctStudentIds: string[] = [];
      const correctAnswer = activeQuestion.answer;
      
      if (correctAnswer !== undefined) {
          const answerArray = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
          submissions.forEach(sub => {
              const studentAnswer = Array.isArray(sub.answer) ? sub.answer : [sub.answer];
              if (areArraysEqual(studentAnswer, answerArray)) {
                  correctStudentIds.push(sub.studentId);
              }
          });
      }

      if (correctStudentIds.length > 0) {
        const POINTS_PER_CORRECT_ANSWER = 10;
        await awardPoints(activeClassroom.id, correctStudentIds, POINTS_PER_CORRECT_ANSWER);
        toast({
            title: t('leaderboard.toast_scores_awarded_title'),
            description: t('leaderboard.toast_scores_awarded_description', { count: correctStudentIds.length, points: POINTS_PER_CORRECT_ANSWER }),
        });
      }

      await revealAnswer(activeClassroom.id);
    }
  };
  
  const handleQuestionCreate = async (question: QuestionData) => {
    if (!activeClassroom) return;

    const baseQuestion = {
      id: `q_${Date.now()}`,
      type: question.type,
      question: question.question,
      showAnswer: false,
    };

    let newQuestion: QuestionDataWithId;

    switch (question.type) {
      case 'multiple-choice':
        newQuestion = {
          ...baseQuestion,
          type: 'multiple-choice',
          options: (question as MultipleChoiceQuestion).options,
          allowMultipleAnswers: (question as MultipleChoiceQuestion).allowMultipleAnswers,
          answer: (question as MultipleChoiceQuestion).answer || [],
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
        const tfQuestionPayload: QuestionDataWithId = {
          ...baseQuestion,
          type: 'true-false',
        };
        // Only include the answer key if it exists to avoid sending 'undefined' to Firestore.
        // The check for `question.answer` must be `!== undefined` to handle the case where the answer is 0 (falsy).
        if (question.answer !== undefined && question.answer !== null) {
          tfQuestionPayload.answer = question.answer;
        }
        newQuestion = tfQuestionPayload;
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
        console.error("Unknown question type:", question);
        return;
    }
    
    await setActiveQuestionInDB(activeClassroom.id, newQuestion);
    setSubmissions([]);
    // Add to history only if it's not already the most recent item
    setActivityHistory(prev => {
        if (prev[prev.length -1]?.id !== newQuestion.id) {
            return [...prev, newQuestion];
        }
        return prev;
    });
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
  
  const handleReuseQuestion = (question: QuestionData) => {
    if (activityInProgress) {
        toast({
            variant: "destructive",
            title: t('teacherDashboard.activity_in_progress_title'),
            description: t('teacherDashboard.activity_in_progress_description'),
        });
        return;
    }
    handleQuestionCreate(question);
  };

  const handleSaveAsCourseware = async () => {
    if (!newCoursewareName.trim()) {
        toast({ variant: "destructive", title: t('common.error'), description: t('courseware.package_name_empty_error') });
        return;
    }
    try {
        const activitiesToSave = activityHistory.map(({ id, ...rest }) => rest);
        await addCoursewareFromActivities(newCoursewareName.trim(), activitiesToSave);
        toast({ title: t('courseware.toast_package_created') });
        setIsSaveCoursewareDialogOpen(false);
        setNewCoursewareName('');
    } catch (error) {
        // The context handles the specific error toast
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
              {t('teacherDashboard.simulate_student_view_button')}
            </Button>
            <Button variant="outline" onClick={handleStartRace} disabled={activityInProgress}>
              <Rocket className="mr-2 h-4 w-4" />
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
                      onRevealAnswer={handleRevealAnswer}
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
                  onRevealAnswer={handleRevealAnswer}
                  students={activeClassroom.students}
                  submissions={submissions}
                />
              ) : null}

              {activityHistory.length > 0 && !activityInProgress && (
                <Card className="mt-8 shadow-md">
                    <CardHeader>
                        <CardTitle>{t('teacherDashboard.session_history_title')}</CardTitle>
                        <CardDescription>{t('teacherDashboard.session_history_description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {activityHistory.map((activity, index) => (
                                <Collapsible 
                                    key={`${activity.id}-${index}`}
                                    open={expandedHistoryId === activity.id}
                                    onOpenChange={(isOpen) => setExpandedHistoryId(isOpen ? activity.id : null)}
                                >
                                    <div className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                                        <CollapsibleTrigger asChild>
                                            <div className="flex flex-1 items-center gap-3 overflow-hidden cursor-pointer">
                                                <History className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                                                <p className="truncate font-medium text-sm">{index + 1}. {activity.question}</p>
                                            </div>
                                        </CollapsibleTrigger>
                                        <Button onClick={() => handleReuseQuestion(activity)} disabled={activityInProgress}>
                                            {t('teacherDashboard.reuse_question_button')}
                                        </Button>
                                    </div>
                                    <CollapsibleContent>
                                        {activity.type === 'multiple-choice' && 'options' in activity && (
                                            <div className="pl-10 pr-4 pb-2">
                                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                    {(activity as MultipleChoiceQuestion).options.map((opt, optIndex) => (
                                                        <li key={optIndex}>{opt.value || <em>{t('common.empty_option')}</em>}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="border-t pt-6">
                        <Dialog open={isSaveCoursewareDialogOpen} onOpenChange={setIsSaveCoursewareDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t('teacherDashboard.save_as_courseware_button')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('teacherDashboard.save_courseware_dialog_title')}</DialogTitle>
                                    <DialogDescription>{t('teacherDashboard.save_courseware_dialog_description')}</DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Label htmlFor="courseware-name">{t('courseware.package_name_label')}</Label>
                                    <Input 
                                        id="courseware-name" 
                                        value={newCoursewareName}
                                        onChange={(e) => setNewCoursewareName(e.target.value)}
                                        placeholder={t('courseware.package_name_placeholder')} 
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsSaveCoursewareDialogOpen(false)}>{t('common.cancel')}</Button>
                                    <Button onClick={handleSaveAsCourseware}>{t('common.save')}</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardFooter>
                </Card>
              )}
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
