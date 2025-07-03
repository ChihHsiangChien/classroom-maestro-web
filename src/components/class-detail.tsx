
'use client';

import { useRouter } from 'next/navigation';
import { useClassroom, type Classroom } from '@/contexts/classroom-context';
import { StudentManagement } from '@/components/student-management';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

interface ClassDetailProps {
  classroom: Classroom;
  onBack: () => void;
}

export function ClassDetail({ classroom, onBack }: ClassDetailProps) {
  const router = useRouter();
  const { setActiveClassroom, ...classroomActions } = useClassroom();
  const { t } = useI18n();

  const handleStartActivity = () => {
    setActiveClassroom(classroom);
    router.push('/dashboard/activity');
  };

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{classroom.name}</h1>
        </div>
        <Button onClick={handleStartActivity}>
          <PlayCircle className="mr-2 h-4 w-4" />
          {t('dashboard.start_activity')}
        </Button>
      </div>

      <StudentManagement 
        classroom={classroom}
        onAddStudent={(name) => classroomActions.addStudent(classroom.id, name)}
        onUpdateStudent={(id, name) => classroomActions.updateStudent(classroom.id, id, name)}
        onDeleteStudent={(id) => classroomActions.deleteStudent(classroom.id, id)}
        onImportStudents={(names) => classroomActions.importStudents(classroom.id, names)}
      />
    </div>
  );
}
