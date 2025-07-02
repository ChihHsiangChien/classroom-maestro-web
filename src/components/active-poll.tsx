
"use client";

import { BarChart as BarChartIcon, Users, FileText, Image as ImageIcon, CheckCircle, PencilRuler, Clapperboard, ChevronDown, Wand2, Loader2, BrainCircuit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QuestionData, MultipleChoiceQuestion, ImageAnnotationQuestion } from "./create-poll-form";
import React, { useMemo, useState, useTransition } from "react";
import type { Student, Submission } from "./student-management";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { analyzeShortAnswersAction } from "@/app/actions";
import type { AnalyzeShortAnswersOutput } from "@/ai/flows/analyze-short-answers";
import { Bar, XAxis, YAxis, CartesianGrid, BarChart, Tooltip as ChartTooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface ActiveQuestionProps {
  question: QuestionData;
  onEndQuestion: () => void;
  students: Student[];
  submissions: Submission[];
  onSubmissionsChange: React.Dispatch<React.SetStateAction<Submission[]>>;
  isResponsesOpen: boolean;
  onResponsesToggle: (isOpen: boolean) => void;
}

interface ResultsProps {
    submissions: Submission[];
    isResponsesOpen: boolean;
    onResponsesToggle: (isOpen: boolean) => void;
}

function MultipleChoiceResults({ question, submissions, students, isResponsesOpen, onResponsesToggle }: { question: MultipleChoiceQuestion | (QuestionData & { type: 'true-false', options: { value: string }[], allowMultipleAnswers?: boolean }); submissions: Submission[], students: Student[], isResponsesOpen: boolean, onResponsesToggle: (isOpen: boolean) => void }) {
  const results = useMemo(() => {
    const voteCounts = new Map<string, number>();
    question.options.forEach((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const optionIdentifier = option.value || letter;
        voteCounts.set(optionIdentifier, 0);
    });
    
    submissions.forEach(sub => {
      const answers = Array.isArray(sub.answer) ? sub.answer : [sub.answer];
      answers.forEach(answer => {
        if (voteCounts.has(answer)) {
          voteCounts.set(answer, (voteCounts.get(answer) || 0) + 1);
        }
      });
    });

    const totalVotes = submissions.reduce((acc, sub) => {
        return acc + (Array.isArray(sub.answer) ? sub.answer.length : 1);
    }, 0);

    return question.options.map((option, index) => {
      const letter = String.fromCharCode(65 + index);
      const optionIdentifier = option.value || letter;
      const votes = voteCounts.get(optionIdentifier) || 0;
      const displayValue = option.value ? `${letter}. ${option.value}` : letter;

      return {
        option: displayValue,
        votes,
        percentage: totalVotes > 0 ? (votes / (question.allowMultipleAnswers ? submissions.length : totalVotes)) * 100 : 0
      };
    });
  }, [submissions, question.options, question.allowMultipleAnswers]);

  const studentAnswers = useMemo(() => {
    const answerMap = new Map<number, string | string[]>();
    submissions.forEach(sub => {
        answerMap.set(sub.studentId, sub.answer);
    });
    return answerMap;
  }, [submissions]);

  const totalSubmissions = submissions.length;

  return (
    <div className="space-y-6">
      {/* Aggregate Results */}
      <div>
        <h3 className="mb-4 flex items-center text-lg font-semibold">
          <BarChartIcon className="mr-2 h-5 w-5" /> Live Results
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
          <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{totalSubmissions} student(s) responded</span></div>
        </div>
      </div>

      {/* Individual Student Responses Table */}
      {students.length > 0 && (
        <Collapsible open={isResponsesOpen} onOpenChange={onResponsesToggle}>
          <div className="flex items-center justify-between rounded-md border p-2">
            <h3 className="flex items-center text-lg font-semibold">
              <Users className="mr-2 h-5 w-5" /> Student Responses
            </h3>
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                    <span className="sr-only">Toggle Responses</span>
                </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="mt-2 rounded-md border">
              <ScrollArea className="max-h-96 w-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="w-[150px]">Student</TableHead>
                      {question.options.map((option, index) => {
                         const letter = String.fromCharCode(65 + index);
                         return (
                            <TableHead key={`${letter}-${index}`} className="text-center">{letter}</TableHead>
                         )
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map(student => {
                      const answer = studentAnswers.get(student.id);
                      return (
                        <TableRow key={student.id} data-answered={!!answer} className="data-[answered=true]:bg-green-500/10">
                          <TableCell className="font-medium">{student.name}</TableCell>
                          {question.options.map((option, index) => {
                             const letter = String.fromCharCode(65 + index);
                             const optionIdentifier = option.value || letter;
                            return (
                                <TableCell key={`${letter}-${index}`} className="text-center">
                                {answer && (Array.isArray(answer) ? answer.includes(optionIdentifier) : answer === optionIdentifier) && (
                                    <div className="flex justify-center">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    </div>
                                )}
                                </TableCell>
                            )
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function TextResponseResults({ submissions, isResponsesOpen, onResponsesToggle }: ResultsProps) {
    const [isAnalyzing, startTransition] = useTransition();
    const [analysis, setAnalysis] = useState<AnalyzeShortAnswersOutput | null>(null);
    const { toast } = useToast();

    const handleAnalyze = () => {
        const answers = submissions.map(sub => sub.answer as string).filter(a => a.trim() !== "");
        if (answers.length < 2) {
             toast({
                variant: "destructive",
                title: "Not enough data",
                description: "Need at least two answers to perform an analysis.",
            });
            return;
        }

        startTransition(async () => {
            setAnalysis(null);
            const result = await analyzeShortAnswersAction({ answers });
            if (result.analysis) {
                setAnalysis(result.analysis);
            } else {
                toast({
                    variant: "destructive",
                    title: "Analysis Failed",
                    description: result.error,
                });
            }
        });
    };

    if (submissions.length === 0) {
        return <div className="text-center text-muted-foreground py-8">Waiting for submissions...</div>;
    }

    return (
        <div className="space-y-4">
            <Collapsible open={isResponsesOpen} onOpenChange={onResponsesToggle}>
                 <div className="flex items-center justify-between rounded-md border p-2 mb-2">
                    <h3 className="flex items-center text-lg font-semibold">
                        <FileText className="mr-2 h-5 w-5" /> Student Responses
                    </h3>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                            <span className="sr-only">Toggle Responses</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {submissions.map((sub, index) => (
                                <div key={index} className="p-3 bg-muted/50 rounded-md">
                                    <p className="font-semibold text-sm">{sub.studentName}</p>
                                    <p className="text-foreground">{sub.answer as string}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center gap-4 border-t pt-4">
                <Button onClick={handleAnalyze} disabled={isAnalyzing || submissions.length < 2}>
                    {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Analyze Answers with AI
                </Button>
                {submissions.length < 2 && <p className="text-sm text-muted-foreground">Need at least 2 submissions to analyze.</p>}
            </div>

            {isAnalyzing && (
                <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">AI is analyzing the answers...</p>
                </div>
            )}
            
            {analysis && (
                <div className="space-y-6 animate-in fade-in-50">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary"/> AI Summary & Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{analysis.summary}</p>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Keyword Cloud</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <WordCloud data={analysis.wordCloud} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Keyword Frequency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <KeywordBarChart data={analysis.barChart} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

function DrawingResults({ submissions, isResponsesOpen, onResponsesToggle }: ResultsProps) {
    const [sliderValue, setSliderValue] = useState(3);
    const gridCols = 6 - sliderValue;

    if (submissions.length === 0) {
        return <div className="text-center text-muted-foreground py-8">Waiting for submissions...</div>;
    }

    return (
        <Collapsible open={isResponsesOpen} onOpenChange={onResponsesToggle}>
            <div className="flex items-center justify-between rounded-md border p-2 mb-2">
                <h3 className="flex items-center text-lg font-semibold">
                    <ImageIcon className="mr-2 h-5 w-5" /> Student Drawings
                </h3>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 w-40">
                        <Label htmlFor="zoom-slider" className="text-sm whitespace-nowrap">Thumbnail Size</Label>
                        <Slider
                            id="zoom-slider"
                            min={1}
                            max={5}
                            step={1}
                            value={[sliderValue]}
                            onValueChange={(value) => setSliderValue(value[0])}
                        />
                    </div>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                            <span className="sr-only">Toggle Responses</span>
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>
            <CollapsibleContent>
                <ScrollArea className="h-[500px] w-full">
                    <div
                        className="grid gap-4 p-1"
                        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                    >
                        {submissions.map((sub, index) => (
                            <Dialog key={index}>
                                <DialogTrigger asChild>
                                    <Card className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                       <div className="aspect-video w-full bg-muted relative">
                                         <Image src={sub.answer as string} alt={`Drawing by ${sub.studentName}`} layout="fill" objectFit="contain" data-ai-hint="student drawing" />
                                       </div>
                                       <CardFooter className="p-2 bg-muted/50 border-t">
                                         <p className="text-sm font-medium truncate">{sub.studentName}</p>
                                       </CardFooter>
                                    </Card>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle>Submission by {sub.studentName}</DialogTitle>
                                    </DialogHeader>
                                    <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
                                        <Image src={sub.answer as string} alt={`Drawing by ${sub.studentName}`} layout="fill" objectFit="contain" />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ))}
                    </div>
                </ScrollArea>
            </CollapsibleContent>
        </Collapsible>
    );
}

function ImageAnnotationResults({ question, submissions, isResponsesOpen, onResponsesToggle }: { question: ImageAnnotationQuestion } & ResultsProps) {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="mb-2 flex items-center text-lg font-semibold">
                    <PencilRuler className="mr-2 h-5 w-5" /> Original Image
                </h3>
                <div className="aspect-video w-full rounded-md border bg-muted relative">
                    <Image src={question.imageUrl} alt="Original image for annotation" layout="fill" objectFit="contain" data-ai-hint="diagram chart" />
                </div>
            </div>
            {submissions.length > 0 && <div className="border-t pt-6" />}
            <DrawingResults submissions={submissions} isResponsesOpen={isResponsesOpen} onResponsesToggle={onResponsesToggle} />
        </div>
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


export function ActiveQuestion({ question, onEndQuestion, students, submissions, onSubmissionsChange, isResponsesOpen, onResponsesToggle }: ActiveQuestionProps) {
    const handleSimulateSubmission = (student: Student) => {
        let mockAnswer: string | string[] = '';
        switch(question.type) {
            case 'multiple-choice':
                if (question.allowMultipleAnswers) {
                    const options = question.options.map((o, i) => (o.value || String.fromCharCode(65 + i)));
                    const numAnswers = Math.floor(Math.random() * options.length) + 1;
                    mockAnswer = [...options].sort(() => 0.5 - Math.random()).slice(0, numAnswers);
                } else {
                    const randomIndex = Math.floor(Math.random() * question.options.length);
                    const randomOption = question.options[randomIndex];
                    mockAnswer = randomOption.value || String.fromCharCode(65 + randomIndex);
                }
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
            case 'image-annotation':
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
        const props = { submissions, isResponsesOpen, onResponsesToggle };
        switch (question.type) {
            case 'multiple-choice':
                return <MultipleChoiceResults question={question} students={students} {...props} />;
            case 'true-false':
                const trueFalseAsMc = { ...question, options: [{ value: "True" }, { value: "False" }] };
                return <MultipleChoiceResults question={trueFalseAsMc} students={students} {...props} />;
            case 'short-answer':
                return <TextResponseResults {...props} />;
            case 'drawing':
                return <DrawingResults {...props} />;
            case 'image-annotation':
                return <ImageAnnotationResults question={question} {...props} />;
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

            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Lesson Status
                  </CardTitle>
                  <Clapperboard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {question ? "Question Active" : "Idle"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {question
                      ? `${submissions.length} / ${students.length} responses`
                      : "Start a question to begin"}
                  </p>
                </CardContent>
              </Card>
        </div>
    );
}

function WordCloud({ data }: { data: { text: string; value: number }[] }) {
    if (!data || data.length === 0) {
        return <div className="text-center text-muted-foreground">No keywords found.</div>;
    }

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const minFontSize = 1; // in rem
    const maxFontSize = 3.5; // in rem

    const getFontSize = (value: number) => {
        if (maxVal === minVal) return (minFontSize + maxFontSize) / 2 + 'rem';
        const size = minFontSize + ((value - minVal) / (maxVal - minVal)) * (maxFontSize - minFontSize);
        return `${size.toFixed(2)}rem`;
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-4 min-h-[250px] rounded-md bg-muted/50">
            {data.map(({ text, value }) => (
                <span 
                    key={text} 
                    style={{ 
                        fontSize: getFontSize(value),
                        fontWeight: Math.round(parseFloat(getFontSize(value))) > 2 ? 600 : 400
                    }}
                    className="leading-tight text-foreground transition-all duration-300"
                >
                    {text}
                </span>
            ))}
        </div>
    );
}

function KeywordBarChart({ data }: { data: { word: string; count: number }[] }) {
    if (!data || data.length === 0) {
        return <div className="text-center text-muted-foreground">No data for chart.</div>;
    }

    return (
      <div className="w-full h-[250px]">
        <ChartContainer config={{}} className="h-full w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="word" type="category" width={80} tickLine={false} axisLine={false} />
                <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent />}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
        </ChartContainer>
      </div>
    );
}
