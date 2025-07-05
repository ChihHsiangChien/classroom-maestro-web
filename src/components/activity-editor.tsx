
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, XCircle, Loader2, FileText, Vote, Image as ImageIcon, CheckSquare as CheckSquareIcon, PencilRuler } from "lucide-react";
import React, { useRef, useEffect } from "react";
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

type ActivityFormData = {
  type: QuestionData['type'];
  question: string;
  options: { value: string }[];
  allowMultipleAnswers: boolean;
  imageUrl?: string;
};

const activityFormSchema = z.object({
    type: z.enum(['multiple-choice', 'true-false', 'short-answer', 'drawing', 'image-annotation']),
    question: z.string().min(1, 'Question cannot be empty.'),
    options: z.array(z.object({ value: z.string().min(1, 'Option cannot be empty') })),
    allowMultipleAnswers: z.boolean(),
    imageUrl: z.string().optional(),
});


interface ActivityEditorProps {
  initialData?: QuestionData & { id?: string };
  onSave: (data: QuestionData) => void;
  onCancel: () => void;
  submitButtonText?: string;
}

export function ActivityEditor({ initialData, onSave, onCancel, submitButtonText = "Save Activity" }: ActivityEditorProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const editorRef = useRef<DrawingEditorRef>(null);

    const form = useForm<ActivityFormData>({
        resolver: zodResolver(activityFormSchema),
        defaultValues: {
            type: initialData?.type || 'true-false',
            question: initialData?.question || "",
            options: (initialData?.type === 'multiple-choice' && initialData.options) || [{ value: "" }, { value: "" }],
            allowMultipleAnswers: (initialData?.type === 'multiple-choice' && initialData.allowMultipleAnswers) || false,
            imageUrl: (initialData?.type === 'image-annotation' && initialData.imageUrl) || undefined,
        },
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "options" });
    const watchedType = useWatch({ control: form.control, name: "type" });

    // Sync tabs with form state
    const onTabChange = (value: string) => {
        form.setValue("type", value as ActivityFormData['type']);
    };

    useEffect(() => {
        if (initialData) {
            form.reset({
                type: initialData.type,
                question: initialData.question,
                options: (initialData.type === 'multiple-choice' ? initialData.options : [{ value: "" }, { value: "" }]),
                allowMultipleAnswers: (initialData.type === 'multiple-choice' ? initialData.allowMultipleAnswers : false),
                imageUrl: (initialData.type === 'image-annotation' ? initialData.imageUrl : undefined),
            });
        }
    }, [initialData, form]);

    function onSubmit(data: ActivityFormData) {
        let finalData: QuestionData;

        switch (data.type) {
            case 'true-false':
            case 'short-answer':
            case 'drawing':
                finalData = { type: data.type, question: data.question };
                break;
            case 'multiple-choice':
                if (data.options.length < 2) {
                    toast({ variant: "destructive", title: "Validation Error", description: "Multiple choice questions must have at least 2 options."});
                    return;
                }
                finalData = { 
                    type: 'multiple-choice', 
                    question: data.question, 
                    options: data.options, 
                    allowMultipleAnswers: data.allowMultipleAnswers 
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
                    question: data.question,
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
                    
                    <TabsContent value="true-false" className="mt-6">
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

                    <TabsContent value="multiple-choice" className="mt-6 space-y-6">
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
                            <FormLabel>{t('createQuestionForm.answer_options_label')}</FormLabel>
                            {fields.map((field, index) => (
                                <FormField key={field.id} control={form.control} name={`options.${index}.value`} render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-2">
                                            <FormControl>
                                                <Input placeholder={t('createQuestionForm.option_placeholder', { letter: String.fromCharCode(65 + index) })} {...field} />
                                            </FormControl>
                                            {fields.length > 2 && (<Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => remove(index)}><XCircle className="h-5 w-5 text-muted-foreground" /></Button>)}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            ))}
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

                    <TabsContent value="short-answer" className="mt-6">
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
                    
                    <TabsContent value="drawing" className="mt-6">
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

                    <TabsContent value="image-annotation" className="mt-6 space-y-4">
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
                </Tabs>

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                    <Button type="submit">{submitButtonText}</Button>
                </div>
            </form>
        </Form>
    );
}
