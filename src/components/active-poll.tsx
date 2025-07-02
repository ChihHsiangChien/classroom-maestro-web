
"use client";

import { BarChart, Users, FileText, Image as ImageIcon, CheckCircle, PencilRuler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QuestionData, MultipleChoiceQuestion } from "./create-poll-form";
import React, { useMemo } from "react";
import type { Student } from "./student-management";
import { ScrollArea } from "./ui/scroll-area";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export interface Submission {
  studentId: number;
  studentName: string;
  answer: string;
}

interface ActiveQuestionProps {
  question: QuestionData;
  onEndQuestion: () => void;
  students: Student[];
  submissions: Submission[];
  onSubmissionsChange: React.Dispatch<React.SetStateAction<Submission[]>>;
}

function MultipleChoiceResults({ question, submissions, students }: { question: MultipleChoiceQuestion | (QuestionData & { type: 'true-false', options: { value: string }[] }); submissions: Submission[], students: Student[] }) {
  const results = useMemo(() => {
    const voteCounts = new Map<string, number>();
    question.options.forEach(option => voteCounts.set(option.value, 0));
    
    submissions.forEach(sub => {
      if (voteCounts.has(sub.answer)) {
        voteCounts.set(sub.answer, (voteCounts.get(sub.answer) || 0) + 1);
      }
    });

    const totalVotes = submissions.length;

    return question.options.map(option => {
      const votes = voteCounts.get(option.value) || 0;
      return {
        option: option.value,
        votes,
        percentage: totalVotes > 0 ? (votes / totalVotes) * 100 : 0
      };
    });
  }, [submissions, question.options]);

  const studentAnswers = useMemo(() => {
    const answerMap = new Map<number, string>();
    submissions.forEach(sub => {
        answerMap.set(sub.studentId, sub.answer);
    });
    return answerMap;
  }, [submissions]);

  const totalVotes = submissions.length;

  return (
    <div className="space-y-6">
      {/* Aggregate Results */}
      <div>
        <h3 className="mb-4 flex items-center text-lg font-semibold">
          <BarChart className="mr-2 h-5 w-5" /> Live Results
        </h3>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={`${result.option}-${index}`}>
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium">{result.option}</p>
                <p className="text-sm text-muted-foreground">
                  {result.votes} votes ({result.percentage.toFixed(0)}%)
                </p>
              </div>
              <Progress value={result.percentage} className="h-3" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{totalVotes} total votes</span></div>
        </div>
      </div>

      {/* Individual Student Responses Table */}
      {students.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center text-lg font-semibold">
            <Users className="mr-2 h-5 w-5" /> Student Responses
          </h3>
          <ScrollArea className="max-h-96 w-full rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="w-[150px]">Student</TableHead>
                  {question.options.map(option => (
                    <TableHead key={option.value} className="text-center">{option.value}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => {
                  const answer = studentAnswers.get(student.id);
                  return (
                    <TableRow key={student.id} data-answered={!!answer} className="data-[answered=true]:bg-green-500/10">
                      <TableCell className="font-medium">{student.name}</TableCell>
                      {question.options.map(option => (
                        <TableCell key={option.value} className="text-center">
                          {answer === option.value && (
                            <div className="flex justify-center">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function TextResponseResults({ submissions }: { submissions: Submission[] }) {
    if (submissions.length === 0) {
        return <div className="text-center text-muted-foreground py-8">Waiting for submissions...</div>;
    }

    return (
        <>
            <h3 className="mb-4 flex items-center text-lg font-semibold">
                <FileText className="mr-2 h-5 w-5" /> Student Responses
            </h3>
            <ScrollArea className="h-72 w-full rounded-md border p-4">
                <div className="space-y-4">
                    {submissions.map((sub, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-md">
                            <p className="font-semibold text-sm">{sub.studentName}</p>
                            <p className="text-foreground">{sub.answer}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </>
    );
}

function DrawingResults({ submissions }: { submissions: Submission[] }) {
    if (submissions.length === 0) {
        return <div className="text-center text-muted-foreground py-8">Waiting for submissions...</div>;
    }
    return (
        <>
            <h3 className="mb-4 flex items-center text-lg font-semibold">
                <ImageIcon className="mr-2 h-5 w-5" /> Student Drawings
            </h3>
            <ScrollArea className="h-[500px] w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                    {submissions.map((sub, index) => (
                        <Card key={index} className="overflow-hidden">
                           <div className="aspect-video w-full bg-muted relative">
                             <Image src={sub.answer} alt={`Drawing by ${sub.studentName}`} layout="fill" objectFit="contain" data-ai-hint="student drawing" />
                           </div>
                           <CardFooter className="p-2 bg-muted/50 border-t">
                             <p className="text-sm font-medium">{sub.studentName}</p>
                           </CardFooter>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </>
    );
}

function SubmissionTracker({ students, submissions, onSimulateSubmission }: { students: Student[], submissions: Submission[], onSimulateSubmission: (student: Student) => void }) {
    const submittedIds = new Set(submissions.map(s => s.studentId));
    
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Submission Status</CardTitle>
                <CardDescription>{submissions.length} / {students.length} students have responded.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-48">
                    <div className="space-y-2">
                        {students.map(student => {
                            const hasSubmitted = submittedIds.has(student.id);
                            return (
                                <div key={student.id} className="flex items-center justify-between rounded-md p-2 bg-muted/50">
                                    <p className="font-medium">{student.name}</p>
                                    {hasSubmitted ? (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle className="h-5 w-5" />
                                            <span>Submitted</span>
                                        </div>
                                    ) : (
                                        <Button size="sm" variant="outline" onClick={() => onSimulateSubmission(student)}>
                                            Simulate Submission
                                        </Button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}


export function ActiveQuestion({ question, onEndQuestion, students, submissions, onSubmissionsChange }: ActiveQuestionProps) {
    const handleSimulateSubmission = (student: Student) => {
        let mockAnswer = '';
        switch(question.type) {
            case 'multiple-choice':
                mockAnswer = question.options[Math.floor(Math.random() * question.options.length)].value;
                break;
            case 'true-false':
                mockAnswer = Math.random() > 0.5 ? 'True' : 'False';
                break;
            case 'short-answer':
                mockAnswer = `這是來自 ${student.name} 的模擬答案，內容是隨機產生的。`;
                break;
            case 'drawing':
                mockAnswer = `https://placehold.co/400x300.png`;
                break;
        }
        
        const newSubmission: Submission = {
            studentId: student.id,
            studentName: student.name,
            answer: mockAnswer,
        };
        
        onSubmissionsChange(prev => [...prev, newSubmission]);
    };

    const renderResults = () => {
        switch (question.type) {
            case 'multiple-choice':
                return <MultipleChoiceResults question={question} submissions={submissions} students={students} />;
            case 'true-false':
                const trueFalseAsMc = { ...question, options: [{ value: "True" }, { value: "False" }] };
                return <MultipleChoiceResults question={trueFalseAsMc} submissions={submissions} students={students} />;
            case 'short-answer':
                return <TextResponseResults submissions={submissions} />;
            case 'drawing':
                return <DrawingResults submissions={submissions} />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl">{question.question}</CardTitle>
                            <CardDescription>
                                The question is live. View student responses below.
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

            <SubmissionTracker 
                students={students}
                submissions={submissions}
                onSimulateSubmission={handleSimulateSubmission}
            />
        </div>
    );
}

    