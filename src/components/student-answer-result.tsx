
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

export function StudentAnswerResult({ question, myAnswer }: StudentAnswerResultProps) {
    const { t } = useI18n();

    // Helper function to normalize strings for a more robust comparison
    const normalizeString = (str: string | undefined | null): string => {
        if (typeof str !== 'string') return '';
        return str
            .replace(/，/g, ',') // Replace full-width comma with half-width
            .replace(/\s\s+/g, ' ') // Collapse multiple whitespace chars into a single space
            .trim();
    };

    const getIsCorrect = (): boolean => {
        if (myAnswer === null || myAnswer === undefined) {
            return false;
        }

        if (question.type === 'true-false') {
            return normalizeString(question.answer) === normalizeString(myAnswer as string);
        }

        if (question.type === 'multiple-choice') {
            const correctAnswers = question.answer;
            if (!Array.isArray(correctAnswers)) return false;

            const studentAnswers = Array.isArray(myAnswer) ? myAnswer : [myAnswer];

            if (correctAnswers.length !== studentAnswers.length) {
                return false;
            }

            // Normalize and sort both arrays before comparing
            const sortedCorrect = correctAnswers.map(s => normalizeString(s)).sort();
            const sortedStudent = studentAnswers.map(s => normalizeString(s)).sort();
            
            // Check if every element at every position is identical
            return sortedCorrect.every((value, index) => value === sortedStudent[index]);
        }

        return false;
    };
    
    const isCorrect = getIsCorrect();
    const isMcq = question.type === 'multiple-choice';
    const isTf = question.type === 'true-false';

    const renderAnswer = (answer: string | string[] | undefined) => {
        if (!answer) return <span className="text-muted-foreground">{t('studentAnswerResult.no_answer')}</span>;
        
        const answerArray = Array.isArray(answer) ? answer : [answer];
        
        if (isMcq && 'options' in question) {
             const getOptionText = (val: string) => {
                const option = (question as MultipleChoiceQuestion).options.find(o => o.value === val);
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
                        <p className="text-lg font-semibold">{renderAnswer(myAnswer || undefined)}</p>
                    </div>
                    {!isCorrect && 'answer' in question && question.answer && (
                         <div className="p-4 bg-green-500/10 rounded-lg">
                            <p className="text-sm font-medium text-green-700">{t('studentAnswerResult.correct_answer')}</p>
                            <p className="text-lg font-semibold text-green-800">{renderAnswer(question.answer)}</p>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
