
"use client";

import React, { useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import dynamic from 'next/dynamic';
import {
  CheckCircle,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { QuestionData, MultipleChoiceQuestion } from "./create-poll-form";
import { Textarea } from "./ui/textarea";
import { Label } from '@/components/ui/label';
import { Checkbox } from './ui/checkbox';
import type { DrawingEditorRef } from './drawing-editor';
import { useI18n } from '@/lib/i18n/provider';

const DrawingEditor = dynamic(
  () => import('./drawing-editor').then((mod) => mod.DrawingEditor),
  {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center w-full border rounded-md aspect-video bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="sr-only">Loading drawing editor...</p>
        </div>
    )
  }
);


// --- Question Answering Forms ---
interface StudentQuestionFormProps {
  question: QuestionData;
  onVoteSubmit: (answer: string | string[]) => void;
}

const shortAnswerSchema = z.object({ answer: z.string().min(1, { message: "Your answer cannot be empty." }) });

function MultipleChoiceForm({ question, onSubmit }: { question: MultipleChoiceQuestion, onSubmit: (answer: string | string[]) => void }) {
    const { t } = useI18n();
    const formSchema = z.object({
        answers: question.allowMultipleAnswers
            ? z.array(z.string()).nonempty("Please select at least one option.")
            : z.string().min(1, "Please select an answer."),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { answers: question.allowMultipleAnswers ? [] : "" },
    });

    const handleSubmit = (data: z.infer<typeof formSchema>) => {
        onSubmit(data.answers);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="answers"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>{question.allowMultipleAnswers ? t('studentPoll.choose_your_answers') : t('studentPoll.choose_your_answer')}</FormLabel>
                            <FormControl>
                                {question.allowMultipleAnswers ? (
                                    <div className="flex flex-col space-y-2">
                                        {question.options.map((option, index) => {
                                            const letter = String.fromCharCode(65 + index);
                                            const displayValue = option.value ? `${letter}. ${option.value}` : letter;
                                            const submittedValue = option.value || letter;
                                            return (
                                                <Label key={`${submittedValue}-${index}`} className="flex cursor-pointer items-center space-x-3 space-y-0 rounded-md border p-4 font-normal hover:bg-muted/50 has-[button[data-state=checked]]:bg-primary/10 has-[button[data-state=checked]]:border-primary">
                                                    <Checkbox
                                                        checked={(field.value as string[]).includes(submittedValue)}
                                                        onCheckedChange={(checked) => {
                                                            const currentAnswers = (field.value as string[]) || [];
                                                            if (checked) {
                                                                field.onChange([...currentAnswers, submittedValue]);
                                                            } else {
                                                                field.onChange(
                                                                    currentAnswers.filter((value) => value !== submittedValue)
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <span>{displayValue}</span>
                                                </Label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value as string}
                                        className="w-full space-y-2"
                                    >
                                        {question.options.map((option, index) => {
                                            const letter = String.fromCharCode(65 + index);
                                            const displayValue = option.value ? `${letter}. ${option.value}` : letter;
                                            const submittedValue = option.value || letter;
                                            return (
                                                <Label key={`${submittedValue}-${index}`} className="flex cursor-pointer items-center space-x-3 space-y-0 rounded-md border p-4 font-normal hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary">
                                                    <RadioGroupItem value={submittedValue} />
                                                    <span>{displayValue}</span>
                                                </Label>
                                            );
                                        })}
                                    </RadioGroup>
                                )}
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t('studentPoll.submit_vote_button')}
                </Button>
            </form>
        </Form>
    );
}

function TrueFalseForm({ onSubmit }: { onSubmit: (answer: string) => void }) {
    return (
        <div className="flex justify-around gap-4 pt-4">
            <Button onClick={() => onSubmit("O")} className="w-1/2 h-24 text-6xl font-bold" variant="outline">
                O
            </Button>
            <Button onClick={() => onSubmit("X")} className="w-1/2 h-24 text-6xl font-bold" variant="destructive">
                X
            </Button>
        </div>
    );
}

function ShortAnswerForm({ onSubmit }: { onSubmit: (answer: string) => void }) {
    const { t } = useI18n();
    const form = useForm<z.infer<typeof shortAnswerSchema>>({ resolver: zodResolver(shortAnswerSchema), defaultValues: { answer: "" } });
    const handleSubmit = (data: z.infer<typeof shortAnswerSchema>) => {
        onSubmit(data.answer);
    };
    return (<Form {...form}><form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6"><FormField control={form.control} name="answer" render={({ field }) => (<FormItem><FormLabel>{t('studentPoll.your_answer_label')}</FormLabel><FormControl><Textarea placeholder={t('studentPoll.your_answer_placeholder')} {...field} rows={4} /></FormControl><FormMessage /></FormItem>)} /><Button type="submit" className="w-full">{t('studentPoll.submit_answer_button')}</Button></form></Form>);
}

function CanvasSubmissionForm({
  onSubmit,
  backgroundImageUrl,
}: {
  onSubmit: (dataUrl: string) => void;
  backgroundImageUrl?: string;
}) {
  const { t } = useI18n();
  const editorRef = useRef<DrawingEditorRef>(null);

  const handleSubmitClick = () => {
    const dataUrl = editorRef.current?.getCanvasDataUrl();
    if (dataUrl) {
      onSubmit(dataUrl);
    }
  };

  return (
    <div className="space-y-4">
      <DrawingEditor ref={editorRef} backgroundImageUrl={backgroundImageUrl} />
      <div className="flex justify-end">
        <Button onClick={handleSubmitClick}>{t('common.submit')}</Button>
      </div>
    </div>
  );
}


// --- Main Component ---
export function StudentQuestionForm({ question, onVoteSubmit }: StudentQuestionFormProps) {
  const { toast } = useToast();
  const { t } = useI18n();

  function handleSubmit(answer: string | string[]) {
    onVoteSubmit(answer);
    toast({ title: t('studentPoll.toast_submitted_title'), description: t('studentPoll.toast_submitted_description') });
  }

  const renderForm = () => {
      switch(question.type) {
          case 'multiple-choice': return <MultipleChoiceForm question={question} onSubmit={handleSubmit} />;
          case 'true-false': return <TrueFalseForm onSubmit={(answer) => handleSubmit(answer)} />;
          case 'short-answer': return <ShortAnswerForm onSubmit={(answer) => handleSubmit(answer)} />;
          case 'drawing': return <CanvasSubmissionForm onSubmit={handleSubmit} />;
          case 'image-annotation': return <CanvasSubmissionForm onSubmit={handleSubmit} backgroundImageUrl={question.imageUrl} />;
          default: return <p>{t('studentPoll.unknown_question_type')}</p>;
      }
  }

  return (
    <Card className="w-full max-w-2xl animate-in fade-in shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{question.question}</CardTitle>
        {(question.type === 'drawing' || question.type === 'image-annotation') && <CardDescription>Use the editor below to create your response.</CardDescription>}
      </CardHeader>
      <CardContent>{renderForm()}</CardContent>
    </Card>
  );
}
