
'use client';

import { useState } from 'react';
import { useClassroom, type Classroom } from '@/contexts/classroom-context';
import { ClassList } from '@/components/class-list';
import { ClassDetail } from '@/components/class-detail';

export default function DashboardPage() {
  const { classrooms, setClassrooms } = useClassroom();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const handleSelectClass = (classroom: Classroom) => {
    setSelectedClassId(classroom.id);
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

  return <ClassList classrooms={classrooms} setClassrooms={setClassrooms} onSelectClass={handleSelectClass} />;
}
