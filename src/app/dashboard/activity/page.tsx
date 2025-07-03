
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
import { type Student, type Submission } from "@/components/student-management";
import { LotteryModal } from "@/components/lottery-modal";
import { useI18n } from "@/lib/i18n/provider";
import { useClassroom } from "@/contexts/classroom-context";
import { ArrowLeft } from "lucide-react";

export default function ActivityPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { activeClassroom } = useClassroom();

  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [openSections, setOpenSections] = useState({
    responses: true,
  });
  const [lotteryStudent, setLotteryStudent] = useState<(Student & { submission?: Submission }) | null>(null);

  // If there's no active classroom, redirect back to the dashboard.
  useEffect(() => {
    if (!activeClassroom) {
      router.replace('/dashboard');
    }
  }, [activeClassroom, router]);

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

  const handlePickStudent = () => {
    if (!activeClassroom || activeClassroom.students.length === 0) {
      return;
    }
    const randomIndex = Math.floor(Math.random() * activeClassroom.students.length);
    const student = activeClassroom.students[randomIndex];
    const submission = submissions.find(s => s.studentId.toString() === student.id);
    setLotteryStudent({ ...student, submission });
  };

  const handleCloseLottery = (open: boolean) => {
    if (!open) {
      setLotteryStudent(null);
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
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t('teacherDashboard.title')}</h1>
              <p className="text-muted-foreground">{activeClassroom.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handlePickStudent} disabled={activeClassroom.students.length === 0}>
            {t('studentManagement.lottery_button')}
          </Button>
        </header>

        <div className="space-y-6">
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
        </div>
      </div>
       <LotteryModal 
          studentData={lotteryStudent} 
          onOpenChange={handleCloseLottery}
          onPickAgain={handlePickStudent} 
          activeQuestion={activeQuestion}
      />
    </>
  );
}
