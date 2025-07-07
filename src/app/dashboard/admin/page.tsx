
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useClassroom } from '@/contexts/classroom-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, onSnapshot, type Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, ArrowRight, BrainCircuit } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/provider';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2 } from 'lucide-react';

interface Teacher {
  uid: string;
  displayName: string;
  email: string;
  classCount: number;
  studentCount: number;
  coursewareCount: number;
  lastActivity?: Timestamp;
}

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAdmin, loading: authLoading, user: adminUser } = useAuth();
  const { deleteTeacherAndData, updateUserLastActivity } = useClassroom();
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin || !db) return;

    updateUserLastActivity();

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, async (usersSnapshot) => {
        setLoadingData(true);
        const usersData = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                uid: data.uid,
                displayName: data.displayName,
                email: data.email,
                lastActivity: data.lastActivity as Timestamp | undefined,
            }
        });
        
        const teachersWithStats: Teacher[] = await Promise.all(
            usersData.map(async (user) => {
                const classroomsQuery = query(collection(db, 'classrooms'), where('ownerId', '==', user.uid));
                const classroomsSnapshot = await getDocs(classroomsQuery);
                const classCount = classroomsSnapshot.size;
                const studentCount = classroomsSnapshot.docs.reduce((acc, doc) => acc + (doc.data().students?.length || 0), 0);
                
                const coursewareQuery = query(collection(db, 'courseware'), where('ownerId', '==', user.uid));
                const coursewareSnapshot = await getDocs(coursewareQuery);
                const coursewareCount = coursewareSnapshot.size;

                return { ...user, classCount, studentCount, coursewareCount, lastActivity: user.lastActivity };
            })
        );
        
        setTeachers(teachersWithStats);
        setLoadingData(false);
    }, (error) => {
        console.error("Error fetching users:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch teacher data." });
        setLoadingData(false);
    });

    return () => unsubscribe();
  }, [isAdmin, toast, updateUserLastActivity]);

  const handleDeleteData = async (ownerId: string, ownerName: string) => {
    setIsDeleting(ownerId);
    await deleteTeacherAndData(ownerId);
    toast({
        title: t('admin.delete_data_success_title'),
        description: t('admin.delete_data_success_description', { name: ownerName }),
    });
    setIsDeleting(null);
  };
  
  if (authLoading || !isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-5xl py-8">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('admin.title')}</CardTitle>
            <CardDescription>{t('admin.description')}</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/ai-usage">
              <BrainCircuit className="mr-2 h-4 w-4" />
              {t('admin.ai_usage_dashboard')}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
            {loadingData ? (
                 <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 </div>
            ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>{t('admin.table_header_teacher')}</TableHead>
                    <TableHead>{t('admin.table_header_email')}</TableHead>
                    <TableHead>{t('admin.table_header_last_activity')}</TableHead>
                    <TableHead className="text-center">{t('admin.table_header_class_count')}</TableHead>
                    <TableHead className="text-center">{t('admin.table_header_courseware_count')}</TableHead>
                    <TableHead className="text-center">{t('admin.table_header_student_count')}</TableHead>
                    <TableHead className="text-right">{t('admin.table_header_actions')}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {teachers.map((teacher) => (
                    <TableRow key={teacher.uid} className={teacher.uid === adminUser?.uid ? 'bg-primary/5' : ''}>
                        <TableCell className="font-medium">{teacher.displayName}{teacher.uid === adminUser?.uid && ` (${t('admin.you_label')})`}</TableCell>
                        <TableCell>{teacher.email}</TableCell>
                        <TableCell>
                            {teacher.lastActivity ? (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <span className="cursor-default text-sm">
                                                {formatDistanceToNow(teacher.lastActivity.toDate(), { addSuffix: true })}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {teacher.lastActivity.toDate().toLocaleString()}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ) : (
                                <span className="text-sm text-muted-foreground">{t('admin.last_activity_never')}</span>
                            )}
                        </TableCell>
                        <TableCell className="text-center">{teacher.classCount}</TableCell>
                        <TableCell className="text-center">{teacher.coursewareCount}</TableCell>
                        <TableCell className="text-center">{teacher.studentCount}</TableCell>
                        <TableCell className="text-right">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={teacher.uid === adminUser?.uid || isDeleting === teacher.uid}>
                                        {isDeleting === teacher.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        {t('common.delete')}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('admin.delete_confirm_title', { name: teacher.displayName })}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('admin.delete_confirm_description')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="space-y-6 rounded-md border p-4">
                                        <div>
                                            <h3 className="font-semibold">{t('admin.delete_step1_title')}</h3>
                                            <p className="text-sm text-muted-foreground">{t('admin.delete_step1_description')}</p>
                                            <Button 
                                                className="mt-2"
                                                variant="outline"
                                                onClick={() => handleDeleteData(teacher.uid, teacher.displayName)}
                                                disabled={isDeleting === teacher.uid}
                                            >
                                                {isDeleting === teacher.uid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                {t('admin.delete_data_button')}
                                            </Button>
                                        </div>
                                        <div className="border-t pt-4">
                                            <h3 className="font-semibold">{t('admin.delete_step2_title')}</h3>
                                            <p className="text-sm text-muted-foreground">{t('admin.delete_step2_description')}</p>
                                            <Button className="mt-2" variant="destructive" asChild>
                                                <a href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/users`} target="_blank" rel="noopener noreferrer">
                                                    {t('admin.delete_user_account_button')} <ArrowRight className="ml-2 h-4 w-4" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('common.close')}</AlertDialogCancel>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            )}
        </CardContent>
       </Card>
    </div>
  );
}
