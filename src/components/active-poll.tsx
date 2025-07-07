
"use client";

import { BarChart as BarChartIcon, Users, FileText, Image as ImageIcon, CheckCircle, PencilRuler, ChevronDown, Wand2, Loader2, BrainCircuit, ArrowDownUp, ArrowDown, ArrowUp, Check, CheckCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QuestionData, MultipleChoiceQuestion, ImageAnnotationQuestion } from "./create-poll-form";
import React, { useMemo, useState, useTransition, useEffect } from "react";
import type { Student, Submission } from "@/contexts/classroom-context";
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
import { Bar, XAxis, YAxis, CartesianGrid, BarChart, Tooltip as ChartTooltip, LabelList } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useUsage } from "@/contexts/usage-context";


interface ActiveQuestionProps {
  question: QuestionData;
  onEndQuestion: () => void;
  onRevealAnswer: () => void;
  students: Student[];
  submissions: Submission[];
}

interface ResultsProps {
    submissions: Submission[];
}

function MultipleChoiceResults({ question, submissions, students }: { question: (MultipleChoiceQuestion | (QuestionData & { type: 'true-false' })) & { options: { value: string }[], allowMultipleAnswers?: boolean, answer: number[] }, submissions: Submission[], students: Student[] }) {
  const { t } = useI18n();
  const [isResponsesOpen, setIsResponsesOpen] = useState(true);
  const isTrueFalse = question.type === 'true-false';
  
  const [sortBy, setSortBy] = useState<'name' | 'time' | 'option'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [optionSortKey, setOptionSortKey] = useState<number | null>(null);
  
  const { voteCounts, studentAnswerMap } = useMemo(() => {
    const counts = new Map<number, number>();
    question.options.forEach((_, index) => counts.set(index, 0));
    const answers = new Map<string, number | number[]>();

    for (const sub of submissions) {
        const rawAnswer = sub.answer;
        let indices: number[] = [];

        if (rawAnswer === null || rawAnswer === undefined) {
            continue; // Skip this submission
        }

        const answerArray = Array.isArray(rawAnswer) ? rawAnswer : [rawAnswer];

        indices = answerArray
            .map(val => {
                if (val === null || val === undefined || String(val).trim() === '') {
                    return NaN;
                }
                return Number(val);
            })
            .filter(n => !isNaN(n));

        if (indices.length > 0) {
            // Populate vote counts for progress bars
            indices.forEach(index => {
                if (counts.has(index)) {
                    counts.set(index, (counts.get(index) || 0) + 1);
                }
            });

            // Populate student answers for the table
            const finalAnswer = question.allowMultipleAnswers ? indices : indices[0];
            answers.set(sub.studentId, finalAnswer);
        }
    }

    return { voteCounts: counts, studentAnswerMap: answers };
  }, [submissions, question.options, question.allowMultipleAnswers]);

  const results = useMemo(() => {
    const totalVotes = Array.from(voteCounts.values()).reduce((acc, count) => acc + count, 0);

    return question.options.map((option, index) => {
      const letter = String.fromCharCode(65 + index);
      const displayValue = isTrueFalse ? (option.value === 'O' ? 'O' : 'X') : (option.value ? `${letter}. ${option.value}` : letter);
      const votes = voteCounts.get(index) || 0;
      const isCorrect = !!(question.showAnswer && Array.isArray(question.answer) && question.answer.includes(index));

      const percentageBase = question.allowMultipleAnswers ? submissions.length : totalVotes;
      const percentage = percentageBase > 0 ? (votes / percentageBase) * 100 : 0;

      return {
        option: displayValue,
        index,
        votes,
        percentage,
        isCorrect,
      };
    });
  }, [voteCounts, submissions.length, question, isTrueFalse]);


  const studentSubmissions = useMemo(() => {
    const submissionMap = new Map<string, Submission>();
    submissions.forEach(sub => submissionMap.set(sub.studentId, sub));
    return submissionMap;
  }, [submissions]);

  const handleOptionSort = (optionIndex: number) => {
    if (sortBy === 'option' && optionSortKey === optionIndex) {
      setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy('option');
      setOptionSortKey(optionIndex);
      setSortOrder('asc');
    }
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let compare = 0;
      switch (sortBy) {
        case 'name':
          compare = a.name.localeCompare(b.name);
          break;
        case 'time':
          const subA = studentSubmissions.get(a.id);
          const subB = studentSubmissions.get(b.id);
          if (subA && subB && subA.timestamp && subB.timestamp) {
            compare = subA.timestamp.toMillis() - subB.timestamp.toMillis();
          } else if (subA) {
            compare = -1;
          } else if (subB) {
            compare = 1;
          }
          break;
        case 'option':
          if (optionSortKey !== null) {
            const aHasAnswer = studentAnswerMap.get(a.id);
            const bHasAnswer = studentAnswerMap.get(b.id);
            const aSelected = aHasAnswer !== undefined && (Array.isArray(aHasAnswer) ? aHasAnswer.includes(optionSortKey) : aHasAnswer === optionSortKey);
            const bSelected = bHasAnswer !== undefined && (Array.isArray(bHasAnswer) ? bHasAnswer.includes(optionSortKey) : bHasAnswer === optionSortKey);
            if (aSelected !== bSelected) {
              compare = aSelected ? -1 : 1;
            } else {
              compare = a.name.localeCompare(b.name);
            }
          }
          break;
      }
      return sortOrder === 'asc' ? compare : -compare;
    });
  }, [students, sortBy, sortOrder, studentSubmissions, studentAnswerMap, optionSortKey]);


  const totalSubmissions = submissions.length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 flex items-center text-lg font-semibold">
          <BarChartIcon className="mr-2 h-5 w-5" /> {t('activePoll.live_results_title')}
        </h3>
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.index}>
              <div className="mb-1 flex items-center justify-between">
                <p className={cn("font-medium flex items-center gap-2", result.isCorrect && "text-green-600")}>
                  {result.isCorrect && <Check className="h-5 w-5" />}
                  {result.option}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('activePoll.votes_count', { count: result.votes })} ({result.percentage.toFixed(0)}%)
                </p>
              </div>
              <Progress value={result.percentage} className={cn("h-3", result.isCorrect && "[&>div]:bg-green-500")} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{t('activePoll.total_respondents', { count: totalSubmissions })}</span></div>
        </div>
      </div>

      {students.length > 0 && (
        <Collapsible open={isResponsesOpen} onOpenChange={setIsResponsesOpen}>
          <div className="flex items-center justify-between rounded-md border p-2">
            <h3 className="flex items-center text-lg font-semibold">
              <Users className="mr-2 h-5 w-5" /> {t('activePoll.student_responses_title')}
            </h3>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowDownUp className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('activePoll.sort_by_label')}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => { if(v === 'name' || v === 'time') setSortBy(v)}}>
                    <DropdownMenuRadioItem value="name">{t('activePoll.sort_by_student_name')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="time">{t('activePoll.sort_by_submission_time')}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                    <DropdownMenuRadioItem value="asc"><ArrowUp className="mr-2 h-3.5 w-3.5" />{t('activePoll.sort_order_asc')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="desc"><ArrowDown className="mr-2 h-3.5 w-3.5" />{t('activePoll.sort_order_desc')}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                      <span className="sr-only">Toggle Responses</span>
                  </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent>
            <div className="mt-2 rounded-md border">
              <ScrollArea className="h-96 w-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="w-[150px]">{t('activePoll.student_table_header')}</TableHead>
                      {results.map((result) => {
                         const headerText = isTrueFalse ? result.option : String.fromCharCode(65 + result.index);
                         const isSortActive = sortBy === 'option' && optionSortKey === result.index;
                         return (
                            <TableHead key={result.index} className="text-center p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOptionSort(result.index)}
                                className={cn("w-full justify-center", result.isCorrect && "font-bold text-green-600")}
                              >
                                {result.isCorrect && <Check className="h-4 w-4 mr-1" />}
                                {headerText}
                                {isSortActive && (
                                  sortOrder === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />
                                )}
                              </Button>
                            </TableHead>
                         )
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudents.map(student => {
                      const answer = studentAnswerMap.get(student.id);
                      return (
                        <TableRow key={student.id} data-answered={answer !== undefined} className="data-[answered=true]:bg-green-500/10">
                          <TableCell className="font-medium">{student.name}</TableCell>
                          {results.map((result) => {
                            return (
                                <TableCell key={result.index} className="text-center">
                                {answer !== undefined && (Array.isArray(answer) ? answer.includes(result.index) : answer === result.index) && (
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

function TextResponseResults({ submissions }: ResultsProps) {
    const { t } = useI18n();
    const { logAiUsage } = useUsage();
    const [isResponsesOpen, setIsResponsesOpen] = useState(true);
    const [isAnalyzing, startTransition] = useTransition();
    const [analysis, setAnalysis] = useState<AnalyzeShortAnswersOutput | null>(null);
    const { toast } = useToast();
    const [sortBy, setSortBy] = useState<'time' | 'name'>('time');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const sortedSubmissions = useMemo(() => {
        return [...submissions].sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'time') {
                if (a.timestamp && b.timestamp) {
                    comparison = a.timestamp.toMillis() - b.timestamp.toMillis();
                }
            } else { // 'name'
                comparison = a.studentName.localeCompare(b.studentName);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [submissions, sortBy, sortOrder]);

    const handleAnalyze = () => {
        const answers = sortedSubmissions.map(sub => sub.answer as string).filter(a => a.trim() !== "");
        if (answers.length < 2) {
             toast({
                variant: "destructive",
                title: t('activePoll.toast_analysis_data_error_title'),
                description: t('activePoll.toast_analysis_data_error_description'),
            });
            return;
        }

        startTransition(async () => {
            setAnalysis(null);
            const result = await analyzeShortAnswersAction({ answers });
            if (result.analysis) {
                setAnalysis(result.analysis);
                logAiUsage('analyzeShortAnswers');
            } else {
                toast({
                    variant: "destructive",
                    title: t('activePoll.toast_analysis_failed_title'),
                    description: result.error,
                });
            }
        });
    };
    
    useEffect(() => {
        // Reset analysis when submissions change
        setAnalysis(null);
    }, [submissions]);

    if (submissions.length === 0) {
        return <div className="text-center text-muted-foreground py-8">{t('activePoll.waiting_for_submissions')}</div>;
    }

    return (
        <div className="space-y-4">
            <Collapsible open={isResponsesOpen} onOpenChange={setIsResponsesOpen}>
                 <div className="flex items-center justify-between rounded-md border p-2 mb-2">
                    <h3 className="flex items-center text-lg font-semibold">
                        <FileText className="mr-2 h-5 w-5" /> {t('activePoll.student_responses_title')}
                    </h3>
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ArrowDownUp className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('activePoll.sort_by_label')}</DropdownMenuLabel>
                                <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                                    <DropdownMenuRadioItem value="name">{t('activePoll.sort_by_student_name')}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="time">{t('activePoll.sort_by_submission_time')}</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuRadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                                    <DropdownMenuRadioItem value="asc"><ArrowUp className="mr-2 h-3.5 w-3.5" />{t('activePoll.sort_order_asc')}</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="desc"><ArrowDown className="mr-2 h-3.5 w-3.5" />{t('activePoll.sort_order_desc')}</DropdownMenuRadioItem>
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                                <span className="sr-only">Toggle Responses</span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>
                <CollapsibleContent>
                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                        <div className="space-y-4">
                            {sortedSubmissions.map((sub) => (
                                <div key={sub.id} className="p-3 bg-muted/50 rounded-md">
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
                    {t('activePoll.analyze_with_ai_button')}
                </Button>
                {submissions.length < 2 && <p className="text-sm text-muted-foreground">{t('activePoll.analyze_with_ai_min_submissions')}</p>}
            </div>

            {isAnalyzing && (
                <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">{t('activePoll.ai_analyzing_message')}</p>
                </div>
            )}
            
            {analysis && (
                <div className="space-y-6 animate-in fade-in-50">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary"/>{t('activePoll.ai_summary_card_title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{analysis.summary}</p>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Card className="cursor-pointer hover:ring-2 hover:ring-primary">
                                    <CardHeader>
                                        <CardTitle>{t('activePoll.keyword_cloud_card_title')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <WordCloud data={analysis.wordCloud} />
                                    </CardContent>
                                </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>{t('activePoll.keyword_cloud_card_title')}</DialogTitle>
                                </DialogHeader>
                                <div className="h-[60vh]">
                                    <WordCloud data={analysis.wordCloud} />
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Card className="cursor-pointer hover:ring-2 hover:ring-primary">
                                    <CardHeader>
                                        <CardTitle>{t('activePoll.keyword_frequency_card_title')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <KeywordBarChart data={analysis.barChart} />
                                    </CardContent>
                                </Card>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>{t('activePoll.keyword_frequency_card_title')}</DialogTitle>
                                </DialogHeader>
                                <div className="h-[60vh] py-8">
                                    <KeywordBarChart data={analysis.barChart} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            )}
        </div>
    );
}

function DrawingResults({ submissions }: ResultsProps) {
    const { t } = useI18n();
    const [isResponsesOpen, setIsResponsesOpen] = useState(true);
    const [sliderValue, setSliderValue] = useState(3);
    const [sortBy, setSortBy] = useState<'time' | 'name'>('time');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const gridCols = 6 - sliderValue;

    const sortedSubmissions = useMemo(() => {
        return [...submissions].sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'time') {
                if (a.timestamp && b.timestamp) {
                    comparison = a.timestamp.toMillis() - b.timestamp.toMillis();
                }
            } else { // 'name'
                comparison = a.studentName.localeCompare(b.studentName);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [submissions, sortBy, sortOrder]);

    if (submissions.length === 0) {
        return <div className="text-center text-muted-foreground py-8">{t('activePoll.waiting_for_submissions')}</div>;
    }

    return (
        <Collapsible open={isResponsesOpen} onOpenChange={setIsResponsesOpen}>
             <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-md border p-2 mb-2">
                <h3 className="flex items-center text-lg font-semibold flex-shrink-0">
                    <ImageIcon className="mr-2 h-5 w-5" /> {t('activePoll.student_drawings_title')}
                </h3>
                <div className="flex items-center gap-4 flex-grow justify-end min-w-[280px]">
                    <Label htmlFor="zoom-slider" className="text-sm whitespace-nowrap">{t('activePoll.thumbnail_size_label')}</Label>
                    <Slider
                        id="zoom-slider"
                        min={1}
                        max={5}
                        step={1}
                        value={[sliderValue]}
                        onValueChange={(value) => setSliderValue(value[0])}
                        className="w-full max-w-[200px]"
                    />
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('activePoll.sort_by_label')}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                                <DropdownMenuRadioItem value="time">{t('activePoll.sort_by_submission_time')}</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="name">{t('activePoll.sort_by_student_name')}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                             <DropdownMenuRadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                                <DropdownMenuRadioItem value="asc">
                                    <ArrowUp className="mr-2 h-3.5 w-3.5" />
                                    {t('activePoll.sort_order_asc')}
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="desc">
                                    <ArrowDown className="mr-2 h-3.5 w-3.5" />
                                    {t('activePoll.sort_order_desc')}
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex-shrink-0">
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
                        {sortedSubmissions.map((sub) => (
                            <Dialog key={sub.id}>
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

function ImageAnnotationResults({ question, submissions }: { question: ImageAnnotationQuestion } & ResultsProps) {
    const { t } = useI18n();
    return (
        <div className="space-y-6">
            <div>
                <h3 className="mb-2 flex items-center text-lg font-semibold">
                    <PencilRuler className="mr-2 h-5 w-5" /> {t('activePoll.original_image_title')}
                </h3>
                <div className="aspect-video w-full rounded-md border bg-muted relative">
                    <Image src={question.imageUrl} alt="Original image for annotation" layout="fill" objectFit="contain" data-ai-hint="diagram chart" />
                </div>
            </div>
            {submissions.length > 0 && <div className="border-t pt-6" />}
            <DrawingResults submissions={submissions} />
        </div>
    );
}

export function ActiveQuestion({ question, onEndQuestion, onRevealAnswer, students, submissions }: ActiveQuestionProps) {
    const { t } = useI18n();

    const renderResults = () => {
        const props = { submissions };
        switch (question.type) {
            case 'multiple-choice':
                return <MultipleChoiceResults question={question} students={students} {...props} />;
            case 'true-false':
                const trueFalseAsMc: MultipleChoiceQuestion & { answer: number[] } = {
                  ...question,
                  type: 'multiple-choice',
                  options: [{ value: "O" }, { value: "X" }],
                  allowMultipleAnswers: false,
                  answer: 'answer' in question && question.answer === 'O' ? [0] : (question.answer === 'X' ? [1] : []),
                };
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
    
    const hasAnswer = 'answer' in question && 
      question.answer && 
      (Array.isArray(question.answer) ? question.answer.length > 0 : (typeof question.answer === 'string' && !!question.answer));

    const isAnswerRevealed = question.showAnswer;

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle className="text-2xl">{question.question}</CardTitle>
                        <CardDescription>
                            {t('teacherDashboard.live_poll_description')}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasAnswer && !isAnswerRevealed && (
                           <Button variant="secondary" onClick={onRevealAnswer}>
                                <CheckCheck className="mr-2 h-4 w-4" />
                                {t('teacherDashboard.reveal_answer_button')}
                            </Button>
                        )}
                        <Button variant="destructive" onClick={onEndQuestion}>
                            {t('teacherDashboard.end_question_button')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {renderResults()}
            </CardContent>
        </Card>
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
    const maxFontSize = 4.5; // in rem

    const getFontSize = (value: number) => {
        if (maxVal === minVal) return (minFontSize + maxFontSize) / 2 + 'rem';
        const size = minFontSize + ((value - minVal) / (maxVal - minVal)) * (maxFontSize - minFontSize);
        return `${size.toFixed(2)}rem`;
    };

    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const largestItem = sortedData.shift();
    const otherItems = sortedData.sort(() => Math.random() - 0.5);
    
    const middleIndex = Math.floor(otherItems.length / 2);
    if (largestItem) {
        otherItems.splice(middleIndex, 0, largestItem);
    }
    
    const allItems = largestItem ? otherItems : sortedData;

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-4 min-h-[250px] rounded-md bg-muted/50 h-full">
            {allItems.map((item) => (
                <span
                    key={item.text}
                    style={{
                        fontSize: getFontSize(item.value),
                        fontWeight: item === largestItem ? 700 : (Math.round(parseFloat(getFontSize(item.value))) > 2 ? 600 : 400),
                    }}
                    className={cn(
                        "p-1 leading-tight transition-all duration-300",
                        item === largestItem ? "text-primary" : "text-foreground"
                    )}
                >
                    {item.text}
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
      <div className="w-full h-auto min-h-[250px] h-full">
        <ChartContainer config={{}} className="h-full w-full">
            <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 10, right: 40 }}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="word" type="category" width={80} tickLine={false} axisLine={false} />
                <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent />}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={4}>
                    <LabelList dataKey="count" position="right" offset={8} className="fill-foreground" fontSize={12} />
                </Bar>
            </BarChart>
        </ChartContainer>
      </div>
    );
}
