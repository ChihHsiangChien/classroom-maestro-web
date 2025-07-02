
"use client";

import React, { useRef } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import dynamic from 'next/dynamic';
import {
  CheckCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { QuestionData, MultipleChoiceQuestion, ImageAnnotationQuestion } from "./create-poll-form";
import { Textarea } from "./ui/textarea";
import { Label } from '@/components/ui/label';
import { Checkbox } from './ui/checkbox';
import type { DrawingEditorRef } from './drawing-editor';

const DrawingEditor = dynamic(
  () => import('./drawing-editor').then((mod) => mod.DrawingEditor),
  {
    ssr: false,
    loading: () => <p>Loading drawing editor...</p>,
  }
);


// --- Question Answering Forms ---
interface StudentQuestionFormProps {
  question: QuestionData;
  onVoteSubmit: () => void;
}

const shortAnswerSchema = z.object({ answer: z.string().min(1, { message: "Your answer cannot be empty." }) });

function MultipleChoiceForm({ question, onSubmit }: { question: MultipleChoiceQuestion, onSubmit: () => void }) {
    const formSchema = z.object({
        answers: question.allowMultipleAnswers
            ? z.array(z.string()).nonempty("Please select at least one option.")
            : z.array(z.string()).length(1, "Please select an answer."),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { answers: [] },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="answers"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Choose your answer{question.allowMultipleAnswers ? 's' : ''}:</FormLabel>
                            <FormControl>
                                <div className="flex flex-col space-y-2">
                                    {question.allowMultipleAnswers ? (
                                        question.options.map((option, index) => {
                                            const letter = String.fromCharCode(65 + index);
                                            const displayValue = option.value ? `${letter}. ${option.value}` : letter;
                                            const submittedValue = option.value || letter;
                                            return (
                                                <Label key={`${submittedValue}-${index}`} className="flex cursor-pointer items-center space-x-3 space-y-0 rounded-md border p-4 font-normal hover:bg-muted/50 has-[button[data-state=checked]]:bg-primary/10 has-[button[data-state=checked]]:border-primary">
                                                    <Checkbox
                                                        checked={field.value?.includes(submittedValue)}
                                                        onCheckedChange={(checked) => {
                                                            const newAnswers = field.value || [];
                                                            if (checked) {
                                                                field.onChange([...newAnswers, submittedValue]);
                                                            } else {
                                                                field.onChange(
                                                                    newAnswers.filter((value) => value !== submittedValue)
                                                                );
                                                            }
                                                        }}
                                                    />
                                                    <span>{displayValue}</span>
                                                </Label>
                                            );
                                        })
                                    ) : (
                                        <RadioGroup
                                            onValueChange={(value) => field.onChange([value])}
                                            defaultValue={field.value?.[0]}
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
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit Vote
                </Button>
            </form>
        </Form>
    );
}

function TrueFalseForm({ onSubmit }: { onSubmit: () => void }) {
    return (
        <div className="flex justify-around gap-4 pt-4">
            <Button onClick={onSubmit} className="w-1/2 h-24 text-6xl font-bold" variant="outline">
                O
            </Button>
            <Button onClick={onSubmit} className="w-1/2 h-24 text-6xl font-bold" variant="destructive">
                X
            </Button>
        </div>
    );
}

function ShortAnswerForm({ onSubmit }: { onSubmit: () => void }) {
    const form = useForm<z.infer<typeof shortAnswerSchema>>({ resolver: zodResolver(shortAnswerSchema), defaultValues: { answer: "" } });
    return (<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6"><FormField control={form.control} name="answer" render={({ field }) => (<FormItem><FormLabel>Your Answer</FormLabel><FormControl><Textarea placeholder="Type your answer here..." {...field} rows={4} /></FormControl><FormMessage /></FormItem>)} /><Button type="submit" className="w-full">Submit Answer</Button></form></Form>);
}

function CanvasSubmissionForm({
  onSubmit,
  backgroundImageUrl,
}: {
  onSubmit: (dataUrl: string) => void;
  backgroundImageUrl?: string;
}) {
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
        <Button onClick={handleSubmitClick}>Submit</Button>
      </div>
    </div>
  );
}


// --- Main Component ---
export function StudentQuestionForm({ question, onVoteSubmit }: StudentQuestionFormProps) {
  const { toast } = useToast();

  function handleSubmit() {
    onVoteSubmit();
    toast({ title: "Response Submitted!", description: "Thank you for participating." });
  }

  function handleDrawingSubmit(dataUrl: string) {
    // In a real app, you would upload the dataUrl to a server
    console.log("Drawing/Annotation submitted:", dataUrl.substring(0, 50) + "...");
    handleSubmit();
  }

  const renderForm = () => {
      switch(question.type) {
          case 'multiple-choice': return <MultipleChoiceForm question={question} onSubmit={handleSubmit} />;
          case 'true-false': return <TrueFalseForm onSubmit={handleSubmit} />;
          case 'short-answer': return <ShortAnswerForm onSubmit={handleSubmit} />;
          case 'drawing': return <CanvasSubmissionForm onSubmit={handleDrawingSubmit} />;
          case 'image-annotation': return <CanvasSubmissionForm onSubmit={handleDrawingSubmit} backgroundImageUrl={question.imageUrl} />;
          default: return <p>Unknown question type.</p>;
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
