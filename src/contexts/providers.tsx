
'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider } from '@/contexts/auth-context';
import { ClassroomProvider } from '@/contexts/classroom-context';
import { CoursewareProvider } from '@/contexts/courseware-context';
import { UsageProvider } from './usage-context';
import { initializeFirebase, isFirebaseConfigured, AppStatus } from '@/lib/firebase';
import { School, Terminal } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n/provider';

function FullScreenLoader({ message }: { message: string }) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center">
            <School className="h-12 w-12 animate-pulse text-primary" />
            <p className="mt-4 text-muted-foreground">{message}</p>
        </div>
    );
}

function FirebaseConfigError() {
    const { t } = useI18n();
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
        <Alert variant="destructive" className="max-w-lg bg-background">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t('firebase.config_error_title')}</AlertTitle>
          <AlertDescription>
            <p>{t('firebase.config_error_description')}</p>
            <p className="mt-2" dangerouslySetInnerHTML={{ __html: t('firebase.config_error_instructions_html') }} />
          </AlertDescription>
        </Alert>
      </main>
    );
}


export function Providers({ children }: { children: React.ReactNode }) {
  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.LOADING);
  const { t } = useI18n();

  useEffect(() => {
    // This check prevents re-initialization on hot reloads in development
    if (appStatus !== AppStatus.LOADING) {
      return;
    }
    
    // Check for placeholder values first. This is a synchronous check.
    if (!isFirebaseConfigured) {
        setAppStatus(AppStatus.CONFIG_ERROR);
        return;
    }

    async function init() {
      const success = await initializeFirebase();
      setAppStatus(success ? AppStatus.READY : AppStatus.CONFIG_ERROR);
    }
    init();
  }, [appStatus]);

  if (appStatus === AppStatus.LOADING) {
    return <FullScreenLoader message={t('common.loading')} />;
  }

  if (appStatus === AppStatus.CONFIG_ERROR) {
    return <FirebaseConfigError />;
  }

  return (
    <AuthProvider>
      <UsageProvider>
        <ClassroomProvider>
          <CoursewareProvider>
            {children}
          </Coursea