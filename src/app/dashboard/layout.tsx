
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { School, LogOut, User as UserIcon, Shield } from "lucide-react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
     return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <School className="h-12 w-12 animate-pulse text-primary" />
        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <School className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">{t('dashboard.title')}</h1>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <LanguageSwitcher />
          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/admin">
                <Shield className="mr-2 h-4 w-4" />
                {t('admin.title')}
              </Link>
            </Button>
          )}
          {user && (
            <div className="flex items-center gap-2">
                {user.photoURL ? (
                    <Image src={user.photoURL} alt={user.displayName || 'User'} width={28} height={28} className="rounded-full" />
                ) : (
                    <UserIcon className="h-6 w-6 rounded-full bg-muted p-1" />
                )}
                <span className="text-sm font-medium hidden md:inline">{user.displayName}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('dashboard.sign_out')}
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
    </div>
  );
}
