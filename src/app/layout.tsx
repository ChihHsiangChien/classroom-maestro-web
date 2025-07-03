import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/lib/i18n/provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ClassroomProvider } from "@/contexts/classroom-context";


export const metadata: Metadata = {
  title: "Classroom Maestro",
  description: "Interactive classroom for modern learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <I18nProvider>
          <AuthProvider>
            <ClassroomProvider>
              {children}
              <Toaster />
            </ClassroomProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
