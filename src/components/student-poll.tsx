"use client";

import React, { useRef, useEffect, useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle, ThumbsDown, ThumbsUp, Trash2, Undo } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { QuestionData, MultipleChoiceQuestion } from "./create-poll-form";
import { Textarea } from "./ui/textarea";

// --- Drawing Canvas Component (inlined) ---
interface DrawingCanvasProps {
  onSubmit: (dataUrl: string) => void;
}

const DrawingCanvas = ({ onSubmit }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
        if(canvasRef.current) {
            canvasRef.current.width = canvasRef.current.offsetWidth;
            canvasRef.current.height = canvasRef.current.offsetHeight;
            const context = canvasRef.current.getContext('2d');
            if (!context) return;
            context.lineCap = 'round';
            context.strokeStyle = 'black';
            context.lineWidth = 3;
            contextRef.current = context;
            if(history.length > 0) {
              context.putImageData(history[history.length - 1], 0, 0);
            } else {
              saveState();
            }
        }
    }

    // Use a timeout to ensure layout is stable
    const timeoutId = setTimeout(resizeCanvas, 50);
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', resizeCanvas);
    };

  }, [history]);

  const saveState = () => {
    if (canvasRef.current && contextRef.current) {
      const imageData = contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHistory(prev => [...prev, imageData]);
    }
  };

  const undo = () => {
    if (history.length > 1) {
      setHistory(prev => {
        const newHistory = prev.slice(0, -1);
        if (canvasRef.current && contextRef.current) {
          contextRef.current.putImageData(newHistory[newHistory.length - 1], 0, 0);
        }
        return newHistory;
      });
    }
  };
  
  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return {offsetX: 0, offsetY: 0};
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e.nativeEvent) {
      return {offsetX: e.nativeEvent.touches[0].clientX - rect.left, offsetY: e.nativeEvent.touches[0].clientY - rect.top};
    }
    return {offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY};
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); const { offsetX, offsetY } = getCoords(e); contextRef.current?.beginPath(); contextRef.current?.moveTo(offsetX, offsetY); setIsDrawing(true); };
  const finishDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); if (!isDrawing) return; contextRef.current?.closePath(); setIsDrawing(false); saveState(); };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => { e.preventDefault(); if (!isDrawing) return; const { offsetX, offsetY } = getCoords(e); contextRef.current?.lineTo(offsetX, offsetY); contextRef.current?.stroke(); };
  const clearCanvas = () => { if(canvasRef.current && contextRef.current) { contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setHistory([]); saveState(); } };
  const handleSubmit = () => { if(canvasRef.current) { const dataUrl = canvasRef.current.toDataURL('image/png'); onSubmit(dataUrl); } };

  return (<div className="flex flex-col gap-4"><div className="relative w-full aspect-video border rounded-md bg-white touch-none"><canvas ref={canvasRef} onMouseDown={startDrawing} onMouseUp={finishDrawing} onMouseMove={draw} onMouseLeave={finishDrawing} onTouchStart={startDrawing} onTouchEnd={finishDrawing} onTouchMove={draw} className="w-full h-full" /></div><div className="flex justify-between items-center gap-2"><div className="flex gap-2"><Button variant="outline" size="icon" onClick={undo} disabled={history.length <= 1}><Undo className="h-4 w-4"/><span className="sr-only">Undo</span></Button><Button variant="outline" size="icon" onClick={clearCanvas}><Trash2 className="h-4 w-4"/><span className="sr-only">Clear</span></Button></div><Button onClick={handleSubmit}>Submit Drawing</Button></div></div>);
};

// --- Question Answering Forms ---
interface StudentQuestionFormProps {
  question: QuestionData;
  onVoteSubmit: () => void;
}

const multipleChoiceSchema = z.object({ option: z.string({ required_error: "You need to select an option." }) });
const shortAnswerSchema = z.object({ answer: z.string().min(1, { message: "Your answer cannot be empty." }) });

function MultipleChoiceForm({ question, onSubmit }: { question: MultipleChoiceQuestion, onSubmit: () => void }) {
    const form = useForm<z.infer<typeof multipleChoiceSchema>>({ resolver: zodResolver(multipleChoiceSchema) });
    return (<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6"><FormField control={form.control} name="option" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Choose your answer:</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">{question.options.map((option, index) => (<FormItem key={index} className="flex items-center space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50"><FormControl><RadioGroupItem value={option.value} /></FormControl><FormLabel className="font-normal">{option.value}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>)} /><Button type="submit" className="w-full"><CheckCircle className="mr-2 h-4 w-4" />Submit Vote</Button></form></Form>);
}

function TrueFalseForm({ onSubmit }: { onSubmit: () => void }) {
    return (<div className="flex justify-around gap-4 pt-4"><Button onClick={onSubmit} className="w-1/2 h-24 text-2xl" variant="outline" ><ThumbsUp className="h-8 w-8 mr-4 text-green-500" /> True (O)</Button><Button onClick={onSubmit} className="w-1/2 h-24 text-2xl" variant="outline" ><ThumbsDown className="h-8 w-8 mr-4 text-red-500" /> False (X)</Button></div>);
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

  const renderForm = () => {
      switch(question.type) {
          case 'multiple-choice': return <MultipleChoiceForm question={question} onSubmit={handleSubmit} />;
          case 'true-false': return <TrueFalseForm onSubmit={handleSubmit} />;
          case 'short-answer': return <ShortAnswerForm onSubmit={handleSubmit} />;
          case 'drawing': return <DrawingCanvas onSubmit={handleSubmit} />;
          default: return <p>Unknown question type.</p>;
      }
  }

  return (
    <Card className="w-full max-w-2xl animate-in fade-in shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">{question.question}</CardTitle>
        {question.type === 'drawing' && <CardDescription>Use the canvas below to draw your answer.</CardDescription>}
      </CardHeader>
      <CardContent>{renderForm()}</CardContent>
    </Card>
  );
}
