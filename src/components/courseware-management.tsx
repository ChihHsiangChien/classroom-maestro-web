
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this activity. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Main Component
export function CoursewareManagement() {
  const { t } = useI18n();
  const { coursewares, addCourseware, deleteCourseware, updateCourseware, reorderActivities, addActivity, updateActivity, deleteActivity, loading } = useCourseware();
  const { toast } = useToast();

  const [isCoursewareDialogOpen, setCoursewareDialogOpen] = useState(false);
  const [editingCourseware, setEditingCourseware] = useState<Courseware | null>(null);
  const [newCoursewareName, setNewCoursewareName] = useState('');
  
  const [isActivityEditorOpen, setActivityEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [currentCoursewareId, setCurrentCoursewareId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent, courseware: Courseware) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = (courseware.activities || []).findIndex((a) => a.id === active.id);
      const newIndex = (courseware.activities || []).findIndex((a) => a.id === over.id);
      const newOrder = arrayMove(courseware.activities || [], oldIndex, newIndex);
      reorderActivities(courseware.id, newOrder);
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
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('courseware.my_packages')}</CardTitle>
          <Button onClick={() => handleOpenCoursewareDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            {t('courseware.create_package')}
          </Button>
        </CardHeader>
        <CardContent>
          {coursewares.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {coursewares.map((cw) => (
                <AccordionItem value={cw.id} key={cw.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex w-full items-center justify-between pr-4">
                        <span className="text-lg font-semibold">{cw.name}</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenCoursewareDialog(cw); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <div role="button" onClick={(e) => e.stopPropagation()} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8 text-destructive hover:text-destructive")}>
                                        <Trash2 className="h-4 w-4" />
                                    </div>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('courseware.delete_package_confirm_title')}</AlertDialogTitle>
                                        <AlertDialogDescription>{t('courseware.delete_package_confirm_description', { name: cw.name })}</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCourseware(cw.id)}>{t('common.delete')}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pl-4 pr-2 space-y-4">
                     <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, cw)}>
                        <SortableContext items={cw.activities || []} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {(cw.activities || []).map((activity) => (
                              <SortableActivityItem 
                                key={activity.id} 
                                activity={activity}
                                onEdit={() => handleOpenActivityEditor(cw.id, activity)}
                                onDelete={() => deleteActivity(cw.id, activity.id)}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                      {(!cw.activities || cw.activities.length === 0) && <p className="ml-4 mt-2 text-sm text-muted-foreground">{t('courseware.no_activities_in_unit')}</p>}

                    <div className="pt-2">
                        <Button variant="secondary" onClick={() => handleOpenActivityEditor(cw.id)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('courseware.add_activity')}
                        </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">{t('courseware.no_packages_title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('courseware.no_packages_description')}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle>{editingActivity ? t('courseware.activity_editor_title_edit') : t('courseware.activity_editor_title_add')}</DialogTitle></DialogHeader>
              <ActivityEditor 
                initialData={editingActivity || undefined} 
                onSave={handleSaveActivity} 
                onCancel={() => setActivityEditorOpen(false)} 
              />
          </DialogContent>
      </Dialog>
    </>
  );
}
