
'use client';

import React, { useState } from 'react';
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
import { Plus, Edit, Trash2, GripVertical, FileText, CheckSquareIcon, Vote, ImageIcon, PencilRuler, Loader2 } from 'lucide-react';
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button, buttonVariants } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCourseware, type Courseware, type Activity } from '@/contexts/courseware-context';
import type { QuestionData } from './create-poll-form';
import { useI18n } from '@/lib/i18n/provider';
import { ActivityEditor } from './activity-editor';
import { cn } from '@/lib/utils';


function SortableActivityItem({ activity, onEdit, onDelete }: { activity: Activity; onEdit: () => void, onDelete: () => void }) {
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

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
      <Button variant="ghost" size="icon" className="cursor-grab active:cursor-grabbing h-7 w-7" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </Button>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="flex-grow truncate text-sm font-medium">{activity.question}</p>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
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
    </div>
  );
}


function SortableCoursewareItem({ 
  courseware,
  onEdit,
  onDelete,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onReorderActivities
}: {
  courseware: Courseware,
  onEdit: () => void,
  onDelete: () => void,
  onAddActivity: () => void,
  onEditActivity: (activity: Activity) => void,
  onDeleteActivity: (activityId: string) => void,
  onReorderActivities: (event: DragEndEvent) => void
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
                    <div role="button" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8")} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                        <Edit className="h-4 w-4" />
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <div role="button" onClick={(e) => e.stopPropagation()} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8 text-destructive hover:text-destructive")}>
                                <Trash2 className="h-4 w-4" />
                            </div>
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
                </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pl-4 pr-2 space-y-4">
              <DndContext sensors={activitySensors} collisionDetection={closestCenter} onDragEnd={onReorderActivities}>
                <SortableContext items={(courseware.activities || [])} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {(courseware.activities || []).map((activity) => (
                      <SortableActivityItem 
                        key={activity.id} 
                        activity={activity}
                        onEdit={() => onEditActivity(activity)}
                        onDelete={() => onDeleteActivity(activity.id)}
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
  const { coursewares, addCourseware, deleteCourseware, updateCourseware, reorderActivities, addActivity, updateActivity, deleteActivity, loading, reorderCoursewares } = useCourseware();
  const { toast } = useToast();

  const [isCoursewareDialogOpen, setCoursewareDialogOpen] = useState(false);
  const [editingCourseware, setEditingCourseware] = useState<Courseware | null>(null);
  const [newCoursewareName, setNewCoursewareName] = useState('');
  
  const [isActivityEditorOpen, setActivityEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [currentCoursewareId, setCurrentCoursewareId] = useState<string | null>(null);

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
            await addCourseware(newCoursewareName.trim());
            toast({ title: t('courseware.toast_package_created') });
        }
        setCoursewareDialogOpen(false);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteCourseware = async (coursewareId: string) => {
    await deleteCourseware(coursewareId);
  }

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

  if (loading) {
      return (
          <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <>
      <div className="container mx-auto max-w-5xl py-8">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-3xl font-bold">{t('courseware.title')}</h1>
                <p className="text-muted-foreground">{t('courseware.description')}</p>
            </div>
            <Button onClick={() => handleOpenCoursewareDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                {t('courseware.create_package')}
            </Button>
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
                        onEdit={() => handleOpenCoursewareDialog(cw)}
                        onDelete={() => handleDeleteCourseware(cw.id)}
                        onAddActivity={() => handleOpenActivityEditor(cw.id)}
                        onEditActivity={(activity) => handleOpenActivityEditor(cw.id, activity)}
                        onDeleteActivity={(activityId) => deleteActivity(cw.id, activityId)}
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
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
              <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
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
    </>
  );
}
