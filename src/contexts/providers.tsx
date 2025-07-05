
'use client';

import { AuthProvider } from '@/contexts/auth-context';
import { ClassroomProvider } from '@/contexts/classroom-context';
import { CoursewareProvider } from '@/contexts/courseware-context';

export function Providers({ children }: { children: React.ReactNode }) {
  // All pages are now wrapped by the providers.
  // The AuthProvider no longer handles redirection.
  // Page-specific layouts (like DashboardLayout) are responsible
  // for protecting routes.
  return (
    <AuthProvider>
      <ClassroomProvider>
        <CoursewareProvider>
          {children}
        </CoursewareProvider>
      </ClassroomProvider>
    </AuthProvider>
  );
}
