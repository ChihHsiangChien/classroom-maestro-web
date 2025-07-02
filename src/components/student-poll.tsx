"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import dynamic from 'next/dynamic';
import {
  CheckCircle, ThumbsDown, ThumbsUp
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { QuestionData, MultipleChoiceQuestion } from "./create-poll-form";
import { Textarea } from "./ui/textarea";
import { Label } from '@/components/ui/label';

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

const multipleChoiceSchema = z.object({ option: z.string({ required_error: "You need to select an option." }) });
const shortAnswerSchema = z.object({ answer: z.string().min(1, { message: "Your answer cannot be empty." }) });

function MultipleChoiceForm({ question, onSubmit }: { question: MultipleChoiceQuestion, onSubmit: () => void }) {
    const form = useForm<z.infer<typeof multipleChoiceSchema>>({ resolver: zodResolver(multipleChoiceSchema) });
    return (<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6"><FormField control={form.control} name="option" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Choose your answer:</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">{question.options.map((option, index) => {
        const displayValue = option.value || String.fromCharCode(65 + index);
        return (
            <Label key={index} className="flex cursor-pointer items-center space-x-3 space-y-0 rounded-md border p-4 font-normal hover:bg-muted/50 has-[input:checked]:bg-primary/10 has-[input:checked]:border-primary">
                <RadioGroupItem value={displayValue} />
                <span>{displayValue}</span>
            </Label>
        )
    })}</RadioGroup></FormControl><FormMessage /></FormItem>)} /><Button type="submit" className="w-full"><CheckCircle className="mr-2 h-4 w-4" />Submit Vote</Button></form></Form>);
}

function TrueFalseForm({ onSubmit }: { onSubmit: () => void }) {
    return (<div className="flex justify-around gap-4 pt-4"><Button onClick={onSubmit} className="w-1/2 h-24 text-2xl" variant="outline" ><ThumbsUp className="h-8 w-8 mr-4 text-green-500" /> True</Button><Button onClick={onSubmit} className="w-1/2 h-24 text-2xl" variant="outline" ><ThumbsDown className="h-8 w-8 mr-4 text-red-500" /> False</Button></div>);
}

function ShortAnswerForm({ onSubmit }: { onSubmit: () => void }) {
    const form = useForm<z.infer<typeof shortAnswerSchema>>({ resolver: zodResolver(shortAnswerSchema), defaultValues: { answer: "" } });
    return (<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6"><FormField control={form.control} name="answer" render={({ field }) => (<FormItem><FormLabel>Your Answer</FormLabel><FormControl><Textarea placeholder="Type your answer here..." {...field} rows={4} /></FormControl><FormMessage /></FormItem>)} /><Button type="submit" className="w-full">Submit Answer</Button></form></Form>);
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
    console.log("Drawing submitted:", dataUrl.substring(0, 50) + "...");
    handleSubmit();
  }

  const renderForm = () => {
      switch(question.type) {
          case 'multiple-choice': return <MultipleChoiceForm question={question} onSubmit={handleSubmit} />;
          case 'true-false': return <TrueFalseForm onSubmit={handleSubmit} />;
          case 'short-answer': return <ShortAnswerForm onSubmit={handleSubmit} />;
          case 'drawing': return <DrawingEditor onSubmit={handleDrawingSubmit} />;
          default: return <p>Unknown question type.</p>;
      }
  }

  return (
    <Card className="w-full max-w-2xl animate-in fade-in shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{question.question}</CardTitle>
        {question.type === 'drawing' && <CardDescription>Use the editor below to create your response.</CardDescription>}
      </CardHeader>
      <CardContent>{renderForm()}</CardContent>
    </Card>
  );
}
