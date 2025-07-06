
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, XCircle, Wand2, Loader2, FileText, Vote, Image as ImageIcon, CheckSquare as CheckSquareIcon, PencilRuler } from "lucide-react";
import { useState, useTransition, useRef } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generatePollAction } from "@/app/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import type { DrawingEditorRef } from "./drawing-editor";
import { useI18n } from "@/lib/i18n/provider";

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


// --- SHARED TYPES ---
export interface MultipleChoiceQuestion {
  type: 'multiple-choice';
  question: string;
  options: { value: string }[];
  allowMultipleAnswers: boolean;
}
export interface TrueFalseQuestion {
  type: 'true-false';
  question: string;
}
export interface ShortAnswerQuestion {
  type: 'short-answer';
  question: string;
}
export interface DrawingQuestion {
  type: 'drawing';
  question: string;
}
export interface ImageAnnotationQuestion {
  type: 'image-annotation';
  question: string;
  imageUrl: string;
}
export type QuestionData = 
  | MultipleChoiceQuestion 
  | TrueFalseQuestion 
  | ShortAnswerQuestion 
  | DrawingQuestion
  | ImageAnnotationQuestion;
export type PollData = MultipleChoiceQuestion;


// --- FORMS for each question type ---
interface QuestionFormProps {
    onQuestionCreate: (data: QuestionData) => void;
}

function MultipleChoiceForm({ onQuestionCreate }: QuestionFormProps) {
    const { t } = useI18n();
    const [isGenerating, startTransition] = useTransition();
    const [topic, setTopic] = useState("");
    const { toast } = useToast();

    const multipleChoiceSchema = z.object({
        question: z.string().max(200),
        options: z.array(z.object({ value: z.string().min(1, t('createQuestionForm.option_empty_error')).max(50) })).min(2, t('createQuestionForm.options_min_error')).max(10),
        allowMultipleAnswers: z.boolean().default(false),
    });

    const form = useForm<z.infer<typeof multipleChoiceSchema>>({
        resolver: zodResolver(multipleChoiceSchema),
        defaultValues: { question: "", options: [{ value: "" }, { value: "" }, { value: "" }, { value: "" }], allowMultipleAnswers: false },
    });
    const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "options" });

    async function handleGeneratePoll() {
        startTransition(async () => {
            const result = await generatePollAction({ topic });
            if (result.poll) {
                form.setValue("question", result.poll.question, { shouldValidate: true });
                replace(result.poll.options);
                form.clearErrors();
            } else {
                toast({ variant: "destructive", title: t('common.error'), description: result.error });
            }
        });
    }

    function onSubmit(data: z.infer<typeof multipleChoiceSchema>) {
        const finalQuestion = data.question.trim() || t('createQuestionForm.untitled_question');
        onQuestionCreate({ type: 'multiple-choice', ...data, question: finalQuestion });
    }
    
    return (<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6"><div className="space-y-2"><Label htmlFor="topic">{t('createQuestionForm.generate_with_ai_label')}</Label><div className="flex items-center gap-2"><Input id="topic" placeholder={t('createQuestionForm.generate_with_ai_placeholder')} value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isGenerating} /><Button type="button" variant="outline" size="icon" onClick={handleGeneratePoll} disabled={isGenerating || !topic} className="border-accent text-accent-foreground hover:bg-accent/90 bg-accent shrink-0">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}<span className="sr-only">Generate Poll</span></Button></div><p className="text-xs text-muted-foreground">{t('createQuestionForm.generate_with_ai_description')}</p></div><div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t('common.or_create_manually')}</span></div></div><div className="space-y-8"><FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormLabel>{t('createQuestionForm.poll_question_label')}</FormLabel><FormControl><Textarea placeholder={t('createQuestionForm.poll_question_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="space-y-4"><FormLabel>{t('createQuestionForm.answer_options_label')}</FormLabel><FormField control={form.control} name="options" render={() => ( <FormItem>{fields.map((field, index) => (<FormField key={field.id} control={form.control} name={`options.${index}.value`} render={({ field: optionField }) => (<FormItem><div className="flex items-center gap-2"><FormControl><Input placeholder={t('createQuestionForm.option_placeholder', { letter: String.fromCharCode(65 + index) })} {...optionField} /></FormControl>{fields.length > 2 && (<Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(index)}><XCircle className="h-5 w-5 text-muted-foreground" /></Button>)}</div><FormMessage /></FormItem>)} />))}{fields.length < 10 && (<Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" />{t('createQuestionForm.add_option_button')}</Button>)}<FormMessage/></FormItem>)} /></div>
        <FormField
              control={form.control}
              name="allowMultipleAnswers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t('createQuestionForm.allow_multiple_selections_label')}
                    </FormLabel>
                    <FormDescription>
                      {t('createQuestionForm.allow_multiple_selections_description')}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
        <Button type="submit" className="w-full md:w-auto">{t('createQuestionForm.start_question_button')}</Button></div></form></Form>);
}

function SimpleQuestionForm({ type, onQuestionCreate, placeholder, label }: QuestionFormProps & { type: 'true-false' | 'short-answer' | 'drawing', placeholder: string, label: string }) {
    const { t } = useI18n();
    const simpleQuestionSchema = z.object({
        question: z.string(),
    });
    const form = useForm<z.infer<typeof simpleQuestionSchema>>({
        resolver: zodResolver(simpleQuestionSchema),
        defaultValues: { question: "" },
    });

    function onSubmit(data: z.infer<typeof simpleQuestionSchema>) {
        const finalQuestion = data.question.trim() || t('createQuestionForm.untitled_question');
        onQuestionCreate({ type, ...data, question: finalQuestion });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormLabel>{label}</FormLabel><FormControl><Textarea placeholder={placeholder} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="submit" className="w-full md:w-auto">{t('createQuestionForm.start_question_button')}</Button>
            </form>
        </Form>
    );
}

function ImageAnnotationForm({ onQuestionCreate }: QuestionFormProps) {
    const { t } = useI18n();
    const editorRef = useRef<DrawingEditorRef>(null);
    const [question, setQuestion] = useState("");
    const { toast } = useToast();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const imageUrl = editorRef.current?.getCanvasDataUrl();
        if (imageUrl) {
            const finalQuestion = question.trim() || t('createQuestionForm.untitled_question');
            onQuestionCreate({
                type: 'image-annotation',
                question: finalQuestion,
                imageUrl,
            });
        } else {
            toast({ variant: "destructive", title: t('common.error'), description: t('createQuestionForm.toast_get_image_error') });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="annotation-prompt">{t('createQuestionForm.annotation_prompt_label')}</Label>
                <Textarea 
                    id="annotation-prompt"
                    placeholder={t('createQuestionForm.annotation_prompt_placeholder')}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={2}
                />
            </div>
            <div className="space-y-2">
                <Label>{t('createQuestionForm.canvas_label')}</Label>
                <p className="text-sm text-muted-foreground">
                    {t('createQuestionForm.canvas_description')}
                </p>
                <DrawingEditor ref={editorRef} />
            </div>
            <Button type="submit" className="w-full md:w-auto">{t('createQuestionForm.start_question_button')}</Button>
        </form>
    );
}

export function CreateQuestionForm({ onQuestionCreate }: QuestionFormProps) {
    const { t } = useI18n();
    return (
        <Tabs defaultValue="true-false" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="true-false"><CheckSquareIcon className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_true_false')}</TabsTrigger>
                <TabsTrigger value="multiple-choice"><Vote className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_multiple_choice')}</TabsTrigger>
                <TabsTrigger value="short-answer"><FileText className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_short_answer')}</TabsTrigger>
                <TabsTrigger value="drawing"><ImageIcon className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_drawing')}</TabsTrigger>
                <TabsTrigger value="image-annotation"><PencilRuler className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_annotation')}</TabsTrigger>
            </TabsList>
            <TabsContent value="true-false" className="mt-4">
                <SimpleQuestionForm type="true-false" onQuestionCreate={onQuestionCreate} label={t('createQuestionForm.tf_question_label')} placeholder={t('createQuestionForm.tf_question_placeholder')} />
            </TabsContent>
            <TabsContent value="multiple-choice" className="mt-4">
                <MultipleChoiceForm onQuestionCreate={onQuestionCreate} />
            </TabsContent>
            <TabsContent value="short-answer" className="mt-4">
                <SimpleQuestionForm type="short-answer" onQuestionCreate={onQuestionCreate} label={t('createQuestionForm.sa_question_label')} placeholder={t('createQuestionForm.sa_question_placeholder')} />
            </TabsContent>
            <TabsContent value="drawing" className="mt-4">
                 <SimpleQuestionForm type="drawing" onQuestionCreate={onQuestionCreate} label={t('createQuestionForm.drawing_prompt_label')} placeholder={t('createQuestionForm.drawing_prompt_placeholder')} />
            </TabsContent>
            <TabsContent value="image-annotation" className="mt-4">
                 <ImageAnnotationForm onQuestionCreate={onQuestionCreate} />
            </TabsContent>
        </Tabs>
    );
}
