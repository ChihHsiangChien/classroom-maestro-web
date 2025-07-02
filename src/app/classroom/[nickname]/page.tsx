"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Hourglass, CheckSquare } from "lucide-react";
import Link from "next/link";
import { StudentQuestionForm } from "@/components/student-poll";
import type { QuestionData } from "@/components/create-poll-form";

interface ClassroomPageProps {
  params: {
    nickname: string;
  };
}

const mockMultipleChoice: QuestionData = {
  type: 'multiple-choice',
  question: "What is the powerhouse of the cell?",
  options: [
    { value: "Nucleus" },
    { value: "Ribosome" },
    { value: "Mitochondria" },
    { value: "Chloroplast" },
  ],
};
const mockTrueFalse: QuestionData = { type: 'true-false', question: 'The Great Wall of China is visible from space with the naked eye.' };
const mockShortAnswer: QuestionData = { type: 'short-answer', question: 'In one sentence, what is the meaning of life?' };
const mockDrawing: QuestionData = { type: 'drawing', question: 'Draw your favorite animal.' };

export default function ClassroomPage({ params }: ClassroomPageProps) {
  const nickname = decodeURIComponent(params.nickname);
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

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
            <CardTitle>Submission Received!</CardTitle>
            <CardDescription>
              Your response has been recorded. Please wait for the teacher to
              continue the lesson.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setHasVoted(false)}>Answer Another Question</Button>
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
          <CardTitle>Welcome, {nickname}!</CardTitle>
          <CardDescription>
            The lesson will begin shortly. Please wait for the teacher to
            start an activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            (For demo purposes, you can simulate receiving a question)
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setActiveQuestion(mockMultipleChoice)}>Simulate Multiple Choice</Button>
            <Button onClick={() => setActiveQuestion(mockTrueFalse)}>Simulate True/False</Button>
            <Button onClick={() => setActiveQuestion(mockShortAnswer)}>Simulate Short Answer</Button>
            <Button onClick={() => setActiveQuestion(mockDrawing)}>Simulate Drawing</Button>
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
