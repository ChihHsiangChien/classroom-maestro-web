
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useClassroom } from '@/contexts/classroom-context';
import type { QuestionData } from '@/components/create-poll-form';
import { StudentQuestionForm } from '@/components/student-poll';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, PartyPopper, LogOut } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';


function ClassroomPageContent() {
    const { t } = useI18n();
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { listenForClassroom, listenForStudentPresence, addSubmission, updateStudentPresence, acknowledgeKick } = useClassroom();

    const classroomId = params.nickname as string;
    const studentId = searchParams.get('studentId');
    const studentName = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : 'Student';

    const [activeQuestion, setActiveQuestion] = useState<(QuestionData & { id: string }) | null>(null);
    const [submittedQuestionId, setSubmittedQuestionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [kicked, setKicked] = useState(false);

    // This effect handles student presence (online status)
    useEffect(() => {
        if (!classroomId || !studentId) return;

        const setPresence = (isOnline: boolean) => updateStudentPresence(classroomId, studentId, isOnline);

        // Initial presence update and heartbeat
        setPresence(true);
        const heartbeatInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                setPresence(true);
            }
        }, 30000); // every 30 seconds

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setPresence(true);
            } else {
                setPresence(false);
            }
        };
        
        const handleBeforeUnload = () => {
            setPresence(false);
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(heartbeatInterval);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            setPresence(false);
        };
    }, [classroomId, studentId, updateStudentPresence]);


    // Listen for classroom-level changes (like the active question)
    useEffect(() => {
        if (!classroomId) return;

        setLoading(true);
        const unsubscribe = listenForClassroom(classroomId, (classroom) => {
            if (!classroom) {
                setLoading(false);
                return;
            };

            const currentQuestion = classroom.activeQuestion;
            if (currentQuestion && activeQuestion?.id !== currentQuestion.id) {
                setSubmittedQuestionId(null);
            }
            setActiveQuestion(currentQuestion);

            setLoading(false);
        });

        return () => unsubscribe();
    }, [classroomId, listenForClassroom, activeQuestion?.id]);

    // Listen for student-specific changes (like being kicked)
    useEffect(() => {
        if (!classroomId || !studentId) return;

        const unsubscribe = listenForStudentPresence(classroomId, studentId, (presence) => {
            if (presence?.forceLogout) {
                setKicked(true);
            }
        });

        return () => unsubscribe();
    }, [classroomId, studentId, listenForStudentPresence]);

    // Effect to handle the kick redirection
    useEffect(() => {
        if (kicked && classroomId && studentId) {
            acknowledgeKick(classroomId, studentId);
            router.push(`/join?classId=${classroomId}`);
        }
    }, [kicked, classroomId, studentId, acknowledgeKick, router]);


    const handleVoteSubmit = async (answer: string | string[]) => {
        if (!classroomId || !studentId || !activeQuestion) return;

        await addSubmission(classroomId, activeQuestion.id, studentId, studentName, answer);
        setSubmittedQuestionId(activeQuestion.id);
    };

    const handleLogout = () => {
        if (classroomId) {
            // Set presence to offline before logging out
            if (studentId) {
                updateStudentPresence(classroomId, studentId, false);
            }
            router.push(`/join?classId=${classroomId}`);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center gap-4 text-foreground">
                <Loader2 className="h-12 w-12 animate-spin" />
                <p className="text-xl">{t('common.loading')}</p>
            </div>
        );
    }

    if (activeQuestion && submittedQuestionId !== activeQuestion.id) {
        return <StudentQuestionForm question={activeQuestion} onVoteSubmit={handleVoteSubmit} />;
    }

    const messageCardTitle = activeQuestion
        ? t('classroomPage.submission_received_title')
        : t('classroomPage.welcome_title', { studentName });
    
    const messageCardDescription = activeQuestion
        ? t('classroomPage.submission_received_description')
        : t('classroomPage.welcome_description');

    return (
        <Card className="w-full max-w-lg text-center animate-in fade-in-50">
            <CardHeader>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <PartyPopper className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{messageCardTitle}</CardTitle>
                <CardDescription>{messageCardDescription}</CardDescription>
            </CardHeader>
            <CardFooter className="p-6 pt-2">
                <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full"
                 >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('dashboard.sign_out')}
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function ClassroomPage() {
    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
             <Suspense fallback={
                <div className="flex flex-col items-center gap-4 text-foreground">
                    <Loader2 className="h-12 w-12 animate-spin" />
                    <p className="text-xl">Loading Student View...</p>
                </div>
            }>
                <ClassroomPageContent />
            </Suspense>
        </main>
    );
}
