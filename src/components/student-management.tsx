
"use client";

import { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit,
  Upload,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { useClassroom, type Classroom, type Student } from '@/contexts/classroom-context';
import { useI18n } from '@/lib/i18n/provider';
import { StudentImporter } from './student-importer';

export type { Submission } from '@/contexts/classroom-context';

interface StudentManagementProps {
  classroom: Classroom;
}

export function StudentManagement({ classroom }: StudentManagementProps) {
  const { t } = useI18n();
  const { addStudent, updateStudent, deleteStudent, importStudents } = useClassroom();
  const [newStudentName, setNewStudentName] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleFirestoreError = (error: any, action: 'add' | 'update' | 'delete' | 'import') => {
    console.error(`Error ${action}ing student(s):`, error);
    if (error.message === 'firestore-permission-denied') {
      toast({
        variant: "destructive",
        duration: 10000,
        title: t('firebase.firestore_permission_denied_title'),
        description: (
            <div>
              <p>{t('firebase.firestore_permission_denied_description')}</p>
              <a 
                href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore/rules`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold underline text-destructive-foreground"
              >
                {t('firebase.firestore_permission_denied_button')}
              </a>
            </div>
        )
      });
    } else {
        toast({
            variant: "destructive",
            title: t('common.error'),
            description: `Could not ${action} student(s). Please try again.`
        });
    }
  }

  const handleAdd = async () => {
    if (newStudentName.trim()) {
      try {
        const name = newStudentName.trim();
        await addStudent(classroom.id, name);
        setNewStudentName('');
        setAddDialogOpen(false);
        toast({ 
          title: t('studentManagement.toast_student_added_title'), 
          description: t('studentManagement.toast_student_added_description', { name }) 
        });
      } catch (error) {
        handleFirestoreError(error, 'add');
      }
    }
  };

  const handleUpdate = async () => {
    if (editingStudent && editingStudent.name.trim()) {
      try {
        await updateStudent(classroom.id, editingStudent.id, editingStudent.name.trim());
        setEditingStudent(null);
        setEditDialogOpen(false);
        toast({ 
          title: t('studentManagement.toast_student_updated_title'), 
          description: t('studentManagement.toast_student_updated_description') 
        });
      } catch (error) {
        handleFirestoreError(error, 'update');
      }
    }
  };

  const handleDelete = async (studentId: string) => {
    try {
      await deleteStudent(classroom.id, studentId);
      const studentName = classroom.students.find(s => s.id === studentId)?.name || 'The student';
      toast({
          variant: "destructive",
          title: t('studentManagement.toast_student_deleted_title'),
          description: t('studentManagement.toast_student_deleted_description', { name: studentName }),
      });
    } catch (error) {
      handleFirestoreError(error, 'delete');
    }
  }

  const startEditing = (student: Student) => {
    setEditingStudent({ ...student });
    setEditDialogOpen(true);
  };
  
  const handleImport = async (names: string[]) => {
    try {
      await importStudents(classroom.id, names);
      setImportDialogOpen(false);
      toast({
          title: t('dashboard.toast_students_imported_title'),
          description: t('dashboard.toast_students_imported_description', {count: names.length}),
      });
    } catch (error) {
      handleFirestoreError(error, 'import');
    }
  }

  return (
    <>
      <Card className="shadow-md">
        <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{t('studentManagement.roster_card_title')}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Users className="h-4 w-4" />
                {t('teacherDashboard.responses_count', { submissionsCount: classroom.students.length, studentsCount: classroom.students.length })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('dashboard.import_students')}
                </Button>
                <Button onClick={() => setAddDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {t('studentManagement.add_student_button')}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <StudentTable
            students={classroom.students}
            onEdit={startEditing}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
      
      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('studentManagement.add_student_dialog_title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">{t('studentManagement.add_student_name_label')}</Label>
              <Input id="name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleAdd}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('studentManagement.edit_student_dialog_title')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">{t('studentManagement.add_student_name_label')}</Label>
                    <Input id="edit-name" value={editingStudent?.name || ''} onChange={(e) => setEditingStudent(s => s ? {...s, name: e.target.value} : null)} className="col-span-3" />
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button></DialogClose>
                <Button onClick={handleUpdate}>{t('common.save_changes')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('dashboard.import_students')}</DialogTitle>
                <DialogDescription>{t('dashboard.import_students_description')}</DialogDescription>
            </DialogHeader>
            <StudentImporter onImport={handleImport} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function StudentTable({ students, onEdit, onDelete }: { students: Student[], onEdit: (s: Student) => void, onDelete: (id: string) => void }) {
    const { t } = useI18n();

    if (students.length === 0) {
        return <div className="text-center text-sm text-muted-foreground p-8 border-2 border-dashed rounded-lg">{t('studentManagement.no_students_logged_in_message')}</div>
    }
    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('studentManagement.table_header_name')}</TableHead>
                        <TableHead className="text-right w-[120px]">{t('studentManagement.table_header_actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {students.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(student)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <DeleteStudentButton student={student} onDelete={onDelete} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

function DeleteStudentButton({ student, onDelete }: { student: Student, onDelete: (id: string) => void}) {
    const { t } = useI18n();
    
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('studentManagement.delete_student_alert_title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('studentManagement.delete_student_alert_description', { name: student.name })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(student.id)} className="bg-destructive hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
