
'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface StudentImporterProps {
  onImport: (names: string[]) => void;
}

export function StudentImporter({ onImport }: StudentImporterProps) {
  const { t } = useI18n();
  const [studentList, setStudentList] = useState('');

  const handleImportClick = () => {
    const names = studentList.split('\n').map(name => name.trim()).filter(Boolean);
    if (names.length > 0) {
      onImport(names);
      setStudentList('');
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="grid w-full gap-1.5">
        <Label htmlFor="student-list">{t('studentManagement.paste_student_list_label')}</Label>
        <Textarea
          id="student-list"
          placeholder={t('studentManagement.paste_student_list_placeholder')}
          value={studentList}
          onChange={(e) => setStudentList(e.target.value)}
          rows={10}
        />
      </div>
      <Button onClick={handleImportClick} disabled={!studentList.trim()} className="w-full">
        {t('studentManagement.add_students_button')}
      </Button>
    </div>
  );
}
