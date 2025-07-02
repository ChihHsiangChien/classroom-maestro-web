"use client";

import { BarChart, Users, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QuestionData, MultipleChoiceQuestion } from "./create-poll-form";
import { useEffect, useState } from "react";

interface ActiveQuestionProps {
  question: QuestionData;
  onEndQuestion: () => void;
}

function MultipleChoiceResults({ question }: { question: MultipleChoiceQuestion | (QuestionData & { type: 'true-false', options: {value: string}[]}) }) {
    const [results, setResults] = useState<{ votes: number; percentage: number }[]>([]);

    useEffect(() => {
        let totalVotes = 0;
        const initialResults = question.options.map(() => {
            const votes = Math.floor(Math.random() * 20);
            totalVotes += votes;
            return { votes, percentage: 0 };
        });

        const finalResults = initialResults.map((result) => ({
            ...result,
            percentage: totalVotes > 0 ? (result.votes / totalVotes) * 100 : 0,
        }));

        setResults(finalResults);
    }, [question.options]);

    return (
        <>
            <div>
                <h3 className="mb-4 flex items-center text-lg font-semibold">
                    <BarChart className="mr-2 h-5 w-5" /> Live Results
                </h3>
                <div className="space-y-4">
                    {question.options.map((option, index) => {
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
                <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{results.reduce((acc, r) => acc + r.votes, 0)} total votes</span></div>
                <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Real-time updates</span></div>
            </div>
        </>
    );
}

function OtherResults({ icon, title }: { icon: React.ReactNode, title: string }) {
    return (
        <div className="text-center py-8">
            {icon}
            <h3 className="mt-2 text-lg font-semibold">{title} Responses</h3>
            <p className="text-muted-foreground">Waiting for student submissions...</p>
            <div className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Real-time updates</span></div>
        </div>
    );
}

export function ActiveQuestion({ question, onEndQuestion }: ActiveQuestionProps) {
  const renderResults = () => {
    switch(question.type) {
        case 'multiple-choice':
            return <MultipleChoiceResults question={question} />;
        case 'true-false':
            const trueFalseAsMc = { ...question, options: [{value: "True"}, {value: "False"}] };
            return <MultipleChoiceResults question={trueFalseAsMc} />;
        case 'short-answer':
            return <OtherResults icon={<FileText className="mx-auto h-10 w-10 text-muted-foreground" />} title="Short Answer" />;
        case 'drawing':
            return <OtherResults icon={<ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />} title="Drawing" />;
        default:
            return null;
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{question.question}</CardTitle>
            <CardDescription>
              The question is live. Waiting for student responses.
            </CardDescription>
          </div>
          <Button variant="destructive" onClick={onEndQuestion}>
            End Question
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderResults()}
      </CardContent>
    </Card>
  );
}
