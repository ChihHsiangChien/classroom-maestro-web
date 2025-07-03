
'use client';

import { useState } from 'react';
import { useClassroom, type Classroom } from '@/contexts/classroom-context';
import { ClassList } from '@/components/class-list';
import { ClassDetail } from '@/components/class-detail';

export default function DashboardPage() {
  const { classrooms, setClassrooms } = useClassroom();
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);

  const handleSelectClass = (classroom: Classroom) => {
    setSelectedClass(classroom);
  };

  const handleBack = () => {
    setSelectedClass(null);
  };
  
  if (selectedClass) {
    return <ClassDetail classroom={selectedClass} onBack={handleBack} />;
  }

  return <ClassList classrooms={classrooms} setClassrooms={setClassrooms} onSelectClass={handleSelectClass} />;
}
