
'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
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
  DialogDescription,
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
import type { Classroom, Submission } from '@/contexts/classroom-context';
import { useClassroom } from '@/contexts/classroom-context';
import { useI18n } from '@/lib/i18n/provider';
import { Plus, Edit, Trash2, Users, FileText, PlayCircle, MoreVertical, Download, Eraser, Loader2, FileJson, FileArchive } from 'lucide-react';

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
  const [isDownloadDialogOpen, setDownloadDialogOpen] = useState(false);
  
  const [newClassName, setNewClassName] = useState('');
  const [currentClass, setCurrentClass] = useState<Classroom | null>(null);
  const [actionStates, setActionStates] = useState<{ [key: string]: { isLoading?: boolean } }>({});


  const handleAddClass = async () => {
    if (newClassName.trim()) {
      await addClassroom(newClassName.trim());
      toast({ title: t('dashboard.toast_class_created_title'), description: t('dashboard.toast_class_created_description') });
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
  
  const openDownloadDialog = (classroom: Classroom) => {
    setCurrentClass(classroom);
    setDownloadDialogOpen(true);
  };
  
  const handleDownloadJson = async (classroom: Classroom) => {
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
        setDownloadDialogOpen(false);
        setCurrentClass(null);
    }
  };
  
  const handleDownloadCsvAndZip = async (classroom: Classroom) => {
    setActionStates(prev => ({ ...prev, [classroom.id]: { isLoading: true } }));
    toast({ title: t('dashboard.toast_history_preparing_zip') });

    const submissions = await fetchAllSubmissions(classroom.id);

    if (submissions.length === 0) {
        toast({ variant: 'destructive', title: t('dashboard.toast_history_download_no_data') });
        setActionStates(prev => ({ ...prev, [classroom.id]: { isLoading: false } }));
        return;
    }

    const formatTimestamp = (timestamp: Timestamp | null): string => {
        if (!timestamp) return '';
        try {
            return format(timestamp.toDate(), 'yyyy-MM-dd_HHmm');
        } catch (e) {
            console.error("Error formatting timestamp:", e);
            return '';
        }
    };

    try {
        const zip = new JSZip();
        
        const isDataUrl = (s: string) => typeof s === 'string' && s.startsWith('data:image');

        const imageSubmissions = submissions.filter(s => isDataUrl(s.answer as string));
        const textSubmissions = submissions.filter(s => !isDataUrl(s.answer as string));

        // Handle CSV pivoting and encoding
        if (textSubmissions.length > 0) {
            const studentAnswers: Map<string, Map<string, string>> = new Map();
            const questionIdToInfo: Map<string, { text: string; timestamp: Timestamp | null }> = new Map();

            textSubmissions.forEach(sub => {
                if (!studentAnswers.has(sub.studentName)) {
                    studentAnswers.set(sub.studentName, new Map());
                }
                const answerText = Array.isArray(sub.answer) ? sub.answer.join('; ') : String(sub.answer);
                studentAnswers.get(sub.studentName)!.set(sub.questionId, answerText);
                
                if (!questionIdToInfo.has(sub.questionId)) {
                    questionIdToInfo.set(sub.questionId, {
                      text: sub.questionText || sub.questionId,
                      timestamp: sub.timestamp || null
                    });
                }
            });

            const sortedQuestionIds = Array.from(questionIdToInfo.keys()).sort();
            
            const escapeCsv = (val: any): string => {
                if (val === undefined || val === null) return '';
                let str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    str = `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            
            const headers = ['studentName', ...sortedQuestionIds.map(id => {
                const info = questionIdToInfo.get(id);
                if (!info) return id;
                const timestampSuffix = formatTimestamp(info.timestamp);
                const headerText = info.text || id;
                return timestampSuffix ? `${headerText}_${timestampSuffix}` : headerText;
            })];
            
            const studentNames = Array.from(studentAnswers.keys()).sort();
            const csvRows = studentNames.map(name => {
                const row = [name];
                const answers = studentAnswers.get(name)!;
                sortedQuestionIds.forEach(qId => {
                    row.push(answers.get(qId) || '');
                });
                return row.map(escapeCsv).join(',');
            });

            // Prepend BOM for Excel compatibility with UTF-8
            const csvData = '\uFEFF' + [headers.map(escapeCsv).join(','), ...csvRows].join('\n');
            zip.file('submissions.csv', csvData);
        }

        // Handle image submissions with folder structure and improved filenames
        if (imageSubmissions.length > 0) {
            const imagesRootFolder = zip.folder("images");
            if (imagesRootFolder) {
                const submissionsByQuestion: { [key: string]: Submission[] } = {};
                imageSubmissions.forEach(sub => {
                    if (!submissionsByQuestion[sub.questionId]) {
                        submissionsByQuestion[sub.questionId] = [];
                    }
                    submissionsByQuestion[sub.questionId].push(sub);
                });

                Object.values(submissionsByQuestion).forEach((subs) => {
                    const firstSub = subs[0];
                    const questionText = firstSub.questionText || firstSub.questionId;
                    const timestampSuffix = formatTimestamp(firstSub.timestamp);
                    
                    let folderName = questionText.replace(/[\\/:"*?<>|]/g, '_').substring(0, 80);
                    if (timestampSuffix) {
                        folderName = `${folderName}_${timestampSuffix}`;
                    }
                    
                    const questionFolder = imagesRootFolder.folder(folderName);
                    const nameCounts = new Map<string, number>();

                    if (questionFolder) {
                        subs.forEach(s => {
                            const answer = s.answer as string;
                            const base64Data = answer.substring(answer.indexOf(',') + 1);
                            
                            const safeStudentName = s.studentName.replace(/[\\/:"*?<>|]/g, '_');
                            
                            // Handle potential filename collisions for students with the same name
                            const currentCount = nameCounts.get(safeStudentName) || 0;
                            const filename = currentCount > 0 
                                ? `${safeStudentName}(${currentCount + 1}).png` 
                                : `${safeStudentName}.png`;
                            nameCounts.set(safeStudentName, currentCount + 1);
                            
                            questionFolder.file(filename, base64Data, { base64: true });
                        });
                    }
                });
            }
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        const safeClassName = classroom.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `activity_history_${safeClassName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error("Download failed:", error);
        toast({ variant: 'destructive', title: t('dashboard.toast_history_download_error') });
    } finally {
        setActionStates(prev => ({ ...prev, [classroom.id]: { isLoading: false } }));
        setDownloadDialogOpen(false);
        setCurrentClass(null);
    }
  };

  const handleDeleteHistory = async (classroomId: string) => {
      await deleteActivityHistory(classroomId);
  };

  return (
    <>
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
                      <DropdownMenuItem onSelect={() => openDownloadDialog(c)} disabled={actionStates[c.id]?.isLoading}>
                        {actionStates[c.id]?.isLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        <span>{t('dashboard.download_history_button')}</span>
                      </DropdownMenuItem>
                      
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eraser className="mr-2 h-4 w-4" />
                                  <span>{t('dashboard.delete_history_button')}</span>
                              </DropdownMenuItem>
                          </AlertDialogTrigger>
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
                      </AlertDialog>
                      
                      <DropdownMenuSeparator />

                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>{t('dashboard.delete_class')}</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
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

                    </DropdownMenuContent>
                  </DropdownMenu>

                </CardHeader>
                <CardContent className="flex-grow" />
                <CardFooter className="flex justify-end">
                  <Button onClick={() => onStartActivity(c)} disabled={c.students.length === 0}>
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
      </div>

      {/* Add Class Dialog */}
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
      
      {/* Edit Class Dialog */}
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
      
      {/* Download History Dialog */}
      <Dialog open={isDownloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('dashboard.download_history_dialog_title')}</DialogTitle>
                <DialogDescription>{t('dashboard.download_history_dialog_description')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Button variant="outline" className="h-auto justify-start" onClick={() => handleDownloadJson(currentClass!)} disabled={actionStates[currentClass?.id || '']?.isLoading}>
                    <FileJson className="mr-4 h-6 w-6 text-primary" />
                    <div className="text-left">
                        <p className="font-semibold">{t('dashboard.download_format_json_button')}</p>
                        <p className="text-xs text-muted-foreground">{t('dashboard.download_format_json_description')}</p>
                    </div>
                </Button>
                <Button variant="outline" className="h-auto justify-start" onClick={() => handleDownloadCsvAndZip(currentClass!)} disabled={actionStates[currentClass?.id || '']?.isLoading}>
                    <FileArchive className="mr-4 h-6 w-6 text-primary" />
                     <div className="text-left">
                        <p className="font-semibold">{t('dashboard.download_format_csv_zip_button')}</p>
                        <p className="text-xs text-muted-foreground">{t('dashboard.download_format_csv_zip_description')}</p>
                    </div>
                </Button>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">{t('common.close')}</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
