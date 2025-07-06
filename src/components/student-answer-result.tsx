
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { useI18n } from '@/lib/i18n/provider';
import type { QuestionData } from './create-poll-form';

interface StudentAnswerResultProps {
    question: QuestionData;
    myAnswer: string | string[] | number | number[] | null;
}

export function StudentAnswerResult({ question, myAnswer }: StudentAnswerResultProps) {
    const { t } = useI18n();

    const getIsCorrect = (): boolean => {
        if (myAnswer === null || myAnswer === undefined) {
            return false;
        }

        if (question.type === 'true-false') {
            if (!('answer' in question) || question.answer === undefined) {
                return false; // Cannot be correct if no answer is defined
            }
            const studentAnswerIndex = Number(myAnswer);
            const correctAnswerIndex = question.answer === 'O' ? 0 : 1;
            return studentAnswerIndex === correctAnswerIndex;
        }

        if (question.type === 'multiple-choice') {
            const correctAnswers = question.answer; // is number[]
            if (!Array.isArray(correctAnswers)) return false;

            const studentAnswers = (Array.isArray(myAnswer) ? myAnswer : [myAnswer]).map(Number);

            if (correctAnswers.length !== studentAnswers.length) {
                return false;
            }

            const sortedCorrect = [...correctAnswers].sort();
            const sortedStudent = [...studentAnswers].sort();
            
            return sortedCorrect.every((value, index) => value === sortedStudent[index]);
        }

        return false;
    };
    
    const isCorrect = getIsCorrect();
    const isMcq = question.type === 'multiple-choice';
    const isTf = question.type === 'true-false';

    const renderAnswer = (answer: string | string[] | number | number[] | undefined, options?: { value: string }[]) => {
        if (answer === undefined || answer === null) return <span className="text-muted-foreground">{t('studentAnswerResult.no_answer')}</span>;
        
        const answerArray = Array.isArray(answer) ? answer : [answer];
        
        if ((isMcq || isTf) && options) {
            const getOptionText = (val: string | number) => {
                const index = typeof val === 'number' ? val : parseInt(val, 10);
                if (!isNaN(index) && options[index]) {
                    return options[index].value;
                }
                return val.toString(); // Fallback to show the value/index
            };
            return answerArray.map(getOptionText).join(', ');
        }
        
        return Array.isArray(answer) ? answer.join(', ') : answer.toString();
    };
    
    const getOptions = () => {
        if (question.type === 'multiple-choice') return question.options;
        if (question.type === 'true-false') return [{value: 'O'}, {value: 'X'}];
        return [];
    }

    const getCorrectAnswerIndices = () => {
        if (question.type === 'multiple-choice') return question.answer;
        if (question.type === 'true-false') {
            if (question.answer === 'O') return [0];
            if (question.answer === 'X') return [1];
        }
        return [];
    }

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
                        <p className="text-lg font-semibold">{renderAnswer(myAnswer || undefined, getOptions())}</p>
                    </div>
                    {!isCorrect && 'answer' in question && question.answer !== undefined && (
                         <div className="p-4 bg-green-500/10 rounded-lg">
                            <p className="text-sm font-medium text-green-700">{t('studentAnswerResult.correct_answer')}</p>
                            <p className="text-lg font-semibold text-green-800">{renderAnswer(getCorrectAnswerIndices(), getOptions())}</p>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
