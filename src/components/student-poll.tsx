"use client";

import React, { useRef, useEffect, useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { fabric } from 'fabric';
import {
  CheckCircle, ThumbsDown, ThumbsUp, Trash2,
  Image as ImageIcon, Camera, Type, PenLine, Eraser, MousePointer
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { QuestionData, MultipleChoiceQuestion } from "./create-poll-form";
import { Textarea } from "./ui/textarea";
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Slider } from './ui/slider';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from './ui/dialog';

// --- Drawing Editor Component ---
interface DrawingEditorProps {
  onSubmit: (dataUrl: string) => void;
}

type EditorTool = 'pen' | 'eraser' | 'select';

const DrawingEditor = ({ onSubmit }: DrawingEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tool state
  const [tool, setTool] = useState<EditorTool>('pen');
  const [brushWidth, setBrushWidth] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: 'white',
      isDrawingMode: true,
    });
    fabricCanvasRef.current = canvas;

    const resizeCanvas = () => {
      if (canvasRef.current?.parentElement) {
        const parent = canvasRef.current.parentElement;
        canvas.setWidth(parent.offsetWidth);
        canvas.setHeight(parent.offsetHeight);
        canvas.renderAll();
      }
    };
    
    const timeoutId = setTimeout(resizeCanvas, 50);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === 'pen' || tool === 'eraser';
    if (tool === 'select') {
      canvas.isDrawingMode = false;
    } else if (tool === 'pen') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
    } else if (tool === 'eraser') {
      canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
      canvas.freeDrawingBrush.width = brushWidth;
    }
  }, [tool, brushColor, brushWidth]);
  
  useEffect(() => {
    if (!isCameraDialogOpen) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      return;
    }

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };
    getCameraPermission();
  }, [isCameraDialogOpen, toast]);
  
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setTool('select');
    const text = new fabric.Textbox('Type here', {
      left: canvas.getWidth() / 2 - 100,
      top: canvas.getHeight() / 2 - 20,
      width: 200,
      fontSize: 24,
      fill: brushColor,
      textAlign: 'center',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      fabric.Image.fromURL(data, (img) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        setTool('select');
        img.scaleToWidth(canvas.getWidth() / 2);
        canvas.add(img);
        canvas.centerObject(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
    if(e.target) e.target.value = '';
  };

  const captureFromCamera = () => {
    const canvas = fabricCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !hasCameraPermission) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    tempCanvas.getContext('2d')?.drawImage(video, 0, 0);

    fabric.Image.fromURL(tempCanvas.toDataURL(), (img) => {
        setTool('select');
        img.scaleToWidth(canvas.getWidth() / 2);
        canvas.add(img);
        canvas.centerObject(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
    });
    setIsCameraDialogOpen(false);
  }

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };
  
  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = 'white';
      canvas.renderAll();
    }
  };

  const handleSubmit = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL({ format: 'png' });
      onSubmit(dataUrl);
    }
  };

  const ToolButton = ({ name, icon, ...props }: { name: EditorTool, icon: React.ReactNode } & React.ComponentProps<typeof Button>) => (
    <Button variant={tool === name ? 'secondary' : 'outline'} size="icon" onClick={() => setTool(name)} {...props}>
      {icon} <span className="sr-only">{name}</span>
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border p-2 bg-muted/50">
        <ToolButton name="select" icon={<MousePointer />} />
        <ToolButton name="pen" icon={<PenLine />} />
        <ToolButton name="eraser" icon={<Eraser />} />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: brushColor }} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <Input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="h-10 w-10 p-1"/>
          </PopoverContent>
        </Popover>

        <Popover>
            <PopoverTrigger asChild><Button variant="outline">Size: {brushWidth}</Button></PopoverTrigger>
            <PopoverContent><Slider defaultValue={[brushWidth]} min={1} max={50} step={1} onValueChange={(val) => setBrushWidth(val[0])} /></PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border mx-2" />

        <Button variant="outline" size="icon" onClick={addText}><Type /></Button>
        <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()}><ImageIcon /></Button>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
            <DialogTrigger asChild><Button variant="outline" size="icon"><Camera /></Button></DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Take a Picture</DialogTitle></DialogHeader>
                <div className="relative">
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Alert variant="destructive">
                                <AlertTitle>Camera Access Denied</AlertTitle>
                                <AlertDescription>Please allow camera access in your browser.</AlertDescription>
                            </Alert>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={captureFromCamera} disabled={!hasCameraPermission}>Capture</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={deleteSelected}><Trash2 /></Button>
        <Button variant="outline" onClick={clearCanvas}>Clear All</Button>

      </div>
      <div className="relative w-full aspect-video border rounded-md bg-white touch-none overflow-hidden">
        <canvas ref={canvasRef} />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>Submit Drawing</Button>
      </div>
    </div>
  );
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
