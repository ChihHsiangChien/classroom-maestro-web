
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Classroom } from '@/contexts/classroom-context';
import { useClassroom } from '@/contexts/classroom-context';
import { useI18n } from '@/lib/i18n/provider';
import { Plus, Edit, Trash2, Users, FileText, PlayCircle, MoreVertical, Download, Eraser, Loader2 } from 'lucide-react';

interface ClassListProps {
  onSelectClass: (classroom: Classroom) => void;
  onStartActivity: (classroom: Classroom) => void;
}

export function ClassList({ onSelectClass, onStartActivity }: ClassListProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { classrooms, addClassroom, updateClassroom, deleteClassroom, fetchAllSubmissions, deleteActivityHistory } = useClassroom();
  
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [currentClass, setCurrentClass] = useState<Classroom | null>(null);
  const [actionStates, setActionStates] = useState<{ [key: string]: { isLoading?: boolean } }>({});


  const handleAddClass = async () => {
    if (newClassName.trim()) {
      await addClassroom(newClassName.trim());
      toast({ title: t('dashboard.toast_class_created') });
      setAddDialogOpen(false);
      setNewClassName('');
    }
  };
  
  const handleUpdateClass = async () => {
    if (currentClass && currentClass.name.trim()) {
      await updateClassroom(currentClass.id, currentClass.name.trim());
      toast({ title: t('dashboard.toast_class_updated') });
      setEditDialogOpen(false);
      setCurrentClass(null);
    }
  };

  const handleDeleteClass = async (id: string) => {
      await deleteClassroom(id);
      toast({ variant: 'destructive', title: t('dashboard.toast_class_deleted') });
  };

  const openAddDialog = () => {
    setNewClassName('');
    setAddDialogOpen(true);
  };

  const openEditDialog = (classroom: Classroom) => {
    setCurrentClass({...classroom});
    setEditDialogOpen(true);
  };
  
  const handleDownloadHistory = async (classroom: Classroom) => {
    setActionStates(prev => ({ ...prev, [classroom.id]: { isLoading: true } }));
    toast({ title: t('dashboard.toast_history_download_start') });
    
    const submissions = await fetchAllSubmissions(classroom.id);

    if (submissions.length === 0) {
        toast({
            variant: 'destructive',
            title: t('dashboard.toast_history_download_no_data'),
        });
        setActionStates(prev => ({ ...prev, [classroom.id]: { isLoading: false } }));
        return;
    }

    try {
        const dataStr = JSON.stringify(submissions, (key, value) => {
            if (value && value.seconds !== undefined && value.nanoseconds !== undefined) {
                return new Date(value.seconds * 1000).toISOString();
            }
            return value;
        }, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeClassName = classroom.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `activity_history_${safeClassName}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download failed:", error);
        toast({
            variant: 'destructive',
            title: t('dashboard.toast_history_download_error'),
        });
    } finally {
        setActionStates(prev => ({ ...prev, [classroom.id]: { isLoading: false } }));
    }
  };

  const handleDeleteHistory = async (classroomId: string) => {
      await deleteActivityHistory(classroomId);
  };

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.select_class')}</h1>
          <p className="text-muted-foreground">{t('dashboard.select_class_description')}</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('dashboard.add_class')}
        </Button>
      </div>

      {classrooms.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex-1 pr-2">
                  <CardTitle className="truncate">{c.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 pt-1">
                    <Users className="h-4 w-4" />
                    <span>{t('dashboard.student_count', { count: c.students.length })}</span>
                  </CardDescription>
                </div>
                
                <AlertDialog>
                  <Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('dashboard.actions_menu_tooltip')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => openEditDialog(c)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>{t('dashboard.edit_class')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onSelectClass(c)}>
                          <Users className="mr-2 h-4 w-4" />
                          <span>{t('dashboard.edit_students_list')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDownloadHistory(c)} disabled={actionStates[c.id]?.isLoading}>
                          {actionStates[c.id]?.isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          <span>{t('dashboard.download_history_button')}</span>
                        </DropdownMenuItem>
                        
                        <AlertDialogTrigger asChild>
                           <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Eraser className="mr-2 h-4 w-4" />
                              <span>{t('dashboard.delete_history_button')}</span>
                           </DropdownMenuItem>
                        </AlertDialogTrigger>
                        
                        <DropdownMenuSeparator />

                         <AlertDialogTrigger asChild>
                           <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>{t('dashboard.delete_class')}</span>
                           </DropdownMenuItem>
                         </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* This is the content for the "Delete History" dialog */}
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('dashboard.delete_history_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('dashboard.delete_history_confirm_description', {name: c.name})}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteHistory(c.id)}>{t('common.delete')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>

                  </Dialog>
                  
                  {/* This is the content for the "Delete Class" dialog */}
                   <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('dashboard.delete_class_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('dashboard.delete_class_confirm_description', {name: c.name})}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteClass(c.id)}>{t('common.delete')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>

                </AlertDialog>

              </CardHeader>
              <CardContent className="flex-grow" />
              <CardFooter className="flex justify-end">
                <Button onClick={() => onStartActivity(c)}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {t('dashboard.start_activity')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t('dashboard.no_classes')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.no_classes_description')}</p>
        </div>
      )}

      {/* Add/Edit Dialogs */}
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('dashboard.add_class')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">{t('dashboard.class_name_label')}</Label>
            <Input id="name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder={t('dashboard.class_name_placeholder')} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleAddClass}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('dashboard.edit_class')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="name">{t('dashboard.class_name_label')}</Label>
            <Input id="name" value={currentClass?.name || ''} onChange={(e) => setCurrentClass(c => c ? {...c, name: e.target.value} : null)} placeholder={t('dashboard.class_name_placeholder')} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleUpdateClass}>{t('common.save_changes')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
