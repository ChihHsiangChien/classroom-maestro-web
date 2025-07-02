
"use client";

import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit,
  LogOut,
  Copy,
  Check,
  ChevronDown,
  Ticket,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

export type Student = {
  id: number;
  name: string;
  isFocused?: boolean;
};

export interface Submission {
  studentId: number;
  studentName: string;
  answer: string | string[];
}

interface StudentManagementProps {
  students: Student[];
  loggedInStudents: Student[];
  onAddStudent: (name: string) => void;
  onUpdateStudent: (id: number, name: string) => void;
  onDeleteStudent: (id: number) => void;
  onKickStudent: (id: number) => void;
  onStudentLogin: (student: Student) => void; // Mock
  onToggleStudentFocus: (id: number) => void; // Mock
  onPickStudent: () => void;
  isManagementOpen: boolean;
  onManagementToggle: (isOpen: boolean) => void;
  isRosterOpen: boolean;
  onRosterToggle: (isOpen: boolean) => void;
}

export function StudentManagement({
  students,
  loggedInStudents,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onKickStudent,
  onStudentLogin,
  onToggleStudentFocus,
  onPickStudent,
  isManagementOpen,
  onManagementToggle,
  isRosterOpen,
  onRosterToggle,
}: StudentManagementProps) {
  const [classroomUrl, setClassroomUrl] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  const notLoggedInStudents = students.filter(
    (s) => !loggedInStudents.find((ls) => ls.id === s.id)
  );

  useEffect(() => {
    // This ensures window is defined, preventing SSR errors, and sets isClient to true.
    setClassroomUrl(`${window.location.origin}/join`);
    setIsClient(true);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(classroomUrl);
    setHasCopied(true);
    toast({ title: 'Copied to clipboard!', description: 'You can now share the link with your students.' });
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleAdd = () => {
    if (newStudentName.trim()) {
      onAddStudent(newStudentName.trim());
      setNewStudentName('');
      setAddDialogOpen(false);
      toast({ title: 'Student Added', description: `${newStudentName} has been added to the roster.` });
    }
  };

  const handleUpdate = () => {
    if (editingStudent && editingStudent.name.trim()) {
      onUpdateStudent(editingStudent.id, editingStudent.name.trim());
      setEditingStudent(null);
      setEditDialogOpen(false);
      toast({ title: 'Student Updated', description: 'The student record has been updated.' });
    }
  };

  const startEditing = (student: Student) => {
    setEditingStudent({ ...student });
    setEditDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <>
        <Card className="shadow-md">
          <Collapsible open={isManagementOpen} onOpenChange={onManagementToggle}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Student Management</CardTitle>
                <CardDescription>
                  Share the link or QR code with your class.
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className='-mr-2 -mt-1'>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                      <span className="sr-only">Toggle Management</span>
                  </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="classroom-url">Classroom URL</Label>
                  <div className="flex gap-2">
                    <Input id="classroom-url" value={classroomUrl} readOnly />
                    <Button size="icon" variant="outline" onClick={handleCopy}>
                      {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {isClient && classroomUrl && (
                  <div className="flex flex-col items-center gap-2 rounded-md bg-white p-4">
                    <QRCode value={classroomUrl} size={128} />
                    <p className="text-sm text-muted-foreground">Scan to Join</p>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="shadow-md">
          <Collapsible open={isRosterOpen} onOpenChange={onRosterToggle}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Class Roster</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                 <div className="text-2xl font-bold">{loggedInStudents.length} / {students.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {students.length - loggedInStudents.length} student(s) absent
                  </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onPickStudent} disabled={loggedInStudents.length === 0}>
                    <Ticket />
                    抽籤
                </Button>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className='-mr-2 -mt-1'>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                        <span className="sr-only">Toggle Roster</span>
                    </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <Tabs defaultValue="not-logged-in" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="not-logged-in">Not Logged In ({notLoggedInStudents.length})</TabsTrigger>
                  <TabsTrigger value="logged-in">Logged In ({loggedInStudents.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="not-logged-in">
                  <StudentTable
                      students={notLoggedInStudents}
                      actionButtons={(student) => (
                          <>
                              <Button variant="ghost" size="icon" onClick={() => startEditing(student)}>
                                  <Edit className="h-4 w-4" />
                              </Button>
                              <DeleteStudentButton student={student} onDelete={onDeleteStudent} />
                              <Button variant="outline" size="sm" onClick={() => onStudentLogin(student)}>(Simulate Login)</Button>
                          </>
                      )}
                      emptyMessage="All students are present!"
                  />
                </TabsContent>
                <TabsContent value="logged-in">
                    <StudentTable
                        students={loggedInStudents}
                        onRowClick={onToggleStudentFocus}
                        actionButtons={(student) => (
                            <>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onKickStudent(student.id); }}>
                                    <LogOut className="h-4 w-4 text-destructive" />
                                </Button>
                            </>
                        )}
                        emptyMessage="No students have logged in yet."
                    />
                </TabsContent>
              </Tabs>
              <CardContent>
                <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full mt-4">
                      <UserPlus className="mr-2 h-4 w-4" /> Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Student</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                      <Button onClick={handleAdd}>Save</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Edit Student</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-name" className="text-right">Name</Label>
                      <Input id="edit-name" value={editingStudent?.name || ''} onChange={(e) => setEditingStudent(s => s ? {...s, name: e.target.value} : null)} className="col-span-3" />
                  </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild><Button variant="ghost" onClick={() => setEditDialogOpen(false)}>Cancel</Button></DialogClose>
                  <Button onClick={handleUpdate}>Save Changes</Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  );
}

function StudentTable({ students, actionButtons, emptyMessage, onRowClick }: { students: Student[], actionButtons: (s: Student) => React.ReactNode, emptyMessage: string, onRowClick?: (id: number) => void }) {
    if (students.length === 0) {
        return <div className="text-center text-sm text-muted-foreground p-4">{emptyMessage}</div>
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {students.map((student) => {
                  const row = (
                     <TableRow 
                        key={student.id}
                        onClick={() => onRowClick?.(student.id)}
                        className={cn(
                            onRowClick && 'cursor-pointer',
                            student.isFocused === false && 'bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-800/30 dark:hover:bg-amber-800/50'
                        )}
                      >
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                {actionButtons(student)}
                            </div>
                        </TableCell>
                    </TableRow>
                  );

                  if (onRowClick) {
                    return (
                        <Tooltip key={student.id}>
                            <TooltipTrigger asChild>{row}</TooltipTrigger>
                            <TooltipContent>
                                <p>{student.isFocused ?? true ? 'Focused' : 'Distracted'}</p>
                                {(student.isFocused ?? true) ? null : <p className="text-xs text-muted-foreground">Student may have switched tabs.</p> }
                                <p className="text-xs text-muted-foreground">Click row to toggle status for demo.</p>
                            </TooltipContent>
                        </Tooltip>
                    )
                  }
                  return row;
                })}
            </TableBody>
        </Table>
    )
}

function DeleteStudentButton({ student, onDelete }: { student: Student, onDelete: (id: number) => void}) {
    const { toast } = useToast();
    
    const handleDelete = () => {
        onDelete(student.id);
        toast({
            variant: "destructive",
            title: "Student Deleted",
            description: `${student.name} has been removed from the roster.`,
        });
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete {student.name} from the roster. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
