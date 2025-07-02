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
import { Hourglass, Send, CheckSquare } from "lucide-react";
import Link from "next/link";
import { StudentPoll } from "@/components/student-poll";
import type { PollData } from "@/components/create-poll-form";

interface ClassroomPageProps {
  params: {
    nickname: string;
  };
}

const mockPoll: PollData = {
  question: "What topic are you most excited to learn about today?",
  options: [
    { value: "The Renaissance Period" },
    { value: "Quantum Physics" },
    { value: "Modern Web Development" },
    { value: "The French Revolution" },
  ],
};

export default function ClassroomPage({ params }: ClassroomPageProps) {
  const nickname = decodeURIComponent(params.nickname);
  const [view, setView] = useState<"waiting" | "polling" | "voted">("waiting");

  const handleStartPoll = () => {
    setView("polling");
  };

  const handleVoteSubmit = () => {
    setView("voted");
  };

  const renderContent = () => {
    switch (view) {
      case "polling":
        return (
          <StudentPoll poll={mockPoll} onVoteSubmit={handleVoteSubmit} />
        );
      case "voted":
        return (
          <Card className="w-full max-w-2xl animate-in fade-in text-center shadow-lg">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckSquare className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Vote Submitted!</CardTitle>
              <CardDescription>
                Your response has been recorded. Please wait for the teacher to
                show the results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </CardContent>
          </Card>
        );
      case "waiting":
      default:
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
                (For demo purposes, you can start a poll simulation)
              </p>
              <Button onClick={handleStartPoll}>
                <Send className="mr-2 h-4 w-4" />
                Simulate Poll Start
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      {renderContent()}
    </main>
  );
}
