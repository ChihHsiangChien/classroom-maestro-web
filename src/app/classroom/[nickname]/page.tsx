'use client';

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

function ClassroomDebugPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const classId = params.nickname as string;
  const studentId = searchParams.get('studentId');
  const studentName = searchParams.get('name');

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Classroom Debug Page</CardTitle>
        <CardDescription>
          If you can see this page, the routing is working. The problem is in the original page's logic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">Class ID (from path):</h3>
          <p className="font-mono p-2 bg-muted rounded-md">{classId || 'Not found'}</p>
        </div>
        <div>
          <h3 className="font-semibold">Student ID (from URL parameter):</h3>
          <p className="font-mono p-2 bg-muted rounded-md">{studentId || 'Not found'}</p>
        </div>
        <div>
          <h3 className="font-semibold">Student Name (from URL parameter):</h3>
          <p className="font-mono p-2 bg-muted rounded-md">{studentName || 'Not found'}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </CardContent>
    </Card>
  );
}

// The Suspense wrapper is crucial for components that use useSearchParams
export default function ClassroomPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ClassroomDebugPage />
      </Suspense>
    </main>
  );
}
