
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from "qrcode.react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, Clapperboard, AlertTriangle, LogOut, GripVertical, ChevronDown, ArrowDownUp, ArrowUp, ArrowDown } from 'lucide-react';
import { useI18n } from "@/lib/i18n/provider";
import { useClassroom, type Classroom, type Submission, type Student } from '@/contexts/classroom-context';
import type { QuestionData } from "./create-poll-form";
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Switch } from './ui/switch';
import { Label } from './ui/label';


interface ManagementPanelProps {
  classroom: Classroom;
  submissions: Submission[];
  joinUrl: string;
  activeQuestion: QuestionData | null;
  onEndQuestion: () => void;
}

const LOCAL_STORAGE_KEY = 'management-panel-layout';

// Helper function to get translated question type
function getTranslatedQuestionType(type: QuestionData['type'], t: (key: string, values?: Record<string, string | number>) => string): string | null {
    switch (type) {
        case 'true-false':
            return t('createQuestionForm.tab_true_false');
        case 'multiple-choice':
            return t('createQuestionForm.tab_multiple_choice');
        case 'short-answer':
            return t('createQuestionForm.tab_short_answer');
        case 'drawing':
            return t('createQuestionForm.tab_drawing');
        case 'image-annotation':
            return t('createQuestionForm.tab_annotation');
        default:
            return null;
    }
}

// A single sortable and collapsible card component
function SortableItem({ id, ...props }: { id: string } & ManagementPanelProps & { open: boolean, onOpenChange: (isOpen: boolean) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative' as React.CSSProperties['position'],
    };

    const handleProps = { ...attributes, ...listeners };

    const { t } = useI18n();
    const { kickStudent, toggleClassroomLock } = useClassroom();
    const { toast } = useToast();
    const canDisplayQrCode = props.joinUrl && props.joinUrl.length < 2000;

    // State and logic for the Student Status card
    const [sortBy, setSortBy] = useState<'name' | 'status' | 'submission'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const sortedStudents = useMemo(() => {
        if (!props.classroom.students) return [];

        const studentsCopy = [...props.classroom.students];
        const submittedIds = new Set(props.submissions.map(s => s.studentId));

        studentsCopy.sort((a, b) => {
            let compare = 0;
            const aIsOnline = a.isOnline === true && a.lastSeen && (Timestamp.now().seconds - a.lastSeen.seconds < 45);
            const bIsOnline = b.isOnline === true && b.lastSeen && (Timestamp.now().seconds - b.lastSeen.seconds < 45);
            const aHasSubmitted = submittedIds.has(a.id);
            const bHasSubmitted = submittedIds.has(b.id);

            switch (sortBy) {
                case 'status':
                    if (aIsOnline !== bIsOnline) {
                        compare = aIsOnline ? -1 : 1; // Online students first
                    } else {
                        compare = a.name.localeCompare(b.name); // Fallback to name sort
                    }
                    break;
                case 'submission':
                     if (aHasSubmitted !== bHasSubmitted) {
                        compare = aHasSubmitted ? -1 : 1; // Submitted students first
                    } else if (aIsOnline !== bIsOnline) {
                        compare = aIsOnline ? -1 : 1; // Then sort by online status
                    } else {
                        compare = a.name.localeCompare(b.name); // Fallback to name sort
                    }
                    break;
                case 'name':
                default:
                    compare = a.name.localeCompare(b.name);
                    break;
            }
            return sortOrder === 'asc' ? compare : -compare;
        });

        return studentsCopy;
    }, [props.classroom.students, props.submissions, sortBy, sortOrder]);


    const handleCopy = () => {
        navigator.clipboard.writeText(props.joinUrl);
        toast({
            title: t('studentManagement.copy_button_toast_title'),
            description: t('studentManagement.copy_button_toast_description'),
        });
    };
    
    const handleKickStudent = (studentId: string, studentName: string) => {
        kickStudent(props.classroom.id, studentId);
    };

    const translatedQuestionType = props.activeQuestion ? getTranslatedQuestionType(props.activeQuestion.type, t) : null;

    const cardsContent: { [key: string]: {header: React.ReactNode, content: React.ReactNode, footer?: React.ReactNode} } = {
        join: {
            header: (
                <div className="flex-1">
                    <CardTitle>{t('studentManagement.title')}</CardTitle>
                    <CardDescription>{t('studentManagement.description')}</CardDescription>
                </div>
            ),
            content: (
                <CardContent className="space-y-4">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="p-2 border rounded-md bg-white">
                        {canDisplayQrCode ? (
                            <QRCode value={props.joinUrl} size={128} />
                        ) : props.joinUrl ? (
                            <div className="w-32 h-32 flex flex-col items-center justify-center bg-muted text-muted-foreground p-2 text-center">
                                <AlertTriangle className="h-6 w-6 mb-2" />
                                <p className="text-xs">{t('studentManagement.url_too_long_for_qr')}</p>
                            </div>
                        ) : (
                            <div className="w-32 h-32 bg-gray-200 animate-pulse rounded-md" />
                        )}
                        </div>
                        <p className="text-sm font-medium">{t('studentManagement.scan_to_join')}</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('studentManagement.classroom_url_label')}</label>
                        <div className="flex items-center gap-2">
                            <Input value={props.joinUrl} readOnly />
                            <Button size="icon" variant="outline" onClick={handleCopy}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            ),
            footer: (
                <CardFooter className="p-4 border-t">
                    <div className="flex items-center justify-between w-full">
                        <div className="space-y-0.5 pr-4">
                            <Label htmlFor="lock-switch" className="font-semibold">{t('studentManagement.lock_classroom_label')}</Label>
                            <p className="text-xs text-muted-foreground">{t('studentManagement.lock_classroom_description')}</p>
                        </div>
                        <Switch
                            id="lock-switch"
                            checked={props.classroom.isLocked || false}
                            onCheckedChange={(checked) => toggleClassroomLock(props.classroom.id, checked)}
                        />
                    </div>
                </CardFooter>
            )
        },
        status: {
            header: (
                 <div className="flex flex-1 items-center justify-between">
                    <div className="flex-1 pr-2">
                        <CardTitle>{t('studentManagement.student_status_card_title')}</CardTitle>
                        <CardDescription>
                            {t('studentManagement.student_status_card_description', { submissionsCount: props.submissions.length, studentsCount: props.classroom.students?.length || 0 })}
                        </CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2">
                                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('studentManagement.sort_by_label')}</DropdownMenuLabel>
                            <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                                <DropdownMenuRadioItem value="name">{t('studentManagement.sort_by_name')}</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="status">{t('studentManagement.sort_by_status')}</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="submission">{t('studentManagement.sort_by_submission')}</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                            <DropdownMenuSeparator />
                             <DropdownMenuRadioGroup value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                                <DropdownMenuRadioItem value="asc">
                                    <ArrowUp className="mr-2 h-3.5 w-3.5" />
                                    {t('studentManagement.sort_order_asc')}
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="desc">
                                    <ArrowDown className="mr-2 h-3.5 w-3.5" />
                                    {t('studentManagement.sort_order_desc')}
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
            content: (
                <CardContent className="p-0">
                    <ScrollArea className="h-72 px-6">
                        <div className="space-y-2 py-4">
                            <TooltipProvider>
                            {sortedStudents.map(student => {
                                const submittedIds = new Set(props.submissions.map(s => s.studentId));
                                const hasSubmitted = submittedIds.has(student.id);
                                const isConsideredOnline = student.isOnline === true && student.lastSeen && (Timestamp.now().seconds - student.lastSeen.seconds < 45);
                                return (
                                    <div
                                        key={student.id}
                                        className={cn(
                                            "flex items-center justify-between rounded-md p-2 transition-all",
                                            hasSubmitted ? "bg-green-500/10" : "bg-muted/50",
                                            !isConsideredOnline && "opacity-50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Tooltip>
                                                <TooltipTrigger>
                                                    <span className={cn(
                                                        "h-2.5 w-2.5 rounded-full block flex-shrink-0 transition-colors",
                                                        isConsideredOnline ? 'bg-green-500' : 'bg-slate-400'
                                                    )} />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{isConsideredOnline ? t('studentManagement.status_online') : t('studentManagement.status_offline')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <p className="font-medium truncate">{student.name}</p>
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            {hasSubmitted && props.activeQuestion ? (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle className="h-5 w-5" />
                                                    <span className="text-xs hidden sm:inline">{t('studentManagement.submitted_status')}</span>
                                                </div>
                                            ) : (
                                                props.activeQuestion && <span className="text-xs text-muted-foreground pr-2">Waiting...</span>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleKickStudent(student.id, student.name)}>
                                                        <LogOut className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t('studentManagement.kick_student_tooltip')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                )
                            })}
                            </TooltipProvider>
                            {(!sortedStudents || sortedStudents.length === 0) && (
                                <p className="text-center text-muted-foreground py-4">{t('studentManagement.no_students_logged_in_message')}</p>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            )
        },
        lesson: {
            header: (
                <div className="flex-1">
                    <CardTitle className="text-base font-medium">
                        {t('teacherDashboard.lesson_status_card_title')}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                        <Clapperboard className="h-4 w-4" />
                        <span className="font-bold">
                          {props.activeQuestion 
                            ? (translatedQuestionType
                                ? t('teacherDashboard.question_type_active', { questionType: translatedQuestionType })
                                : t('teacherDashboard.question_active')
                              )
                            : t('teacherDashboard.idle')}
                        </span>
                    </CardDescription>
                </div>
            ),
            content: (
                 <CardContent>
                    <p className="text-xs text-muted-foreground">
                        {props.activeQuestion
                        ? t('teacherDashboard.responses_count', { submissionsCount: props.submissions.length, studentsCount: props.classroom.students?.length || 0 })
                        : t('teacherDashboard.start_a_question_prompt')}
                    </p>
                </CardContent>
            ),
            footer: props.activeQuestion && (
                <CardFooter>
                    <Button variant="destructive" className="w-full" onClick={props.onEndQuestion}>
                        {t('teacherDashboard.end_question_button')}
                    </Button>
                </CardFooter>
            )
        }
    };

    const cardData = cardsContent[id];
    if (!cardData) return null;

    return (
        <div ref={setNodeRef} style={style}>
            <Card>
                <Collapsible open={props.open} onOpenChange={props.onOpenChange}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex min-w-0 items-center gap-1 -ml-2">
                            <Button variant="ghost" size="icon" {...handleProps} className="cursor-grab active:cursor-grabbing h-8 w-8 flex-shrink-0">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </Button>
                            {cardData.header}
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                            </Button>
                        </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                        {cardData.content}
                        {cardData.footer}
                    </CollapsibleContent>
                </Collapsible>
            </Card>
        </div>
    )
}

export function ManagementPanel({ classroom, submissions, joinUrl, activeQuestion, onEndQuestion }: ManagementPanelProps) {
  const [cardOrder, setCardOrder] = useState(['join', 'status', 'lesson']);
  const [openStates, setOpenStates] = useState<{ [key: string]: boolean }>({ join: true, status: true, lesson: true });

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        const { order, open } = JSON.parse(savedState);
        if (Array.isArray(order) && typeof open === 'object') {
          // Ensure all default cards are present
          const defaultCards = ['join', 'status', 'lesson'];
          const newOrder = defaultCards.filter(c => order.includes(c));
          order.forEach(c => {
            if (!newOrder.includes(c)) newOrder.push(c);
          });
          
          setCardOrder(newOrder);
          setOpenStates(open);
        }
      }
    } catch (error) {
      console.error("Failed to load layout from localStorage", error);
    }
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ order: cardOrder, open: openStates });
      localStorage.setItem(LOCAL_STORAGE_KEY, stateToSave);
    } catch (error) {
      console.error("Failed to save layout to localStorage", error);
    }
  }, [cardOrder, openStates]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleOpenChange = (cardId: string, isOpen: boolean) => {
    setOpenStates(prev => ({ ...prev, [cardId]: isOpen }));
  };
  
  return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {cardOrder.map(id => (
              <SortableItem
                key={id}
                id={id}
                classroom={classroom}
                submissions={submissions}
                joinUrl={joinUrl}
                activeQuestion={activeQuestion}
                onEndQuestion={onEndQuestion}
                open={openStates[id] === undefined ? true : openStates[id]}
                onOpenChange={(isOpen) => handleOpenChange(id, isOpen)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
  );
}
