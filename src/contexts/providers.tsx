
'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { ClassroomProvider } from '@/contexts/classroom-context';

export function Providers({ children }: { children: React.ReactNode }) {
  // All pages are now wrapped by the providers.
  // The AuthProvider will handle redirecting unauthenticated users
  // from protected pages. Student pages are now also "protected"
  // in the sense that they are accessed via a simulation flow
  // by an authenticated teacher.
  return (
    <AuthProvider>
      <ClassroomProvider>
        {children}
      </ClassroomProvider>
    </AuthProvider>
  );
}
