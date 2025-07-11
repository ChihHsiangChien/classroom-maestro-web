
'use client';

import { useRouter } from 'next/navigation';
import { School, LogIn, Terminal, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/lib/i18n/provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState } from 'react';
import type { AuthError } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { t } = useI18n();
  const { user, loading, signInWithGoogle, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
      // on success, the onAuthStateChanged listener in AuthProvider will handle the redirect.
    } catch (error) {
      const e = error as AuthError;
      console.error(`Login failed: ${e.code} - ${e.message}`);
      // Special handling for the domain error, which might appear as popup-closed-by-user in some environments.
      if (e.code === 'auth/unauthorized-domain' || e.code === 'auth/popup-closed-by-user') {
        setAuthError('unauthorized-domain');
      } else {
        toast({
          variant: 'destructive',
          title: t('firebase.generic_auth_error_title'),
          description: e.message,
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  if (loading) {
     return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <School className="h-12 w-12 animate-pulse text-primary" />
        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
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
  
  if (user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <School className="h-12 w-12 animate-pulse text-primary" />
        <p className="mt-4 text-muted-foreground">{t('dashboard.redirecting')}</p>
      </div>
    );
  }

  // Main login UI
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4">
      {authError === 'unauthorized-domain' && (
        <div className="max-w-md w-full mb-6">
          <Alert variant="destructive" className="bg-background">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('firebase.auth_domain_error_title')}</AlertTitle>
            <AlertDescription>
               <div className="mt-2 space-y-3">
                <p>{t('firebase.auth_domain_error_description_p1')}</p>
                <p className="font-semibold">{t('firebase.auth_domain_error_description_p2')}</p>
                <code className="block rounded bg-muted px-2 py-1 font-mono text-sm">{typeof window !== 'undefined' ? window.location.hostname : ''}</code>
                <p>{t('firebase.auth_domain_error_instructions')}</p>
                <Button asChild variant="link" className="p-0 h-auto text-destructive font-semibold">
                  <a href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/authentication/settings`} target="_blank" rel="noopener noreferrer">
                      {t('firebase.auth_domain_error_button')}
                    </a>
                </Button>
               </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex flex-col items-center gap-2 mb-8 text-center">
        <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
          <School className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-foreground">
          {t('landingPage.title')}
        </h1>
        <p className="max-w-md text-muted-foreground">
          {t('landingPage.description')}
        </p>
      </div>
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>{t('landingPage.teacher_signin_title')}</CardTitle>
          <CardDescription>
            {t('landingPage.teacher_signin_description_google')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} className="w-full" disabled={isLoggingIn}>
             {isLoggingIn ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             ) : (
                <LogIn className="mr-2 h-4 w-4" />
             )}
            {isLoggingIn ? 'Logging in...' : t('landingPage.signin_with_google_button')}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
