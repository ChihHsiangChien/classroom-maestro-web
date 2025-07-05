
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
import { Plus, Edit, Trash2, GripVertical, FileText, ChevronDown, CheckSquareIcon, Vote, ImageIcon, PencilRuler, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { useCourseware, type CoursewarePackage, type Unit, type Activity } from '@/contexts/courseware-context';
import type { QuestionData } from './create-poll-form';
import { useI18n } from '@/lib/i18n/provider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { ActivityEditor } from './activity-editor';
import { cn } from '@/lib/utils';

// Activity List for a Unit with Drag-and-Drop
function ActivityList({ unit, packageId }: { unit: Unit; packageId: string }) {
  const { t } = useI18n();
  const { reorderActivities, deleteActivity, updateActivity } = useCourseware();
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = unit.activities.findIndex((a) => a.id === active.id);
      const newIndex = unit.activities.findIndex((a) => a.id === over.id);
      const newOrder = arrayMove(unit.activities, oldIndex, newIndex);
      reorderActivities(packageId, unit.id, newOrder);
    }
  };

  const handleSaveActivity = (data: QuestionData) => {
    if (editingActivity) {
      updateActivity(packageId, unit.id, editingActivity.id, data);
      setEditingActivity(null);
    }
  };

  const activityIcons: { [key in QuestionData['type']]: React.ElementType } = {
    'true-false': CheckSquareIcon,
    'multiple-choice': Vote,
    'short-answer': FileText,
    'drawing': ImageIcon,
    'image-annotation': PencilRuler,
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={unit.activities} strategy={verticalListSortingStrategy}>
          <div className="ml-8 mt-2 space-y-2 border-l pl-4">
            {unit.activities.map((activity) => (
              <SortableActivityItem key={activity.id} activity={activity} icon={activityIcons[activity.type]}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingActivity(activity)}>
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
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteActivity(packageId, unit.id, activity.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </SortableActivityItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {unit.activities.length === 0 && <p className="ml-12 mt-2 text-sm text-muted-foreground">{t('courseware.no_activities_in_unit')}</p>}

      <Dialog open={!!editingActivity} onOpenChange={(open) => !open && setEditingActivity(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{t('courseware.edit_activity')}</DialogTitle></DialogHeader>
          {editingActivity && (
            <ActivityEditor
              initialData={editingActivity}
              onSave={handleSaveActivity}
              onCancel={() => setEditingActivity(null)}
              submitButtonText={t('common.save_changes')}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SortableActivityItem({ activity, icon: Icon, children }: { activity: Activity; icon: React.ElementType; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
      <Button variant="ghost" size="icon" className="cursor-grab active:cursor-grabbing h-7 w-7" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </Button>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="flex-grow truncate text-sm font-medium">{activity.question}</p>
      {children}
    </div>
  );
}

// Main Component
export function CoursewareManagement() {
  const { t } = useI18n();
  const { packages, addPackage, deletePackage, addUnit, deleteUnit, addActivity, loading } = useCourseware();
  const { toast } = useToast();

  const [isPackageDialogOpen, setPackageDialogOpen] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');

  const [isUnitDialogOpen, setUnitDialogOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [currentPackageId, setCurrentPackageId] = useState<string | null>(null);

  const [isActivityEditorOpen, setActivityEditorOpen] = useState(false);
  const [currentUnitId, setCurrentUnitId] = useState<string | null>(null);

  const handleAddPackage = async () => {
    if (newPackageName.trim()) {
      await addPackage(newPackageName.trim());
      toast({ title: t('courseware.toast_package_created') });
      setNewPackageName('');
      setPackageDialogOpen(false);
    }
  };

  const openUnitDialog = (packageId: string) => {
    setCurrentPackageId(packageId);
    setNewUnitName('');
    setUnitDialogOpen(true);
  };

  const handleAddUnit = async () => {
    if (newUnitName.trim() && currentPackageId) {
      await addUnit(currentPackageId, newUnitName.trim());
      toast({ title: t('courseware.toast_unit_created') });
      setNewUnitName('');
      setUnitDialogOpen(false);
      setCurrentPackageId(null);
    }
  };

  const openActivityEditor = (packageId: string, unitId: string) => {
    setCurrentPackageId(packageId);
    setCurrentUnitId(unitId);
    setActivityEditorOpen(true);
  };

  const handleAddActivity = async (data: QuestionData) => {
    if (currentPackageId && currentUnitId) {
      await addActivity(currentPackageId, currentUnitId, data);
      toast({ title: t('courseware.toast_activity_saved') });
      setActivityEditorOpen(false);
      setCurrentPackageId(null);
      setCurrentUnitId(null);
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
          <Button onClick={() => setPackageDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('courseware.create_package')}
          </Button>
        </CardHeader>
        <CardContent>
          {packages.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {packages.map((pkg) => (
                <AccordionItem value={pkg.id} key={pkg.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex w-full items-center justify-between pr-4">
                        <span className="text-lg font-semibold">{pkg.name}</span>
                        <AlertDialog>
                            <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-8 w-8 text-destructive hover:text-destructive")}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t('courseware.delete_package_confirm_title')}</AlertDialogTitle>
                                    <AlertDialogDescription>{t('courseware.delete_package_confirm_description', { name: pkg.name })}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePackage(pkg.id)}>{t('common.delete')}</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="space-y-4">
                        {pkg.units?.map((unit) => (
                           <Collapsible key={unit.id} defaultOpen>
                                <div className="flex items-center justify-between rounded-md p-2 hover:bg-muted/50">
                                    <div className="flex items-center gap-2">
                                         <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-0 data-[state=closed]:-rotate-90" />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <h4 className="font-semibold">{unit.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-1">
                                         <Button variant="outline" size="sm" onClick={() => openActivityEditor(pkg.id, unit.id)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('courseware.add_activity')}
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('courseware.delete_unit_confirm_title')}</AlertDialogTitle>
                                                    <AlertDialogDescription>{t('courseware.delete_unit_confirm_description', { name: unit.name })}</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteUnit(pkg.id, unit.id)}>{t('common.delete')}</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <CollapsibleContent>
                                    <ActivityList unit={unit} packageId={pkg.id} />
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                        <div className="pt-2 pl-4">
                            <Button variant="secondary" onClick={() => openUnitDialog(pkg.id)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('courseware.add_unit')}
                            </Button>
                        </div>
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

      {/* Dialogs for creating new items */}
      <Dialog open={isPackageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('courseware.create_package')}</DialogTitle></DialogHeader>
          <div className="py-4"><Label htmlFor="pkg-name">{t('courseware.package_name_label')}</Label><Input id="pkg-name" value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} placeholder={t('courseware.package_name_placeholder')} /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setPackageDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={handleAddPackage}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('courseware.add_unit')}</DialogTitle></DialogHeader>
          <div className="py-4"><Label htmlFor="unit-name">{t('courseware.unit_name_label')}</Label><Input id="unit-name" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder={t('courseware.unit_name_placeholder')} /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setUnitDialogOpen(false)}>{t('common.cancel')}</Button><Button onClick={handleAddUnit}>{t('common.save')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isActivityEditorOpen} onOpenChange={setActivityEditorOpen}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle>{t('courseware.activity_editor_title_add')}</DialogTitle></DialogHeader>
              <ActivityEditor onSave={handleAddActivity} onCancel={() => setActivityEditorOpen(false)} />
          </DialogContent>
      </Dialog>
    </>
  );
}
