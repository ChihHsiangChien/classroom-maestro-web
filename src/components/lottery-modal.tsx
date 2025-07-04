
'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, FileText, Users, RotateCcw, ListChecks, ListTodo, Loader2 } from 'lucide-react';
import type { Student, Submission, Classroom } from '@/contexts/classroom-context';
import type { QuestionData } from './create-poll-form';
import { useI18n } from '@/lib/i18n/provider';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Timestamp } from 'firebase/firestore';


interface LotteryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  classroom: Classroom;
  pickedStudent: (Student & { submission?: Submission }) | null;
  pickedStudentIds: string[];
  activeQuestion: QuestionData | null;
  poolSource: 'all' | 'online';
  onPoolSourceChange: (source: 'all' | 'online') => void;
  isUniquePick: boolean;
  onIsUniquePickChange: (isUnique: boolean) => void;
  onPickStudent: () => void;
  onReset: () => void;
}

function AnswerDisplay({ submission, question }: { submission: Submission; question: QuestionData }) {
  if (question.type === 'short-answer') {
    return (
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 mt-1 text-muted-foreground" />
        <p className="p-3 bg-muted/50 rounded-md text-foreground flex-1 break-words">
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
        <p className="p-3 bg-muted/50 rounded-md text-foreground flex-1 break-words">
            {answerText}
        </p>
    </div>
  );
}

export function LotteryModal({ 
  isOpen, 
  onOpenChange, 
  classroom,
  pickedStudent,
  pickedStudentIds,
  activeQuestion,
  poolSource,
  onPoolSourceChange,
  isUniquePick,
  onIsUniquePickChange,
  onPickStudent,
  onReset
}: LotteryModalProps) {
  const { t } = useI18n();

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevPickedStudentId = useRef<string | null>(null);

  const studentPool = useMemo(() => {
    return poolSource === 'all'
        ? classroom.students
        : classroom.students.filter(student => 
            student.isOnline === true && student.lastSeen && (Timestamp.now().seconds - student.lastSeen.seconds < 45)
          );
  }, [classroom.students, poolSource]);
  
  const unpickedStudents = useMemo(() => {
    if (!isUniquePick) {
      return studentPool;
    }
    const pickedSet = new Set(pickedStudentIds);
    return studentPool.filter(s => !pickedSet.has(s.id));
  }, [studentPool, pickedStudentIds, isUniquePick]);

  const pickedStudentsFromPool = useMemo(() => {
      const pickedSet = new Set(pickedStudentIds);
      const studentMap = new Map(classroom.students.map(s => [s.id, s]));
      return pickedStudentIds
        .map(id => studentMap.get(id))
        .filter((s): s is Student => !!s && studentPool.some(poolStudent => poolStudent.id === s.id))
        .reverse(); // Show most recently picked first
  }, [pickedStudentIds, classroom.students, studentPool]);


  useEffect(() => {
    // Check if a new student has been picked
    if (pickedStudent && pickedStudent.id !== prevPickedStudentId.current) {
        setIsAnimating(true);
        setDisplayName(null); // Clear previous name immediately

        const animationPool = [...unpickedStudents.map(s => s.name), pickedStudent.name];

        // No need to animate if there's only one option left and we're in unique pick mode
        if (isUniquePick && animationPool.length < 2) {
            setDisplayName(pickedStudent.name);
            setIsAnimating(false);
            prevPickedStudentId.current = pickedStudent.id;
            return;
        }

        let delay = 50; // Start fast
        let step = 0;
        const totalSteps = 15; // Number of name flashes

        const runAnimationStep = () => {
            const randomIndex = Math.floor(Math.random() * animationPool.length);
            setDisplayName(animationPool[randomIndex]);
            
            step++;

            if (step > totalSteps) {
                // Last step: show the actual winner
                setDisplayName(pickedStudent.name);
                setIsAnimating(false);
            } else {
                // Increase delay to slow down
                delay *= 1.2;
                setTimeout(runAnimationStep, delay);
            }
        };
        
        // Start the animation
        setTimeout(runAnimationStep, delay);
        prevPickedStudentId.current = pickedStudent.id;

    } else if (!pickedStudent) {
        // Reset animation state if the picked student is cleared (e.g., by onReset)
        setDisplayName(null);
        setIsAnimating(false);
        prevPickedStudentId.current = null;
    }
  }, [pickedStudent, unpickedStudents, isUniquePick]);

  if (!isOpen) {
    return null;
  }
  
  const hasSubmission = activeQuestion && pickedStudent?.submission;
  const pickButtonText = pickedStudentIds.length > 0 ? t('lotteryModal.pick_again_button') : t('lotteryModal.start_picking_button');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl grid-rows-[auto,1fr,auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">{t('studentManagement.lottery_button')}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 overflow-y-auto pr-2">
            {/* Left Column: Lists & Controls */}
            <div className="space-y-4 flex flex-col min-h-[300px]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="unique-pick" checked={isUniquePick} onCheckedChange={(checked) => onIsUniquePickChange(!!checked)} />
                        <Label htmlFor="unique-pick" className="text-sm font-medium leading-none">
                          {t('lotteryModal.unique_pick_label')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="pool-source" checked={poolSource === 'online'} onCheckedChange={(checked) => onPoolSourceChange(checked ? 'online' : 'all')} />
                        <Label htmlFor="pool-source" className="text-sm font-medium leading-none">
                          {t('lotteryModal.pick_from_online_label')}
                        </Label>
                      </div>
                    </div>
                     <Button variant="outline" size="sm" onClick={onReset} disabled={isAnimating}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {t('lotteryModal.reset_button')}
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 overflow-hidden">
                    <Card className="flex flex-col">
                        <CardHeader className="p-3">
                           <CardTitle className="text-base flex items-center gap-2"><ListTodo className="h-5 w-5" /> {t('lotteryModal.unpicked_list_title')}</CardTitle>
                           <CardDescription>{unpickedStudents.length} students</CardDescription>
                        </CardHeader>
                        <Separator />
                        <CardContent className="p-1 flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-2 space-y-1">
                                    {unpickedStudents.length > 0 ? unpickedStudents.map(s => (
                                        <p key={s.id} className="text-sm px-2 py-1 rounded-md bg-muted/50">{s.name}</p>
                                    )) : <p className="text-center text-xs text-muted-foreground p-4">{t('lotteryModal.lottery_no_students_in_pool')}</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                     <Card className="flex flex-col">
                        <CardHeader className="p-3">
                           <CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-5 w-5" /> {t('lotteryModal.picked_list_title')}</CardTitle>
                           <CardDescription>{pickedStudentsFromPool.length} students</CardDescription>
                        </CardHeader>
                        <Separator />
                        <CardContent className="p-1 flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                <div className="p-2 space-y-1">
                                    {pickedStudentsFromPool.length > 0 ? pickedStudentsFromPool.map(s => (
                                        <p key={s.id} className="text-sm px-2 py-1 rounded-md opacity-70">{s.name}</p>
                                    )) : <p className="text-center text-xs text-muted-foreground p-4">{t('lotteryModal.no_one_picked_yet')}</p>}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Right Column: Picked Student & Result */}
            <div className="space-y-4 flex flex-col">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>{t('lotteryModal.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="h-48 flex items-center justify-center">
                       {isAnimating ? (
                            <div className="text-center">
                                <p className="text-4xl font-bold text-foreground transition-opacity duration-150 h-[48px]">{displayName}</p>
                            </div>
                        ) : pickedStudent && displayName ? (
                            <div className="flex flex-col items-center gap-4 text-center animate-in fade-in-50 zoom-in-95">
                                <div className="p-4 bg-primary/10 rounded-full">
                                    <User className="h-10 w-10 text-primary" />
                                </div>
                                <p className="text-4xl font-bold text-foreground">{displayName}</p>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <p>{t('lotteryModal.no_one_picked_yet')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {pickedStudent && !isAnimating && hasSubmission && (
                    <Card className="flex-1">
                        <CardHeader>
                            <CardTitle className="text-base">{t('lotteryModal.submission_title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AnswerDisplay submission={pickedStudent.submission!} question={activeQuestion!} />
                        </CardContent>
                    </Card>
                )}
                 {pickedStudent && !isAnimating && !hasSubmission && activeQuestion && (
                    <Card className="flex-1">
                      <CardHeader>
                          <CardTitle className="text-base">{t('lotteryModal.submission_title')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center text-muted-foreground p-4 bg-muted/50 rounded-md">
                            {t('lotteryModal.not_submitted_message')}
                        </div>
                      </CardContent>
                    </Card>
                )}
            </div>

        </div>

        <DialogFooter className="pt-4 sm:justify-between sm:flex-row-reverse">
          <Button onClick={onPickStudent} disabled={unpickedStudents.length === 0 || isAnimating}>
            {isAnimating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Users className="mr-2 h-4 w-4" />
            )}
            {isAnimating ? t('lotteryModal.picking_in_progress') : pickButtonText}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
