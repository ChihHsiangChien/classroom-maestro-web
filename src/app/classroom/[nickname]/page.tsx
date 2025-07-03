'use client';

import { useParams, useSearchParams, Suspense } from 'next/navigation';

function DebugContent() {
    const params = useParams();
    const searchParams = useSearchParams();

    const nickname = params.nickname as string;
    const studentId = searchParams.get('studentId');
    const studentName = searchParams.get('name');

    return (
        <div className="bg-white text-black p-8 rounded-lg shadow-xl">
            <h1 className="text-2xl font-bold mb-4">Classroom Debug Info</h1>
            <div className="space-y-2 text-lg">
                <p><strong>Status:</strong> Page Loaded Successfully</p>
                <p><strong>Classroom ID (Nickname):</strong> <code className="bg-gray-200 p-1 rounded">{nickname || 'Not Found'}</code></p>
                <p><strong>Student ID:</strong> <code className="bg-gray-200 p-1 rounded">{studentId || 'Not Found'}</code></p>
                <p><strong>Student Name:</strong> <code className="bg-gray-200 p-1 rounded">{studentName ? decodeURIComponent(studentName) : 'Not Found'}</code></p>
            </div>
        </div>
    );
}

export default function ClassroomPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-800 p-4">
            <Suspense fallback={
                <div className="text-white text-2xl">Loading Student View...</div>
            }>
                <DebugContent />
            </Suspense>
        </main>
    );
}
