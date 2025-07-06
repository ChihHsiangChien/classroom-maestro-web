
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, XCircle, Loader2, FileText, Vote, Image as ImageIcon, CheckSquare as CheckSquareIcon, PencilRuler, Wand2 } from "lucide-react";
import React, { useState, useTransition } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import type { DrawingEditorRef } from "./drawing-editor";
import { useI18n } from "@/lib/i18n/provider";
import type { QuestionData } from "./create-poll-form";
import { generatePollAction } from "@/app/actions";

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

interface ActivityEditorProps {
  initialData?: QuestionData & { id?: string };
  onSave: (data: QuestionData) => void;
  onCancel: () => void;
  submitButtonText?: string;
}

export function ActivityEditor({ initialData, onSave, onCancel, submitButtonText }: ActivityEditorProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const editorRef = React.useRef<DrawingEditorRef>(null);

    // AI poll generation state
    const [isGenerating, startTransition] = useTransition();
    const [topic, setTopic] = useState("");

    const activityFormSchema = z.object({
        type: z.enum(['multiple-choice', 'true-false', 'short-answer', 'drawing', 'image-annotation']),
        question: z.string(),
        options: z.array(z.object({ value: z.string() })).optional(),
        allowMultipleAnswers: z.boolean().optional(),
        imageUrl: z.string().optional(),
    }).superRefine((data, ctx) => {
        if (data.type === 'multiple-choice') {
            if (!data.options || data.options.length < 2) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('createQuestionForm.options_min_error'),
                    path: ['options']
                });
            }
        }
    });

    type ActivityFormData = z.infer<typeof activityFormSchema>;

    const form = useForm<ActivityFormData>({
        resolver: zodResolver(activityFormSchema),
        defaultValues: {
            type: initialData?.type || 'true-false',
            question: initialData?.question || "",
            options: (initialData?.type === 'multiple-choice' && initialData.options) || [{ value: "" }, { value: "" }, { value: "" }, { value: "" }],
            allowMultipleAnswers: (initialData?.type === 'multiple-choice' && initialData.allowMultipleAnswers) || false,
            imageUrl: (initialData?.type === 'image-annotation' && initialData.imageUrl) || undefined,
        },
    });

    const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "options" });
    const watchedType = useWatch({ control: form.control, name: "type" });

    // AI poll generation handler
    async function handleGeneratePoll() {
        startTransition(async () => {
            const result = await generatePollAction({ topic });
            if (result.poll) {
                form.setValue("question", result.poll.question, { shouldValidate: true });
                if (result.poll.options) {
                    replace(result.poll.options);
                }
                form.clearErrors();
            } else {
                toast({ variant: "destructive", title: t('common.error'), description: result.error });
            }
        });
    }

    // Sync tabs with form state
    const onTabChange = (value: string) => {
        form.setValue("type", value as ActivityFormData['type'], { shouldValidate: true });
    };

    React.useEffect(() => {
        if (initialData) {
            form.reset({
                type: initialData.type,
                question: initialData.question,
                options: (initialData.type === 'multiple-choice' ? initialData.options : [{ value: "" }, { value: "" }]),
                allowMultipleAnswers: !!(initialData.type === 'multiple-choice' && initialData.allowMultipleAnswers),
                imageUrl: (initialData.type === 'image-annotation' ? initialData.imageUrl : undefined),
            });
        }
    }, [initialData, form]);

    function onSubmit(data: ActivityFormData) {
        let finalData: QuestionData;
        const question = data.question.trim() || t('createQuestionForm.untitled_question');

        switch (data.type) {
            case 'true-false':
            case 'short-answer':
            case 'drawing':
                finalData = { type: data.type, question: question };
                break;
            case 'multiple-choice':
                if (!data.options) { // Should be caught by validation, but as a safeguard.
                    toast({ variant: "destructive", title: "Validation Error", description: "Options are missing."});
                    return;
                }
                finalData = { 
                    type: 'multiple-choice', 
                    question: question, 
                    options: data.options,
                    allowMultipleAnswers: data.allowMultipleAnswers || false,
                };
                break;
            case 'image-annotation':
                const imageUrl = editorRef.current?.getCanvasDataUrl();
                if (!imageUrl) {
                    toast({ variant: "destructive", title: t('common.error'), description: t('createQuestionForm.toast_get_image_error') });
                    return;
                }
                finalData = {
                    type: 'image-annotation',
                    question: question,
                    imageUrl,
                };
                break;
            default:
                toast({ variant: "destructive", title: "Error", description: "Invalid question type" });
                return;
        }
        onSave(finalData);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={watchedType} onValueChange={onTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="true-false"><CheckSquareIcon className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_true_false')}</TabsTrigger>
                        <TabsTrigger value="multiple-choice"><Vote className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_multiple_choice')}</TabsTrigger>
                        <TabsTrigger value="short-answer"><FileText className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_short_answer')}</TabsTrigger>
                        <TabsTrigger value="drawing"><ImageIcon className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_drawing')}</TabsTrigger>
                        <TabsTrigger value="image-annotation"><PencilRuler className="mr-2 h-4 w-4" />{t('createQuestionForm.tab_annotation')}</TabsTrigger>
                    </TabsList>
                    
                    <div className="mt-6">
                        <TabsContent value="true-false" forceMount={true} className={watchedType !== 'true-false' ? 'hidden' : ''}>
                             <FormField control={form.control} name="question" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('createQuestionForm.tf_question_label')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('createQuestionForm.tf_question_placeholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </TabsContent>

                        <TabsContent value="multiple-choice" forceMount={true} className={watchedType !== 'multiple-choice' ? 'hidden' : 'space-y-6'}>
                            <div className="space-y-2">
                                <Label htmlFor="topic">{t('createQuestionForm.generate_with_ai_label')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="topic" placeholder={t('createQuestionForm.generate_with_ai_placeholder')} value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isGenerating} />
                                    <Button type="button" variant="outline" size="icon" onClick={handleGeneratePoll} disabled={isGenerating || !topic} className="border-accent text-accent-foreground hover:bg-accent/90 bg-accent shrink-0">
                                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                        <span className="sr-only">Generate Poll</span>
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">{t('createQuestionForm.generate_with_ai_description')}</p>
                            </div>
                            
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t('common.or_create_manually')}</span></div>
                            </div>
                             <FormField control={form.control} name="question" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('createQuestionForm.poll_question_label')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('createQuestionForm.poll_question_placeholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="space-y-4">
                                <FormField control={form.control} name="options" render={() => (
                                    <FormItem>
                                        <FormLabel>{t('createQuestionForm.answer_options_label')}</FormLabel>
                                         {fields.map((field, index) => (
                                            <FormField key={field.id} control={form.control} name={`options.${index}.value`} render={({ field: optionField }) => (
                                                <FormItem>
                                                    <div className="flex items-center gap-2">
                                                        <FormControl>
                                                            <Input placeholder={t('createQuestionForm.option_placeholder', { letter: String.fromCharCode(65 + index) })} {...optionField} />
                                                        </FormControl>
                                                        {fields.length > 2 && (<Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(index)}><XCircle className="h-5 w-5 text-muted-foreground" /></Button>)}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        ))}
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                {fields.length < 10 && (<Button type="button" variant="outline" size="sm" onClick={() => append({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" />{t('createQuestionForm.add_option_button')}</Button>)}
                            </div>
                            <FormField control={form.control} name="allowMultipleAnswers" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">{t('createQuestionForm.allow_multiple_selections_label')}</FormLabel>
                                        <FormDescription>{t('createQuestionForm.allow_multiple_selections_description')}</FormDescription>
                                    </div>
                                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                </FormItem>
                            )} />
                        </TabsContent>

                        <TabsContent value="short-answer" forceMount={true} className={watchedType !== 'short-answer' ? 'hidden' : ''}>
                            <FormField control={form.control} name="question" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('createQuestionForm.sa_question_label')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('createQuestionForm.sa_question_placeholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </TabsContent>
                        
                        <TabsContent value="drawing" forceMount={true} className={watchedType !== 'drawing' ? 'hidden' : ''}>
                             <FormField control={form.control} name="question" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('createQuestionForm.drawing_prompt_label')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('createQuestionForm.drawing_prompt_placeholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </TabsContent>

                        <TabsContent value="image-annotation" forceMount={true} className={watchedType !== 'image-annotation' ? 'hidden' : 'space-y-4'}>
                            <FormField control={form.control} name="question" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('createQuestionForm.annotation_prompt_label')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('createQuestionForm.annotation_prompt_placeholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div>
                                <p className="text-sm text-muted-foreground">{t('createQuestionForm.canvas_description')}</p>
                                <DrawingEditor ref={editorRef} backgroundImageUrl={form.getValues('imageUrl')} />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                    <Button type="submit">{submitButtonText || t('common.save')}</Button>
                </div>
            </form>
        </Form>
    );
}
