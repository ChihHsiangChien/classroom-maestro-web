
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { useI18n } from '@/lib/i18n/provider';
import type { QuestionData, TrueFalseQuestion, MultipleChoiceQuestion } from './create-poll-form';

interface StudentAnswerResultProps {
    question: QuestionData;
    myAnswer: string | string[] | null;
}

// Helper to check if two arrays of strings are equal, regardless of order.
const areArraysEqual = (arr1: string[], arr2: string[]) => {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((value, index) => value === sorted2[index]);
};

export function StudentAnswerResult({ question, myAnswer }: StudentAnswerResultProps) {
    const { t } = useI18n();

    const getIsCorrect = (): boolean => {
        if (!myAnswer) return false;
        if (question.type !== 'true-false' && question.type !== 'multiple-choice') return false;

        const correctAnswer = question.answer;
        if (Array.isArray(correctAnswer) && Array.isArray(myAnswer)) {
            return areArraysEqual(correctAnswer, myAnswer);
        }
        return correctAnswer === myAnswer;
    };
    
    const isCorrect = getIsCorrect();
    const isMcq = question.type === 'multiple-choice';
    const isTf = question.type === 'true-false';

    const renderAnswer = (answer: string | string[] | undefined, isCorrectAnswer: boolean) => {
        if (!answer) return <span className="text-muted-foreground">{t('studentAnswerResult.no_answer')}</span>;
        
        const answerArray = Array.isArray(answer) ? answer : [answer];
        
        if (isMcq && 'options' in question) {
             const getOptionText = (val: string) => {
                const option = question.options.find(o => o.value === val);
                return option ? option.value : val;
            };
            return answerArray.map(getOptionText).join(', ');
        }
        
        return answerArray.join(', ');
    };

    return (
        <Card className="w-full max-w-2xl animate-in fade-in shadow-lg">
            <CardHeader className="text-center">
                {isCorrect ? (
                    <div className="flex flex-col items-center gap-2 text-green-500">
                        <CheckCircle className="h-16 w-16" />
                        <CardTitle className="text-4xl">{t('studentAnswerResult.correct')}</CardTitle>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-destructive">
                        <XCircle className="h-16 w-16" />
                        <CardTitle className="text-4xl">{t('studentAnswerResult.incorrect')}</CardTitle>
                    </div>
                )}
                <CardDescription className="pt-2 text-base text-foreground/80">{question.question}</CardDescription>
            </CardHeader>
            {(isMcq || isTf) && (
                <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">{t('studentAnswerResult.your_answer')}</p>
                        <p className="text-lg font-semibold">{renderAnswer(myAnswer || undefined, false)}</p>
                    </div>
                    {!isCorrect && (
                         <div className="p-4 bg-green-500/10 rounded-lg">
                            <p className="text-sm font-medium text-green-700">{t('studentAnswerResult.correct_answer')}</p>
                            <p className="text-lg font-semibold text-green-800">{renderAnswer(question.answer, true)}</p>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
