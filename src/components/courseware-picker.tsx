
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useCourseware, type Courseware, type Activity } from '@/contexts/courseware-context';
import type { QuestionData } from './create-poll-form';
import { useI18n } from '@/lib/i18n/provider';
import { BookCopy, CheckSquareIcon, Vote, FileText, ImageIcon, PencilRuler, Loader2 } from 'lucide-react';

interface CoursewarePickerProps {
    onQuestionSelect: (question: QuestionData) => void;
}

export function CoursewarePicker({ onQuestionSelect }: CoursewarePickerProps) {
    const { t } = useI18n();
    const { coursewares, loading } = useCourseware();
    const [selectedCoursewareId, setSelectedCoursewareId] = useState<string | null>(null);

    const selectedCourseware = useMemo(() => coursewares.find(p => p.id === selectedCoursewareId), [coursewares, selectedCoursewareId]);

    const handleCoursewareChange = (coursewareId: string) => {
        setSelectedCoursewareId(coursewareId);
    };

    const handleSelectQuestion = (activity: Activity) => {
        const { id, ...questionData } = activity;
        onQuestionSelect(questionData);
    };
    
    const activityIcons: { [key in QuestionData['type']]: React.ElementType } = {
        'true-false': CheckSquareIcon,
        'multiple-choice': Vote,
        'short-answer': FileText,
        'drawing': ImageIcon,
        'image-annotation': PencilRuler,
    };

    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>{t('courseware.use_courseware')}</CardTitle>
                <CardDescription>{t('courseware.use_courseware_description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t('courseware.loading')}</span>
                    </div>
                )}
                <div className="grid sm:grid-cols-1 gap-4">
                     <Select onValueChange={handleCoursewareChange} disabled={coursewares.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('courseware.select_package')} />
                        </SelectTrigger>
                        <SelectContent>
                            {coursewares.map(cw => (
                                <SelectItem key={cw.id} value={cw.id}>{cw.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedCourseware && (
                    <ScrollArea className="h-72 w-full rounded-md border p-2">
                        <div className="space-y-2">
                        {selectedCourseware.activities.length > 0 ? selectedCourseware.activities.map(activity => {
                            const Icon = activityIcons[activity.type];
                            return (
                                <div key={activity.id} className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {Icon && <Icon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />}
                                        <p className="truncate font-medium text-sm">{activity.question}</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleSelectQuestion(activity)}>{t('courseware.send_question')}</Button>
                                </div>
                            )
                        }) : (
                            <div className="text-center py-10 text-sm text-muted-foreground">
                                <BookCopy className="mx-auto h-8 w-8 mb-2" />
                                {t('courseware.no_activities_in_unit')}
                            </div>
                        )}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}
