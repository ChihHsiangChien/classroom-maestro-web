'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClassroom, type Classroom } from '@/contexts/classroom-context';
import { ClassList } from '@/components/class-list';
import { ClassDetail } from '@/components/class-detail';

export default function DashboardPage() {
  const { classrooms, setActiveClassroom, startClassSession } = useClassroom();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const router = useRouter();

  const handleSelectClass = (classroom: Classroom) => {
    setSelectedClassId(classroom.id);
  };

  const handleStartActivity = async (classroom: Classroom) => {
    await startClassSession(classroom.id);
    setActiveClassroom(classroom);
    router.push('/dashboard/activity');
  };

  const handleCloseDetail = () => {
    setSelectedClassId(null);
  };

  const selectedClass = selectedClassId
    ? classrooms.find((c) => c.id === selectedClassId)
    : null;
  
  if (selectedClass) {
    return <ClassDetail classroom={selectedClass} onBack={handleCloseDetail} />;
  }

  return (
    <ClassList 
      onSelectClass={handleSelectClass}
      onStartActivity={handleStartActivity}
    />
  );
}
