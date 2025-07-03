"use client";

import { useState, use } from "react";
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

interface ClassroomPageProps {
  params: {
    nickname: string;
  };
}

export default function ClassroomPage({ params }: ClassroomPageProps) {
  const { t } = useI18n();
  // Per Next.js warning, we unwrap the params object which is a promise-like.
  const resolvedParams = use(params);
  const studentName = decodeURIComponent(resolvedParams.nickname);
  
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Moved mock data inside component to use translations
  const mockMultipleChoice: QuestionData = {
    type: 'multiple-choice',
    question: t('classroomPage.mock_mc_question'),
    options: [
      { value: t('classroomPage.mock_mc_option1') },
      { value: t('classroomPage.mock_mc_option2') },
      { value: t('classroomPage.mock_mc_option3') },
      { value: t('classroomPage.mock_mc_option4') },
    ],
    allowMultipleAnswers: false
  };
  const mockTrueFalse: QuestionData = { type: 'true-false', question: t('classroomPage.mock_tf_question') };
  const mockShortAnswer: QuestionData = { type: 'short-answer', question: t('classroomPage.mock_sa_question') };
  const mockDrawing: QuestionData = { type: 'drawing', question: t('classroomPage.mock_drawing_question') };
  const mockImageAnnotation: QuestionData = {
    type: 'image-annotation',
    question: t('classroomPage.mock_ia_question'),
    imageUrl: 'https://placehold.co/600x400.png'
  };


  const handleVoteSubmit = () => {
    setHasVoted(true);
    setActiveQuestion(null);
  };

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
          <CardContent>
            <Button onClick={() => setHasVoted(false)}>{t('classroomPage.answer_another_question_button')}</Button>
          </CardContent>
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
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {t('classroomPage.demo_prompt')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setActiveQuestion(mockMultipleChoice)}>{t('classroomPage.simulate_mc_button')}</Button>
            <Button onClick={() => setActiveQuestion(mockTrueFalse)}>{t('classroomPage.simulate_tf_button')}</Button>
            <Button onClick={() => setActiveQuestion(mockShortAnswer)}>{t('classroomPage.simulate_sa_button')}</Button>
            <Button onClick={() => setActiveQuestion(mockDrawing)}>{t('classroomPage.simulate_drawing_button')}</Button>
            <Button onClick={() => setActiveQuestion(mockImageAnnotation)}>{t('classroomPage.simulate_annotation_button')}</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      {renderContent()}
    </main>
  );
}
