
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { School, LogOut, User as UserIcon, Shield, BookCopy, Users, Globe } from "lucide-react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/provider";
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
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
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <Users className="mr-2 h-4 w-4" />
                {t('dashboard.classes')}
              </Link>
            </Button>
           <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/courseware">
                <BookCopy className="mr-2 h-4 w-4" />
                {t('courseware.title')}
              </Link>
            </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/admin">
                <Shield className="mr-2 h-4 w-4" />
                {t('admin.title')}
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                {user.photoURL ? (
                    <Image src={user.photoURL} alt={user.displayName || 'User'} width={28} height={28} className="rounded-full" />
                ) : (
                    <UserIcon className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Globe className="mr-2 h-4 w-4" />
                    <span>{t('language_switcher.title')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setLocale('en')} disabled={locale === 'en'}>
                        English
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocale('zh')} disabled={locale === 'zh'}>
                        正體中文
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.sign_out')}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
    </div>
  );
}
