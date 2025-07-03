
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
import type { Student, Submission } from "@/components/student-management";
import { LotteryModal } from "@/components/lottery-modal";
import { useI18n } from "@/lib/i18n/provider";
import { useClassroom, type Classroom } from "@/contexts/classroom-context";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ManagementPanel } from "@/components/management-panel";
import { cn } from "@/lib/utils";

export default function ActivityPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { activeClassroom } = useClassroom();
  const { toast } = useToast();

  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [openSections, setOpenSections] = useState({
    responses: true,
  });
  const [lotteryStudent, setLotteryStudent] = useState<(Student & { submission?: Submission }) | null>(null);
  const [excludePicked, setExcludePicked] = useState(true);
  const [pickedStudentIds, setPickedStudentIds] = useState<string[]>([]);
  const [joinUrl, setJoinUrl] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // If there's no active classroom, redirect back to the dashboard.
  useEffect(() => {
    if (!activeClassroom) {
      router.replace('/dashboard');
    }
  }, [activeClassroom, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && activeClassroom) {
      try {
        const classroomToEncode: Classroom = {
            id: activeClassroom.id,
            name: activeClassroom.name,
            students: activeClassroom.students
        };
        const classroomJson = JSON.stringify(classroomToEncode);
        const encodedData = encodeURIComponent(classroomJson);
        setJoinUrl(`${window.location.origin}/join?classroom=${encodedData}`);
      } catch (e) {
        console.error("Failed to encode classroom data for URL", e);
        setJoinUrl(`${window.location.origin}/join`); // Fallback URL
      }
    }
  }, [activeClassroom]);

  const handleToggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleEndQuestion = () => {
    setActiveQuestion(null);
    setPickedStudentIds([]); // Reset lottery
  };
  
  const handleQuestionCreate = (question: QuestionData) => {
    setActiveQuestion(question);
    setSubmissions([]);
    setPickedStudentIds([]); // Reset lottery for new question
  };

  const handlePickStudent = () => {
    if (!activeClassroom || activeClassroom.students.length === 0) {
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

  if (!activeClassroom) {
      return (
        <div className="flex items-center justify-center h-full">
            <p>{t('common.loading')}</p>
        </div>
      );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-full">
        <header className="mb-6 flex items-center justify-between">
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
          <Button variant="outline" onClick={handlePickStudent} disabled={activeClassroom.students.length === 0}>
            {t('studentManagement.lottery_button')}
          </Button>
        </header>

        <div className="flex flex-col lg:flex-row items-start gap-8">
            {isPanelOpen && (
              <aside className="w-full lg:w-1/3 lg:sticky lg:top-6 space-y-6 animate-in fade-in-0 slide-in-from-left-12 duration-300">
                  <ManagementPanel
                      classroom={activeClassroom}
                      submissions={submissions}
                      joinUrl={joinUrl}
                      activeQuestion={activeQuestion}
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
                  onSubmissionsChange={setSubmissions}
                  isResponsesOpen={openSections.responses}
                  onResponsesToggle={() => handleToggleSection('responses')}
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
