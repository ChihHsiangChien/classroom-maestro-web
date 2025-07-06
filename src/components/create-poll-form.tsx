
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";

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
  answer: string[];
  showAnswer?: boolean;
}
export interface TrueFalseQuestion {
  type: 'true-false';
  question: string;
  answer?: 'O' | 'X';
  showAnswer?: boolean;
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
        question: z.string(),
        options: z.array(z.object({ value: z.string() })).max(10),
        allowMultipleAnswers: z.boolean().default(false),
        answer: z.array(z.string()),
    });

    const form = useForm<z.infer<typeof multipleChoiceSchema>>({
        resolver: zodResolver(multipleChoiceSchema),
        defaultValues: { question: "", options: [{ value: "" }, { value: "" }, { value: "" }, { value: "" }], allowMultipleAnswers: false, answer: [] },
    });
    const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "options" });
    const allowMultipleAnswers = useWatch({ control: form.control, name: 'allowMultipleAnswers' });

    async function handleGeneratePoll() {
        startTransition(async () => {
            const result = await generatePollAction({ topic });
            if (result.poll) {
                form.setValue("question", result.poll.question, { shouldValidate: true });
                replace(result.poll.options);
                form.setValue("answer", result.poll.answer, { shouldValidate: true });
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
    
    return (<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6"><div className="space-y-2"><Label htmlFor="topic">{t('createQuestionForm.generate_with_ai_label')}</Label><div className="flex items-center gap-2"><Input id="topic" placeholder={t('createQuestionForm.generate_with_ai_placeholder')} value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isGenerating} /><Button type="button" variant="outline" size="icon" onClick={handleGeneratePoll} disabled={isGenerating || !topic} className="border-accent text-accent-foreground hover:bg-accent/90 bg-accent shrink-0">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}<span className="sr-only">Generate Poll</span></Button></div><p className="text-xs text-muted-foreground">{t('createQuestionForm.generate_with_ai_description')}</p></div><div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t('common.or_create_manually')}</span></div></div><div className="space-y-8"><FormField control={form.control} name="question" render={({ field }) => (<FormItem><FormLabel>{t('createQuestionForm.poll_question_label')}</FormLabel><FormControl><Textarea placeholder={t('createQuestionForm.poll_question_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
    
    <FormField
        control={form.control}
        name="answer"
        render={({ field }) => (
            <FormItem className="space-y-3">
                <div className="flex items-center justify-between">
                    <FormLabel>{t('createQuestionForm.answer_options_label')}</FormLabel>
                    <FormMessage>{form.formState.errors.answer?.message}</FormMessage>
                </div>

                <div className="space-y-2">
                    {fields.map((optionField, index) => (
                        <div key={optionField.id} className="flex items-center gap-3">
                             <FormControl>
                                {allowMultipleAnswers ? (
                                    <Checkbox
                                        checked={field.value.includes(form.getValues(`options.${index}.value`))}
                                        onCheckedChange={(checked) => {
                                            const optionValue = form.getValues(`options.${index}.value`);
                                            if (!optionValue) return;
                                            const newAnswers = checked
                                                ? [...field.value, optionValue]
                                                : field.value.filter((value) => value !== optionValue);
                                            field.onChange(newAnswers);
                                        }}
                                    />
                                ) : (
                                    <RadioGroup
                                        onValueChange={(val) => field.onChange([val])}
                                        value={field.value?.[0]}
                                    >
                                        <RadioGroupItem value={form.getValues(`options.${index}.value`)} />
                                    </RadioGroup>
                                )}
                            </FormControl>
                            <FormField
                                control={form.control}
                                name={`options.${index}.value`}
                                render={({ field: optionInput }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder={t('createQuestionForm.option_placeholder', { letter: String.fromCharCode(65 + index) })} {...optionInput} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {fields.length > 2 && (
                                <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(index)}>
                                    <XCircle className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>

                {fields.length < 10 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('createQuestionForm.add_option_button')}
                    </Button>
                )}
            </FormItem>
        )}
    />

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
                    onCheckedChange={(checked) => {
                        field.onChange(checked);
                        form.setValue('answer', []); // Reset answer when toggling
                    }}
                />
            </FormControl>
        </FormItem>
        )}
    />
        <Button type="submit" className="w-full md:w-auto">{t('createQuestionForm.start_question_button')}</Button></div></form></Form>);
}

function TrueFalseForm({ onQuestionCreate }: QuestionFormProps) {
    const { t } = useI18n();
    const trueFalseSchema = z.object({
        question: z.string(),
        answer: z.enum(['O', 'X']).optional(),
    });

    const form = useForm<z.infer<typeof trueFalseSchema>>({
        resolver: zodResolver(trueFalseSchema),
        defaultValues: { question: "" },
    });

    function onSubmit(data: z.infer<typeof trueFalseSchema>) {
        onQuestionCreate({ type: 'true-false', ...data });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="question" render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('createQuestionForm.tf_question_label')}</FormLabel>
                        <FormControl><Textarea placeholder={t('createQuestionForm.tf_question_placeholder')} {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="answer" render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('createQuestionForm.correct_answer_label')}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="O" />
                                    </FormControl>
                                    <FormLabel className="font-normal text-2xl">O</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="X" />
                                    </FormControl>
                                    <FormLabel className="font-normal text-2xl">X</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <Button type="submit" className="w-full md:w-auto">{t('createQuestionForm.start_question_button')}</Button>
            </form>
        </Form>
    );
}

function SimpleQuestionForm({ type, onQuestionCreate, placeholder, label }: QuestionFormProps & { type: 'short-answer' | 'drawing', placeholder: string, label: string }) {
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
                <TrueFalseForm onQuestionCreate={onQuestionCreate} />
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
