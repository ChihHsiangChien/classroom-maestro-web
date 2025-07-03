
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
import { Bar, XAxis, YAxis, CartesianGrid, BarChart, Tooltip as ChartTooltip, LabelList } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

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
  const { t } = useI18n();
  const isTrueFalse = question.type === 'true-false';
  
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
      const displayValue = isTrueFalse ? option.value : (option.value ? `${letter}. ${option.value}` : letter);

      return {
        option: displayValue,
        votes,
        percentage: totalVotes > 0 ? (votes / (question.allowMultipleAnswers ? submissions.length : totalVotes)) * 100 : 0
      };
    });
  }, [submissions, question.options, question.allowMultipleAnswers, isTrueFalse]);

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
          <BarChartIcon className="mr-2 h-5 w-5" /> {t('activePoll.live_results_title')}
        </h3>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={`${result.option}-${index}`}>
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium">{result.option}</p>
                <p className="text-sm text-muted-foreground">
                  {t('activePoll.votes_count', { count: result.votes })} ({result.percentage.toFixed(0)}%)
                </p>
              </div>
              <Progress value={result.percentage} className="h-3" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><Users className="h-4 w-4" /><span>{t('activePoll.total_respondents', { count: totalSubmissions })}</span></div>
        </div>
      </div>

      {/* Individual Student Responses Table */}
      {students.length > 0 && (
        <Collapsible open={isResponsesOpen} onOpenChange={onResponsesToggle}>
          <div className="flex items-center justify-between rounded-md border p-2">
            <h3 className="flex items-center text-lg font-semibold">
              <Users className="mr-2 h-5 w-5" /> {t('activePoll.student_responses_title')}
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
                      <TableHead className="w-[150px]">{t('activePoll.student_table_header')}</TableHead>
                      {question.options.map((option, index) => {
                         const letter = String.fromCharCode(65 + index);
                         const headerText = isTrueFalse ? option.value : letter;
                         return (
                            <TableHead key={`${letter}-${index}`} className="text-center">{headerText}</TableHead>
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
    const { t } = useI18n();
    const [isAnalyzing, startTransition] = useTransition();
    const [analysis, setAnalysis] = useState<AnalyzeShortAnswersOutput | null>(null);
    const { toast } = useToast();

    const handleAnalyze = () => {
        const answers = submissions.map(sub => sub.answer as string).filter(a => a.trim() !== "");
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
            } else {
                toast({
                    variant: "destructive",
                    title: t('activePoll.toast_analysis_failed_title'),
                    description: result.error,
                });
            }
        });
    };

    if (submissions.length === 0) {
        return <div className="text-center text-muted-foreground py-8">{t('activePoll.waiting_for_submissions')}</div>;
    }

    return (
        <div className="space-y-4">
            <Collapsible open={isResponsesOpen} onOpenChange={onResponsesToggle}>
                 <div className="flex items-center justify-between rounded-md border p-2 mb-2">
                    <h3 className="flex items-center text-lg font-semibold">
                        <FileText className="mr-2 h-5 w-5" /> {t('activePoll.student_responses_title')}
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

function DrawingResults({ submissions, isResponsesOpen, onResponsesToggle }: ResultsProps) {
    const { t } = useI18n();
    const [sliderValue, setSliderValue] = useState(3);
    const gridCols = 6 - sliderValue;

    if (submissions.length === 0) {
        return <div className="text-center text-muted-foreground py-8">{t('activePoll.waiting_for_submissions')}</div>;
    }

    return (
        <Collapsible open={isResponsesOpen} onOpenChange={onResponsesToggle}>
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
                        dir="rtl"
                    />
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
            <DrawingResults submissions={submissions} isResponsesOpen={isResponsesOpen} onResponsesToggle={onResponsesToggle} />
        </div>
    );
}

export function ActiveQuestion({ question, onEndQuestion, students, submissions, onSubmissionsChange, isResponsesOpen, onResponsesToggle }: ActiveQuestionProps) {
    const { t } = useI18n();

    const renderResults = () => {
        const props = { submissions, isResponsesOpen, onResponsesToggle };
        switch (question.type) {
            case 'multiple-choice':
                return <MultipleChoiceResults question={question} students={students} {...props} />;
            case 'true-false':
                const trueFalseAsMc = { ...question, options: [{ value: "O" }, { value: "X" }] };
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
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl">{question.question}</CardTitle>
                        <CardDescription>
                            {t('teacherDashboard.live_poll_description')}
                        </CardDescription>
                    </div>
                    <Button variant="destructive" onClick={onEndQuestion}>
                        {t('teacherDashboard.end_question_button')}
                    </Button>
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

    // Create a copy to sort and manipulate
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const largestItem = sortedData.shift(); // Takes the largest item out
    
    // For a more natural cloud, we can shuffle the rest
    const otherItems = sortedData.sort(() => Math.random() - 0.5);
    
    // Insert the largest item into the middle of the other items
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
