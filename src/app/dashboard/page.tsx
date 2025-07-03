
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClassroom, type Classroom } from '@/contexts/classroom-context';
import { ClassList } from '@/components/class-list';
import { ClassDetail } from '@/components/class-detail';

export default function DashboardPage() {
  const { classrooms, setActiveClassroom } = useClassroom();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const router = useRouter();

  const handleSelectClass = (classroom: Classroom) => {
    setSelectedClassId(classroom.id);
  };

  const handleStartActivity = (classroom: Classroom) => {
    setActiveClassroom(classroom);
    router.push('/dashboard/activity');
  };

  const handleBack = () => {
    setSelectedClassId(null);
  };

  const selectedClass = selectedClassId
    ? classrooms.find((c) => c.id === selectedClassId)
    : null;
  
  if (selectedClass) {
    return <ClassDetail classroom={selectedClass} onBack={handleBack} />;
  }

  return (
    <ClassList 
      onSelectClass={handleSelectClass}
      onStartActivity={handleStartActivity}
    />
  );
}
