
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
import type { QuestionData, MultipleChoiceQuestion, DrawingQuestion, ImageAnnotationQuestion } from "./create-poll-form";
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
  onVoteSubmit: (answer: string | string[] | number | number[]) => void;
}

const shortAnswerSchema = z.object({ answer: z.string().min(1, { message: "Your answer cannot be empty." }) });

function MultipleChoiceForm({ question, onSubmit }: { question: MultipleChoiceQuestion, onSubmit: (answer: number | number[]) => void }) {
    const { t } = useI18n();
    const formSchema = z.object({
        answers: question.allowMultipleAnswers
            ? z.array(z.number()).nonempty("Please select at least one option.")
            : z.number({ required_error: "Please select an answer." }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { answers: question.allowMultipleAnswers ? [] : undefined },
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
                                            return (
                                                <Label key={index} className="flex cursor-pointer items-center space-x-3 space-y-0 rounded-md border p-4 font-normal hover:bg-muted/50 has-[button[data-state=checked]]:bg-primary/10 has-[button[data-state=checked]]:border-primary">
                                                    <Checkbox
                                                        checked={(field.value as number[]).includes(index)}
                                                        onCheckedChange={(checked) => {
                                                            const currentAnswers = (field.value as number[]) || [];
                                                            if (checked) {
                                                                field.onChange([...currentAnswers, index]);
                                                            } else {
                                                                field.onChange(
                                                                    currentAnswers.filter((value) => value !== index)
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
                                        onValueChange={(val) => field.onChange(parseInt(val))}
                                        defaultValue={field.value?.toString()}
                                        className="w-full space-y-2"
                                    >
                                        {question.options.map((option, index) => {
                                            const letter = String.fromCharCode(65 + index);
                                            const displayValue = option.value ? `${letter}. ${option.value}` : letter;
                                            return (
                                                <Label key={index} className="flex cursor-pointer items-center space-x-3 space-y-0 rounded-md border p-4 font-normal hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary">
                                                    <RadioGroupItem value={index.toString()} />
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

function TrueFalseForm({ onSubmit }: { onSubmit: (answer: number) => void }) {
    return (
        <div className="flex justify-around gap-4 pt-4">
            <Button onClick={() => onSubmit(0)} className="w-1/2 h-24 text-6xl font-bold" variant="outline">
                O
            </Button>
            <Button onClick={() => onSubmit(1)} className="w-1/2 h-24 text-6xl font-bold" variant="destructive">
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

function FullScreenDrawingForm({
  question,
  onSubmit,
}: {
  question: DrawingQuestion | ImageAnnotationQuestion;
  onSubmit: (dataUrl: string) => void;
}) {
  const { t } = useI18n();
  const editorRef = useRef<DrawingEditorRef>(null);

  const handleSubmitClick = () => {
    const dataUrl = editorRef.current?.getCanvasDataUrl();
    if (dataUrl) {
      onSubmit(dataUrl);
    }
  };

  const backgroundImageUrl =
    question.type === 'image-annotation' ? question.imageUrl : undefined;

  return (
    <div className="fixed inset-0 z-40 flex h-full w-full flex-col bg-background p-4 sm:p-6">
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b pb-4 mb-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{question.question}</h1>
          <p className="text-sm text-muted-foreground">{t('studentPoll.drawing_description')}</p>
        </div>
        <Button onClick={handleSubmitClick} size="lg">
          <CheckCircle className="mr-2 h-5 w-5" />
          {t('common.submit')}
        </Button>
      </header>
      <div className="flex-1 relative min-h-0">
        <DrawingEditor ref={editorRef} backgroundImageUrl={backgroundImageUrl} />
      </div>
    </div>
  );
}


// --- Main Component ---
export function StudentQuestionForm({ question, onVoteSubmit }: StudentQuestionFormProps) {
  const { t } = useI18n();

  const handleSubmit = (answer: string | string[] | number | number[]) => {
    onVoteSubmit(answer);
  };
  
  if (question.type === 'drawing' || question.type === 'image-annotation') {
      return <FullScreenDrawingForm question={question} onSubmit={handleSubmit} />;
  }

  const getTranslatedQuestionType = (type: QuestionData['type']) => {
    switch (type) {
      case 'true-false': return t('createQuestionForm.tab_true_false');
      case 'multiple-choice': return t('createQuestionForm.tab_multiple_choice');
      case 'short-answer': return t('createQuestionForm.tab_short_answer');
      case 'drawing': return t('createQuestionForm.tab_drawing');
      case 'image-annotation': return t('createQuestionForm.tab_annotation');
      default: return null;
    }
  };
  const translatedQuestionType = getTranslatedQuestionType(question.type);

  const renderForm = () => {
      switch(question.type) {
          case 'multiple-choice': return <MultipleChoiceForm question={question} onSubmit={handleSubmit} />;
          case 'true-false': return <TrueFalseForm onSubmit={(answer) => handleSubmit(answer)} />;
          case 'short-answer': return <ShortAnswerForm onSubmit={(answer) => handleSubmit(answer)} />;
          default: return <p>{t('studentPoll.unknown_question_type')}</p>;
      }
  }

  return (
    <Card className="w-full max-w-2xl animate-in fade-in shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{question.question}</CardTitle>
        {translatedQuestionType && (
            <CardDescription className="font-semibold text-primary">{translatedQuestionType}</CardDescription>
        )}
      </CardHeader>
      <CardContent>{renderForm()}</CardContent>
    </Card>
  );
}
