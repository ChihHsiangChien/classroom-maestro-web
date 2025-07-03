
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

interface StudentImporterProps {
  onImport: (names: string[]) => void;
}

export function StudentImporter({ onImport }: StudentImporterProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const names = content.split('\n').map(name => name.trim()).filter(Boolean);
          onImport(names);
        } catch (error) {
          toast({
            variant: 'destructive',
            title: t('dashboard.toast_import_error_title'),
            description: t('dashboard.toast_import_error_description'),
          });
        }
      };
      reader.readAsText(file);
    }
  }, [onImport, t, toast]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'] },
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div {...getRootProps()} className={`mt-4 border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-border'}`}>
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
      <Button variant="link" onClick={open} className="mt-4">{t('dashboard.select_file')}</Button>
      <p className="text-sm text-muted-foreground">{t('dashboard.or_drop_file')}</p>
      <p className="text-xs text-muted-foreground mt-2">{t('dashboard.txt_files_only')}</p>
    </div>
  );
}
