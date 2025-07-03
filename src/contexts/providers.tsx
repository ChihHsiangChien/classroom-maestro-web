
'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/auth-context';
import { ClassroomProvider } from '@/contexts/classroom-context';

const studentPaths = ['/join', '/classroom'];

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStudentPath = studentPaths.some(p => pathname.startsWith(p));

  if (isStudentPath) {
    // Student pages don't need Auth or Classroom context
    return <>{children}</>;
  }

  // Teacher/dashboard pages get the full context
  return (
    <AuthProvider>
      <ClassroomProvider>
        {children}
      </ClassroomProvider>
    </AuthProvider>
  );
}
