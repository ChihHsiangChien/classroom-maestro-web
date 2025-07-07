
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { School, User, AlertTriangle, Lock, Terminal } from 'lucide-react';
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
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Classroom, Student, PresenceData } from '@/contexts/classroom-context';
import { useI18n } from '@/lib/i18n/provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';


function JoinPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signInAnonymously, loading: authLoading } = useAuth();
  const [classroom, setClassroom] = useState<(Omit<Classroom, 'students'> & { students: (Student & { isLoggedIn?: boolean })[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const classId = searchParams.get('classId');
    if (!classId) {
      setError(t('joinPage.no_classroom_error'));
      setLoading(false);
      return;
    }
    if (!db) {
       setError("Firebase is not configured correctly.");
       setLoading(false);
       return;
    }

    let unsubscribe = () => {};

    const initialize = async () => {
      // Ensure user is authenticated (anonymously is fine) before proceeding
      if (authLoading) return;
      let currentUser = user;
      if (!currentUser) {
        try {
          currentUser = await signInAnonymously();
        } catch (e: any) {
            if (e.code === 'auth/admin-restricted-operation') {
                setError('admin-restricted-operation');
            } else {
                console.error("Authentication failed:", e);
                setError(e.message || 'Could not authenticate session. Please refresh the page.');
            }
            setLoading(false);
            return;
        }
      }
      if (!currentUser) {
         setError('Could not authenticate session. Please refresh the page.');
         setLoading(false);
         return;
      }

      try {
        const classroomRef = doc(db, 'classrooms', classId);
        const classroomSnap = await getDoc(classroomRef);

        if (!classroomSnap.exists()) {
          setError(t('joinPage.class_not_found_error'));
          setLoading(false);
          return;
        }
        const classroomData = classroomSnap.data();

        const presenceRef = collection(db, 'classrooms', classId, 'presence');
        unsubscribe = onSnapshot(presenceRef, (presenceSnap) => {
          const presenceData: { [key: string]: PresenceData } = {};
          presenceSnap.forEach(doc => {
            presenceData[doc.id] = doc.data() as PresenceData;
          });

          const studentsWithPresence = (classroomData.students || []).map((student: Student) => {
            const presence = presenceData[student.id];
            const isLoggedIn = !!presence?.isOnline;
            return { ...student, isLoggedIn };
          });

          const fetchedClassroom = {
            id: classroomSnap.id,
            name: classroomData.name,
            students: studentsWithPresence,
            ownerId: classroomData.ownerId,
            isLocked: classroomData.isLocked || false,
          };
          setClassroom(fetchedClassroom as (Omit<Classroom, 'students'> & { students: (Student & { isLoggedIn?: boolean })[] }));
          setLoading(false);
        }, (err) => {
            const errorMessage = `Failed to listen for presence. Code: ${err.code}. Message: ${err.message}`;
            setError(errorMessage);
            setLoading(false);
        });

      } catch (e: any) {
        const errorMessage = `Failed to fetch classroom. Code: ${e.code}. Message: ${e.message}`;
        setError(errorMessage);
        setLoading(false);
      }
    };

    initialize();

    return () => {
      unsubscribe();
    }
  }, [searchParams, t, user, authLoading, signInAnonymously]);

  const handleStudentClick = (student: Student & { isLoggedIn?: boolean }) => {
    if (student.isLoggedIn || !classroom) return;
    const url = `/classroom/${classroom.id}?studentId=${student.id}&name=${encodeURIComponent(student.name)}`;
    router.push(url);
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <School className="h-12 w-12 animate-pulse text-primary" />
        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    if (error === 'admin-restricted-operation') {
        return (
            <Card className="w-full max-w-lg shadow-lg">
                <CardHeader>
                    <CardTitle>{t('firebase.auth_anon_error_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>{t('firebase.auth_anon_error_title')}</AlertTitle>
                        <AlertDescription>
                            <div className="space-y-3 mt-2">
                                <p>{t('firebase.auth_anon_error_description')}</p>
                                <p>{t('firebase.auth_anon_error_instructions')}</p>
                                <Button asChild variant="link" className="p-0 h-auto text-destructive font-semibold">
                                <a href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/sign-in-method`} target="_blank" rel="noopener noreferrer">
                                    {t('firebase.auth_anon_error_button')}
                                </a>
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{t('common.error')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('joinPage.error_title')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!classroom) {
     return (
       <Card className="w-full max-w-md shadow-lg">
         <CardHeader>
            <CardTitle>{t('joinPage.title')}</CardTitle>
         </CardHeader>
         <CardContent>
            <p className="text-center text-muted-foreground">{t('common.loading')}</p>
         </CardContent>
       </Card>
    )
  }

  if (classroom.isLocked) {
      return (
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Lock className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>{t('joinPage.classroom_locked_title')}</CardTitle>
              <CardDescription>{classroom.name}</CardDescription>
          </CardHeader>
          <CardContent>
              <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t('joinPage.classroom_locked_title')}</AlertTitle>
                  <AlertDescription>{t('joinPage.classroom_locked_description')}</AlertDescription>
              </Alert>
          </CardContent>
        </Card>
      );
  }
  
  if (classroom.students.length === 0) {
      return (
       <Card className="w-full max-w-md shadow-lg">
         <CardHeader>
            <CardTitle>{classroom.name}</CardTitle>
         </CardHeader>
         <CardContent>
            <p className="text-center text-muted-foreground">{t('joinPage.no_students_error')}</p>
         </CardContent>
       </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <School className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{classroom.name}</CardTitle>
        <CardDescription>{t('joinPage.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableBody>
              {classroom.students.map((student) => (
                <TableRow
                  key={student.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    student.isLoggedIn && "cursor-not-allowed opacity-50 hover:bg-transparent"
                  )}
                  onClick={() => handleStudentClick(student)}
                >
                  <TableCell
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div className="flex items-center gap-4">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">{student.name}</span>
                    </div>
                     {student.isLoggedIn && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span>{t('joinPage.logged_in')}</span>
                        </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JoinPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={
        <div className="flex min-h-screen w-full flex-col items-center justify-center">
            <School className="h-12 w-12 animate-pulse text-primary" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      }>
        <JoinPageContent />
      </Suspense>
    </main>
  );
}
