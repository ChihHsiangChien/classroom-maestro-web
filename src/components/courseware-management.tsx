
"use client";

import React, { useState, useTransition } from 'react';
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
import { Plus, Edit, Trash2, GripVertical, FileText, CheckSquareIcon, Vote, ImageIcon, PencilRuler, Loader2, MoreVertical, Copy, ArrowRightLeft, Wand2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button, buttonVariants } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCourseware, type Courseware, type Activity } from '@/contexts/courseware-context';
import type { QuestionData } from './create-poll-form';
import { useI18n } from '@/lib/i18n/provider';
import { ActivityEditor } from './activity-editor';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { generateQuestionsFromTextAction } from '@/app/actions';
import { useUsage } from '@/contexts/usage-context';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


function SortableActivityItem({
  activity,
  allCoursewares,
  currentCoursewareId,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
}: {
  activity: Activity;
  allCoursewares: Courseware[];
  currentCoursewareId: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (destinationId: string) => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  
  const activityIcons: { [key in QuestionData['type']]: React.ElementType } = {
    'true-false': CheckSquareIcon,
    'multiple-choice': Vote,
    'short-answer': FileText,
    'drawing': ImageIcon,
    'image-annotation': PencilRuler,
  };
  const Icon = activityIcons[activity.type];
  const otherCoursewares = allCoursewares.filter(cw => cw.id !== currentCoursewareId);


  return (
    <div ref={setNodeRef} style={style} className="group flex items-center gap-2 rounded-md bg-muted/50 p-2">
      <Button variant="ghost" size="icon" className="h-7 w-7 cursor-grab active:cursor-grabbing flex-shrink-0" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </Button>
      <div role="button" onClick={onEdit} className="flex flex-grow items-center gap-2 cursor-pointer overflow-hidden">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <p className="truncate text-sm font-medium">{activity.question}</p>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 h-4 w-4" /><span>{t('common.edit')}</span></DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}><Copy className="mr-2 h-4 w-4" /><span>{t('courseware.duplicate')}</span></DropdownMenuItem>
            
            <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={otherCoursewares.length === 0}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    <span>{t('courseware.move_to')}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        {otherCoursewares.length > 0 ? (
                            otherCoursewares.map(cw => (
                                <DropdownMenuItem key={cw.id} onSelect={() => onMove(cw.id)}>
                                    {cw.name}
                                </DropdownMenuItem>
                            ))
                        ) : (
                            <DropdownMenuItem disabled>{t('courseware.no_other_packages')}</DropdownMenuItem>
                        )}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>{t('common.delete')}</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('courseware.delete_activity_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('courseware.delete_activity_confirm_description')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}


function SortableCoursewareItem({ 
  courseware,
  allCoursewares,
  onEdit,
  onDelete,
  onDuplicate,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onDuplicateActivity,
  onMoveActivity,
  onReorderActivities,
}: {
  courseware: Courseware,
  allCoursewares: Courseware[],
  onEdit: () => void,
  onDelete: () => void,
  onDuplicate: () => void;
  onAddActivity: () => void,
  onEditActivity: (activity: Activity) => void,
  onDeleteActivity: (activityId: string) => void,
  onDuplicateActivity: (coursewareId: string, activityId: string) => void;
  onMoveActivity: (sourceId: string, destId: string, activityId: string) => void;
  onReorderActivities: (event: DragEndEvent) => void,
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: courseware.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const activitySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={courseware.id} className="bg-card">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex w-full items-center justify-between pr-4">
                <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "cursor-grab active:cursor-grabbing h-8 w-8")}>
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <span className="text-lg font-semibold">{courseware.name}</span>
                </div>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div role="button" onClick={(e) => e.stopPropagation()} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8")}>
                                <MoreVertical className="h-4 w-4" />
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={onEdit}><Edit className="mr-2 h-4 w-4" /><span>{t('common.edit')}</span></DropdownMenuItem>
                            <DropdownMenuItem onSelect={onDuplicate}><Copy className="mr-2 h-4 w-4" /><span>{t('courseware.duplicate')}</span></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="mr-2 h-4 w-4" /><span>{t('common.delete')}</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('courseware.delete_package_confirm_title')}</AlertDialogTitle>
                                        <AlertDialogDescription>{t('courseware.delete_package_confirm_description', { name: courseware.name })}</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={onDelete}>{t('common.delete')}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2 pl-4 pr-2">
              <DndContext sensors={activitySensors} collisionDetection={closestCenter} onDragEnd={onReorderActivities}>
                <SortableContext items={(courseware.activities || [])} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {(courseware.activities || []).map((activity) => (
                      <SortableActivityItem 
                        key={activity.id} 
                        activity={activity}
                        allCoursewares={allCoursewares}
                        currentCoursewareId={courseware.id}
                        onEdit={() => onEditActivity(activity)}
                        onDelete={() => onDeleteActivity(activity.id)}
                        onDuplicate={() => onDuplicateActivity(courseware.id, activity.id)}
                        onMove={(destinationId) => onMoveActivity(courseware.id, destinationId, activity.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {(!courseware.activities || courseware.activities.length === 0) && <p className="ml-4 mt-2 text-sm text-muted-foreground">{t('courseware.no_activities_in_unit')}</p>}

            <div className="pt-2">
                <Button variant="secondary" onClick={onAddActivity}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('courseware.add_activity')}
                </Button>
            </div>
          </AccordionContent>
      </AccordionItem>
    </div>
  )
}


// Main Component
export function CoursewareManagement() {
  const { t } = useI18n();
  const { coursewares, addCourseware, deleteCourseware, updateCourseware, reorderActivities, addActivity, updateActivity, deleteActivity, loading, reorderCoursewares, duplicateCourseware, duplicateActivity, moveActivity, addMultipleActivities } = useCourseware();
  const { toast } = useToast();
  const { logAiUsage } = useUsage();

  const [isCoursewareDialogOpen, setCoursewareDialogOpen] = useState(false);
  const [editingCourseware, setEditingCourseware] = useState<Courseware | null>(null);
  const [newCoursewareName, setNewCoursewareName] = useState('');
  
  const [isActivityEditorOpen, setActivityEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [currentCoursewareId, setCurrentCoursewareId] = useState<string | null>(null);
  
  const [isGenerateQuestionsDialogOpen, setGenerateQuestionsDialogOpen] = useState(false);
  const [textContext, setTextContext] = useState("");
  const [targetCoursewareId, setTargetCoursewareId] = useState<string | null>(null);
  const [isGeneratingQuestions, startQuestionGenTransition] = useTransition();
  const [creationMode, setCreationMode] = useState<'existing' | 'new'>('existing');
  const [newCoursewareNameForGen, setNewCoursewareNameForGen] = useState('');
  const [numMultipleChoice, setNumMultipleChoice] = useState(2);
  const [numTrueFalse, setNumTrueFalse] = useState(2);


  const [isSaving, setIsSaving] = useState(false);

  const coursewareSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleActivityDragEnd = (event: DragEndEvent, courseware: Courseware) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = (courseware.activities || []).findIndex((a) => a.id === active.id);
      const newIndex = (courseware.activities || []).findIndex((a) => a.id === over.id);
      const newOrder = arrayMove(courseware.activities || [], oldIndex, newIndex);
      reorderActivities(courseware.id, newOrder);
    }
  };

  const handleCoursewareDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = coursewares.findIndex((c) => c.id === active.id);
      const newIndex = coursewares.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(coursewares, oldIndex, newIndex);
          reorderCoursewares(newOrder);
      }
    }
  };

  const handleOpenCoursewareDialog = (courseware?: Courseware) => {
    if (courseware) {
        setEditingCourseware(courseware);
        setNewCoursewareName(courseware.name);
    } else {
        setEditingCourseware(null);
        setNewCoursewareName('');
    }
    setCoursewareDialogOpen(true);
  }

  const handleSaveCourseware = async () => {
    if (isSaving || !newCoursewareName.trim()) return;
    setIsSaving(true);
    try {
        if (editingCourseware) {
            await updateCourseware(editingCourseware.id, newCoursewareName.trim());
            toast({ title: t('courseware.toast_package_updated')});
        } else {
            const newId = await addCourseware(newCoursewareName.trim());
            if (newId) {
                toast({ title: t('courseware.toast_package_created') });
            }
        }
        setCoursewareDialogOpen(false);
    } finally {
        setIsSaving(false);
    }
  };

  const handleOpenActivityEditor = (coursewareId: string, activity?: Activity) => {
    setCurrentCoursewareId(coursewareId);
    setEditingActivity(activity || null);
    setActivityEditorOpen(true);
  }

  const handleSaveActivity = async (data: QuestionData) => {
    if (!currentCoursewareId || isSaving) return;
    setIsSaving(true);

    try {
        if (editingActivity) {
            await updateActivity(currentCoursewareId, editingActivity.id, data);
        } else {
            await addActivity(currentCoursewareId, data);
        }
        setActivityEditorOpen(false);
    } finally {
        setIsSaving(false);
    }
  };

  const handleGenerateQuestions = async () => {
    let finalCoursewareId = targetCoursewareId;

    if (creationMode === 'new') {
        if (!newCoursewareNameForGen.trim()) {
            toast({ variant: "destructive", title: t('common.error'), description: t('courseware.package_name_empty_error') });
            return;
        }
        const newId = await addCourseware(newCoursewareNameForGen.trim());
        if (!newId) return; // Error is handled in context
        finalCoursewareId = newId;
    }
    
    if (!finalCoursewareId) {
        toast({ variant: "destructive", title: t('common.error'), description: t('courseware.toast_no_courseware_selected') });
        return;
    }

    startQuestionGenTransition(async () => {
        const result = await generateQuestionsFromTextAction({
            context: textContext,
            numMultipleChoice,
            numTrueFalse
        });
        if (result.questions && result.questions.length > 0) {
            await addMultipleActivities(finalCoursewareId!, result.questions);
            const targetCoursewareName = coursewares.find(c => c.id === finalCoursewareId)?.name || newCoursewareNameForGen;
            toast({ 
                title: t('courseware.toast_questions_generated_title'),
                description: t('courseware.toast_questions_generated_description', { count: result.questions.length, name: targetCoursewareName }) 
            });
            setGenerateQuestionsDialogOpen(false);
            logAiUsage('generateQuestionsFromText');
        } else {
            toast({ variant: "destructive", title: t('common.error'), description: result.error || 'Failed to generate questions.' });
        }
    });
  };

  const resetGenerateQuestionsDialog = () => {
    setTextContext('');
    setTargetCoursewareId(null);
    setCreationMode('existing');
    setNewCoursewareNameForGen('');
    setNumMultipleChoice(2);
    setNumTrueFalse(2);
  };


  if (loading) {
      return (
          <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <>
      <div className="container mx-auto max-w-5xl py-8">
        <div className="mb-6 flex items-center justify-between gap-2 flex-wrap">
            <div>
                <h1 className="text-3xl font-bold">{t('courseware.title')}</h1>
                <p className="text-muted-foreground">{t('courseware.description')}</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setGenerateQuestionsDialogOpen(true)}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {t('courseware.generate_from_text')}
                </Button>
                <Button onClick={() => handleOpenCoursewareDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('courseware.create_package')}
                </Button>
            </div>
        </div>
        <Card>
            <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t('courseware.my_packages')}</CardTitle>
            </CardHeader>
            <CardContent>
            {coursewares.length > 0 ? (
                <DndContext sensors={coursewareSensors} collisionDetection={closestCenter} onDragEnd={handleCoursewareDragEnd}>
                <SortableContext items={coursewares} strategy={verticalListSortingStrategy}>
                    <Accordion type="single" collapsible className="w-full">
                    {coursewares.map((cw) => (
                        <SortableCoursewareItem
                            key={cw.id}
                            courseware={cw}
                            allCoursewares={coursewares}
                            onEdit={() => handleOpenCoursewareDialog(cw)}
                            onDelete={() => deleteCourseware(cw.id)}
                            onDuplicate={() => duplicateCourseware(cw.id)}
                            onAddActivity={() => handleOpenActivityEditor(cw.id)}
                            onEditActivity={(activity) => handleOpenActivityEditor(cw.id, activity)}
                            onDeleteActivity={(activityId) => deleteActivity(cw.id, activityId)}
                            onDuplicateActivity={duplicateActivity}
                            onMoveActivity={moveActivity}
                            onReorderActivities={(event) => handleActivityDragEnd(event, cw)}
                        />
                    ))}
                    </Accordion>
                </SortableContext>
                </DndContext>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">{t('courseware.no_packages_title')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('courseware.no_packages_description')}</p>
                </div>
            )}
            </CardContent>
        </Card>
      </div>

      <Dialog open={isCoursewareDialogOpen} onOpenChange={setCoursewareDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCourseware ? t('courseware.edit_package') : t('courseware.create_package')}</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label htmlFor="pkg-name">{t('courseware.package_name_label')}</Label>
            <Input id="pkg-name" value={newCoursewareName} onChange={(e) => setNewCoursewareName(e.target.value)} placeholder={t('courseware.package_name_placeholder')} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCoursewareDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSaveCourseware} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isActivityEditorOpen} onOpenChange={(open) => { if (!open) setActivityEditorOpen(false)}}>
          <DialogContent className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col p-0">
              <DialogHeader className="flex-shrink-0 border-b p-6 pb-4">
                <DialogTitle>{editingActivity ? t('courseware.activity_editor_title_edit') : t('courseware.activity_editor_title_add')}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6">
                  <ActivityEditor 
                    initialData={editingActivity || undefined} 
                    onSave={handleSaveActivity} 
                    onCancel={() => setActivityEditorOpen(false)}
                    submitButtonText={editingActivity ? t('common.save_changes') : t('common.save')}
                  />
              </div>
          </DialogContent>
      </Dialog>
      
      <Dialog open={isGenerateQuestionsDialogOpen} onOpenChange={(isOpen) => {
          setGenerateQuestionsDialogOpen(isOpen);
          if (!isOpen) resetGenerateQuestionsDialog();
      }}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{t('courseware.generate_from_text')}</DialogTitle>
                <DialogDescription>{t('courseware.generate_from_text_description')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                    <Label htmlFor="text-context">{t('courseware.paste_content_label')}</Label>
                    <Textarea 
                        id="text-context" 
                        placeholder={t('courseware.paste_content_placeholder')}
                        value={textContext}
                        onChange={(e) => setTextContext(e.target.value)}
                        rows={8}
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="num-mc">{t('courseware.num_multiple_choice_label')}</Label>
                        <Input
                            id="num-mc"
                            type="number"
                            value={numMultipleChoice}
                            onChange={(e) => setNumMultipleChoice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            min="0"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="num-tf">{t('courseware.num_true_false_label')}</Label>
                        <Input
                            id="num-tf"
                            type="number"
                            value={numTrueFalse}
                            onChange={(e) => setNumTrueFalse(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            min="0"
                        />
                    </div>
                </div>
                <div className="grid gap-4">
                    <Label>{t('courseware.add_to_courseware_label')}</Label>
                    <RadioGroup value={creationMode} onValueChange={(value) => setCreationMode(value as 'existing' | 'new')}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="existing" id="r1" />
                            <Label htmlFor="r1">{t('courseware.add_to_existing_option')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new" id="r2" />
                            <Label htmlFor="r2">{t('courseware.create_new_courseware_option')}</Label>
                        </div>
                    </RadioGroup>
                </div>
                {creationMode === 'existing' ? (
                    <Select onValueChange={setTargetCoursewareId} disabled={coursewares.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('courseware.select_courseware_placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            {coursewares.map(cw => (
                                <SelectItem key={cw.id} value={cw.id}>{cw.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Input 
                        placeholder={t('courseware.new_courseware_name_label')}
                        value={newCoursewareNameForGen}
                        onChange={(e) => setNewCoursewareNameForGen(e.target.value)}
                    />
                )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setGenerateQuestionsDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button 
                  onClick={handleGenerateQuestions} 
                  disabled={isGeneratingQuestions || !textContext || (numMultipleChoice + numTrueFalse === 0) || (creationMode === 'existing' && !targetCoursewareId) || (creationMode === 'new' && !newCoursewareNameForGen.trim())}
                >
                  {isGeneratingQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {isGeneratingQuestions ? t('courseware.generating_questions') : t('courseware.generate_questions_button')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
