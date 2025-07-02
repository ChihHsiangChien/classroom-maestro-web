
'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, FileText } from 'lucide-react';
import type { Student, Submission } from '@/components/student-management';
import type { QuestionData } from './create-poll-form';
import { useI18n } from '@/lib/i18n/provider';

interface LotteryModalProps {
  studentData: (Student & { submission?: Submission }) | null;
  onOpenChange: (open: boolean) => void;
  onPickAgain: () => void;
  activeQuestion: QuestionData | null;
}

function AnswerDisplay({ submission, question }: { submission: Submission; question: QuestionData }) {
  if (question.type === 'short-answer') {
    return (
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 mt-1 text-muted-foreground" />
        <p className="p-3 bg-muted/50 rounded-md text-foreground flex-1">
          {submission.answer as string}
        </p>
      </div>
    );
  }

  if (question.type === 'drawing' || question.type === 'image-annotation') {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="w-full aspect-video bg-muted rounded-md overflow-hidden relative border">
                <Image src={submission.answer as string} alt="Student submission" layout="fill" objectFit="contain" />
            </div>
        </div>
    )
  }
  
  const answerText = Array.isArray(submission.answer) ? submission.answer.join(', ') : submission.answer;

  return (
    <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 mt-1 text-muted-foreground" />
        <p className="p-3 bg-muted/50 rounded-md text-foreground flex-1">
            {answerText}
        </p>
    </div>
  );
}


export function LotteryModal({ studentData, onOpenChange, onPickAgain, activeQuestion }: LotteryModalProps) {
  const { t } = useI18n();

  if (!studentData) {
    return null;
  }
  const hasSubmission = activeQuestion && studentData.submission;

  return (
    <Dialog open={!!studentData} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">{t('lotteryModal.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
            <div className="p-4 bg-primary/10 rounded-full">
                <User className="h-12 w-12 text-primary" />
            </div>
            <p className="text-4xl font-bold text-foreground">{studentData.name}</p>
        </div>
        
        {hasSubmission ? (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t('lotteryModal.submission_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <AnswerDisplay submission={studentData.submission!} question={activeQuestion!} />
                </CardContent>
            </Card>
        ) : activeQuestion ? (
            <div className="text-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                {t('lotteryModal.not_submitted_message')}
            </div>
        ) : null}

        <DialogFooter className="sm:justify-between sm:flex-row-reverse mt-4">
          <Button onClick={onPickAgain}>{t('lotteryModal.pick_again_button')}</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
