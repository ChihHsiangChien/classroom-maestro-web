
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, XCircle, Loader2, FileText, Vote, Image as ImageIcon, CheckSquare as CheckSquareIcon, PencilRuler, Wand2 } from "lucide-react";
import React, { useState, useTransition, useMemo } from "react";
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
import type { QuestionData, TrueFalseQuestion, MultipleChoiceQuestion } from "./create-poll-form";
import { generatePollAction, generateImageAction } from "@/app/actions";
import { useUsage } from "@/contexts/usage-context";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";

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
    const { logAiUsage } = useUsage();

    // AI poll generation state
    const [isGeneratingPoll, startPollTransition] = useTransition();
    const [pollTopic, setPollTopic] = useState("");
    
    // AI image generation state
    const [isGeneratingImage, startImageTransition] = useTransition();
    const [imagePrompt, setImagePrompt] = useState("");

    const activityFormSchema = z.object({
        type: z.enum(['multiple-choice', 'true-false', 'short-answer', 'drawing', 'image-annotation']),
        question: z.string().optional(),
        options: z.array(z.object({ value: z.string().optional() })).optional(),
        allowMultipleAnswers: z.boolean().optional(),
        imageUrl: z.string().optional(),
        answer: z.any().optional(),
    });

    type ActivityFormData = z.infer<typeof activityFormSchema>;

    // Convert legacy string-based answers to new index-based format on component load.
    const initialAnswer = useMemo(() => {
        if (!initialData || !('answer' in initialData) || !Array.isArray(initialData.answer)) {
            return undefined;
        }
        // If it's already indices (numbers), use it as is.
        if (initialData.answer.every(item => typeof item === 'number')) {
            return initialData.answer;
        }
        // If it's the old string format, convert it.
        const options = (initialData.type === 'multiple-choice' && initialData.options) || [];
        const optionValues = options.map(opt => opt.value);
        return initialData.answer
            .map(ans => optionValues.indexOf(ans as string))
            .filter(index => index !== -1);
    }, [initialData]);

    const form = useForm<ActivityFormData>({
        resolver: zodResolver(activityFormSchema),
        defaultValues: initialData ? {
            type: initialData.type,
            question: initialData.question,
            options: initialData.type === 'multiple-choice' ? initialData.options : [{ value: "" }, { value: "" }],
            allowMultipleAnswers: initialData.type === 'multiple-choice' ? initialData.allowMultipleAnswers : false,
            imageUrl: initialData.type === 'image-annotation' ? initialData.imageUrl : '',
            answer: initialAnswer,
        } : {
            type: 'true-false',
            question: "",
            options: [{ value: "" }, { value: "" }, { value: "" }, { value: "" }],
            allowMultipleAnswers: false,
            answer: [],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "options" });
    const watchedType = useWatch({ control: form.control, name: "type" });
    const watchedImageUrl = useWatch({ control: form.control, name: "imageUrl" });
    const allowMultipleAnswers = useWatch({ control: form.control, name: "allowMultipleAnswers" });

    // AI poll generation handler
    async function handleGeneratePoll() {
        startPollTransition(async () => {
            const result = await generatePollAction({ topic: pollTopic });
            if (result.poll) {
                form.setValue("question", result.poll.question, { shouldValidate: true });
                if (result.poll.options) {
                    replace(result.poll.options);
                }
                form.setValue("answer", result.poll.answer, { shouldValidate: true });
                form.clearErrors();
                logAiUsage('generatePoll');
            } else {
                toast({ variant: "destructive", title: t('common.error'), description: result.error });
            }
        });
    }
    
    // AI image generation handler
    const handleGenerateImage = async () => {
        startImageTransition(async () => {
            const result = await generateImageAction({ prompt: imagePrompt });
            if (result.imageUrl) {
                editorRef.current?.addImageFromUrl(result.imageUrl);
                toast({
                    title: t('activityEditor.toast_image_generated_title'),
                    description: t('activityEditor.toast_image_generated_description'),
                });
                logAiUsage('generateImage');
            } else {
                toast({ variant: "destructive", title: t('common.error'), description: result.error });
            }
        });
    };

    // Sync tabs with form state
    const onTabChange = (value: string) => {
        form.setValue("type", value as ActivityFormData['type'], { shouldValidate: true });
        form.clearErrors();
    };

    React.useEffect(() => {
        if (initialData) {
            form.reset({
                type: initialData.type,
                question: initialData.question,
                options: (initialData.type === 'multiple-choice' ? initialData.options : [{ value: "" }, { value: "" }]),
                allowMultipleAnswers: !!(initialData.type === 'multiple-choice' && initialData.allowMultipleAnswers),
                imageUrl: (initialData.type === 'image-annotation' ? initialData.imageUrl : undefined),
                answer: 'answer' in initialData ? initialAnswer : undefined
            });
        }
    }, [initialData, form, initialAnswer]);

    function onSubmit(data: ActivityFormData) {
        let finalData: QuestionData;
        const question = data.question?.trim() || t('createQuestionForm.untitled_question');

        switch (data.type) {
            case 'true-false':
                const tfData: TrueFalseQuestion = { type: 'true-false', question: question };
                if (data.answer) {
                    tfData.answer = data.answer;
                }
                finalData = tfData;
                break;
            case 'multiple-choice':
                const mcData: MultipleChoiceQuestion = { 
                    type: 'multiple-choice', 
                    question: question, 
                    options: data.options?.map(o => ({ value: o.value || '' })) || [],
                    allowMultipleAnswers: data.allowMultipleAnswers || false,
                    answer: data.answer || [],
                };
                finalData = mcData;
                break;
            case 'drawing':
                finalData = { type: 'drawing', question: question };
                break;
             case 'short-answer':
                finalData = { type: 'short-answer', question: question };
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
                        <TabsContent value="true-false" forceMount={true} className={watchedType !== 'true-false' ? 'hidden' : 'space-y-6'}>
                             <FormField control={form.control} name="question" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('createQuestionForm.tf_question_label')}</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t('createQuestionForm.tf_question_placeholder')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="answer" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('createQuestionForm.correct_answer_label')}</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="O" /></FormControl>
                                                <FormLabel className="font-normal text-2xl">O</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="X" /></FormControl>
                                                <FormLabel className="font-normal text-2xl">X</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </TabsContent>

                        <TabsContent value="multiple-choice" forceMount={true} className={watchedType !== 'multiple-choice' ? 'hidden' : 'space-y-6'}>
                            <div className="space-y-2">
                                <Label htmlFor="topic">{t('createQuestionForm.generate_with_ai_label')}</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="topic" placeholder={t('createQuestionForm.generate_with_ai_placeholder')} value={pollTopic} onChange={(e) => setPollTopic(e.target.value)} disabled={isGeneratingPoll} />
                                    <Button type="button" variant="outline" size="icon" onClick={handleGeneratePoll} disabled={isGeneratingPoll || !pollTopic} className="border-accent text-accent-foreground hover:bg-accent/90 bg-accent shrink-0">
                                        {isGeneratingPoll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
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
                                                                checked={(field.value || []).includes(index)}
                                                                onCheckedChange={(checked) => {
                                                                    const currentAnswers = (field.value || []) as number[];
                                                                    const newAnswers = checked
                                                                        ? [...currentAnswers, index]
                                                                        : currentAnswers.filter((value) => value !== index);
                                                                    field.onChange(newAnswers);
                                                                }}
                                                            />
                                                        ) : (
                                                            <RadioGroup
                                                                onValueChange={(val) => field.onChange([parseInt(val)])}
                                                                value={field.value?.[0]?.toString()}
                                                            >
                                                                <RadioGroupItem value={index.toString()} />
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

                            <FormField control={form.control} name="allowMultipleAnswers" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">{t('createQuestionForm.allow_multiple_selections_label')}</FormLabel>
                                        <FormDescription>{t('createQuestionForm.allow_multiple_selections_description')}</FormDescription>
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
                            )} />
                        </TabsContent>

                        <TabsContent value="short-answer" forceMount={true} className={watchedType !== 'short-answer' ? 'hidden' : 'space-y-6'}>
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
                        
                        <TabsContent value="drawing" forceMount={true} className={watchedType !== 'drawing' ? 'hidden' : 'space-y-6'}>
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

                        <TabsContent value="image-annotation" forceMount={true} className={watchedType !== 'image-annotation' ? 'hidden' : 'space-y-6'}>
                             <div className="space-y-2">
                                <Label htmlFor="image-prompt-2">{t('activityEditor.generate_image_label')}</Label>
                                <div className="flex items-center gap-2">
                                     <Input
                                        id="image-prompt-2"
                                        placeholder={t('activityEditor.generate_image_placeholder')}
                                        value={imagePrompt}
                                        onChange={(e) => setImagePrompt(e.target.value)}
                                        disabled={isGeneratingImage}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={handleGenerateImage}
                                        disabled={isGeneratingImage || !imagePrompt}
                                        className="border-accent text-accent-foreground hover:bg-accent/90 bg-accent shrink-0"
                                    >
                                        {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                        <span className="sr-only">{t('activityEditor.generate_image_button')}</span>
                                    </Button>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">{t('common.or_create_manually')}</span></div>
                            </div>
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
                                <DrawingEditor ref={editorRef} backgroundImageUrl={watchedImageUrl} />
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
