
'use client';

import { useRouter } from 'next/navigation';
import { useClassroom, type Classroom } from '@/contexts/classroom-context';
import { StudentManagement } from '@/components/student-management';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

interface ClassDetailProps {
  classroom: Classroom;
  onBack: () => void;
}

export function ClassDetail({ classroom, onBack }: ClassDetailProps) {
  const router = useRouter();
  const { setActiveClassroom } = useClassroom();
  const { t } = useI18n();

  const handleStartActivity = () => {
    setActiveClassroom(classroom);
    router.push('/dashboard/activity');
  };

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">{classroom.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleStartActivity} disabled={classroom.students.length === 0}>
            <PlayCircle className="mr-2 h-4 w-4" />
            {t('dashboard.start_activity')}
          </Button>
        </div>
      </div>

      <StudentManagement classroom={classroom} onBack={onBack} />
    </div>
  );
}
