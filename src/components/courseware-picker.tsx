
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useCourseware, type CoursewarePackage, type Unit, type Activity } from '@/contexts/courseware-context';
import type { QuestionData } from './create-poll-form';
import { useI18n } from '@/lib/i18n/provider';
import { BookCopy, CheckSquareIcon, Vote, FileText, ImageIcon, PencilRuler, Loader2 } from 'lucide-react';

interface CoursewarePickerProps {
    onQuestionSelect: (question: QuestionData) => void;
}

export function CoursewarePicker({ onQuestionSelect }: CoursewarePickerProps) {
    const { t } = useI18n();
    const { packages, loading } = useCourseware();
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

    const selectedPackage = useMemo(() => packages.find(p => p.id === selectedPackageId), [packages, selectedPackageId]);
    const selectedUnit = useMemo(() => selectedPackage?.units.find(u => u.id === selectedUnitId), [selectedPackage, selectedUnitId]);

    const handlePackageChange = (packageId: string) => {
        setSelectedPackageId(packageId);
        setSelectedUnitId(null); // Reset unit when package changes
    };

    const handleUnitChange = (unitId: string) => {
        setSelectedUnitId(unitId);
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
                        <span>Loading courseware...</span>
                    </div>
                )}
                <div className="grid sm:grid-cols-2 gap-4">
                     <Select onValueChange={handlePackageChange} disabled={packages.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('courseware.select_package')} />
                        </SelectTrigger>
                        <SelectContent>
                            {packages.map(pkg => (
                                <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Select onValueChange={handleUnitChange} disabled={!selectedPackage}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('courseware.select_unit')} />
                        </SelectTrigger>
                        <SelectContent>
                            {selectedPackage?.units.map(unit => (
                                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedUnit && (
                    <ScrollArea className="h-72 w-full rounded-md border p-2">
                        <div className="space-y-2">
                        {selectedUnit.activities.length > 0 ? selectedUnit.activities.map(activity => {
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
