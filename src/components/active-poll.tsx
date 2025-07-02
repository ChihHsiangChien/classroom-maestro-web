"use client";

import { BarChart, Users, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PollData } from "./create-poll-form";
import { useEffect, useState } from "react";

interface ActivePollProps {
  poll: PollData;
  onEndPoll: () => void;
}

export function ActivePoll({ poll, onEndPoll }: ActivePollProps) {
  // Mock results that are randomly generated on mount
  const [results, setResults] = useState<
    { votes: number; percentage: number }[]
  >([]);

  useEffect(() => {
    let totalVotes = 0;
    const initialResults = poll.options.map(() => {
      const votes = Math.floor(Math.random() * 20);
      totalVotes += votes;
      return { votes, percentage: 0 };
    });

    const finalResults = initialResults.map((result) => ({
      ...result,
      percentage: totalVotes > 0 ? (result.votes / totalVotes) * 100 : 0,
    }));

    setResults(finalResults);
  }, [poll.options]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{poll.question}</CardTitle>
            <CardDescription>
              The poll is live. Waiting for student responses.
            </CardDescription>
          </div>
          <Button variant="destructive" onClick={onEndPoll}>
            End Poll
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-4 flex items-center text-lg font-semibold">
            <BarChart className="mr-2 h-5 w-5" />
            Live Results
          </h3>
          <div className="space-y-4">
            {poll.options.map((option, index) => {
              const result = results[index] || { votes: 0, percentage: 0 };
              return (
                <div key={index}>
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium">{option.value}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.votes} votes ({result.percentage.toFixed(0)}%)
                    </p>
                  </div>
                  <Progress value={result.percentage} className="h-3" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {results.reduce((acc, r) => acc + r.votes, 0)} total votes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Real-time updates</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
