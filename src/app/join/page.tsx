
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { School, User, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Classroom, Student } from '@/contexts/classroom-context';
import { useI18n } from '@/lib/i18n/provider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';


function JoinPageContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const classId = searchParams.get('classId');
    console.log('Attempting to join class with ID:', classId);

    if (classId && db) {
      const fetchClassroom = async () => {
          try {
              const classroomRef = doc(db, 'classrooms', classId);
              const classroomSnap = await getDoc(classroomRef);

              if (classroomSnap.exists()) {
                  const classroomData = classroomSnap.data();
                  setClassroom({
                      id: classroomSnap.id,
                      name: classroomData.name,
                      students: classroomData.students || [],
                      ownerId: classroomData.ownerId,
                  });
              } else {
                  console.error("No such classroom document for ID:", classId);
                  setError(t('joinPage.class_not_found_error'));
              }
          } catch (e: any) {
              console.error("DETAILED_FIREBASE_FETCH_ERROR:", e);
              const errorMessage = `Failed to fetch classroom. Code: ${e.code}. Message: ${e.message}`;
              setError(errorMessage);
          } finally {
              setLoading(false);
          }
      };
      fetchClassroom();
    } else if (!classId) {
      setError(t('joinPage.no_classroom_error'));
      setLoading(false);
    } else if (!db) {
       setError("Firebase is not configured correctly.");
       setLoading(false);
    }
  }, [searchParams, t]);

  const handleStudentClick = (student: Student) => {
    if (!classroom) return;
    const url = `/classroom/${classroom.id}?studentId=${student.id}&name=${encodeURIComponent(student.name)}`;
    router.push(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <School className="h-12 w-12 animate-pulse text-primary" />
        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
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
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleStudentClick(student)}
                >
                  <TableCell className="flex items-center gap-4 p-4">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{student.name}</span>
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
