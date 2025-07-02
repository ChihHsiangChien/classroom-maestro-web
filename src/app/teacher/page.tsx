"use client";

import { useState } from "react";
import { Users, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { CreatePollForm, type PollData } from "@/components/create-poll-form";
import { ActivePoll } from "@/components/active-poll";

export default function TeacherPage() {
  const [activePoll, setActivePoll] = useState<PollData | null>(null);

  const handleEndPoll = () => {
    setActivePoll(null);
  };

  return (
    <main className="min-h-screen bg-muted/40 p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <Button asChild variant="outline">
            <Link href="/">Exit Classroom</Link>
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            {!activePoll ? (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Create a New Poll</CardTitle>
                  <CardDescription>
                    Engage your students with a real-time question.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CreatePollForm onPollCreate={setActivePoll} />
                </CardContent>
              </Card>
            ) : (
              <ActivePoll poll={activePoll} onEndPoll={handleEndPoll} />
            )}
          </div>

          <aside className="space-y-6">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Live Students
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No students have joined yet.
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Lesson Status
                </CardTitle>
                <Clapperboard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {activePoll ? "Poll Active" : "Idle"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activePoll
                    ? "Waiting for responses"
                    : "Start a poll to begin"}
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
