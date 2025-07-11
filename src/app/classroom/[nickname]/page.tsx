
'use client';

import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useClassroom, type Classroom, type Submission } from '@/contexts/classroom-context';
import type { QuestionData } from '@/components/create-poll-form';
import { StudentQuestionForm } from '@/components/student-poll';
import { StudentAnswerResult } from '@/components/student-answer-result';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, PartyPopper, LogOut, RefreshCw, Trophy, Award } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { StudentRace } from '@/components/student-race';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';


function ClassroomPageContent() {
    const { t } = useI18n();
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const { listenForClassroom, listenForStudentPresence, addSubmission, updateStudentPresence, acknowledgeKick, claimRace, listenForSubmissions } = useClassroom();
    const unsubscribeRef = useRef<() => void>(() => {});

    const classroomId = params.nickname as string;
    const studentId = searchParams.get('studentId');
    const studentName = searchParams.get('name') ? decodeURIComponent(searchParams.get('name')!) : 'Student';

    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLocked, setIsLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [kicked, setKicked] = useState(false);
    const [lastRespondedPingId, setLastRespondedPingId] = useState<string | null>(null);
    const [sessionEnded, setSessionEnded] = useState(false);

    const activeQuestion = classroom?.activeQuestion;
    const activeRace = classroom?.race;
    const myScore = (studentId && classroom?.scores?.[studentId]) ?? 0;

    const myRank = useMemo(() => {
        if (!classroom?.scores || !studentId) {
            return null;
        }

        const scores = classroom.scores;
        const studentScore = scores[studentId];

        if (studentScore === undefined) {
            return null;
        }

        // Create a sorted list of unique scores in descending order
        const uniqueScores = [...new Set(Object.values(scores))].sort((a, b) => b - a);
        
        // Find the rank (1-based index)
        const rank = uniqueScores.indexOf(studentScore) + 1;
        
        return rank > 0 ? rank : null;
    }, [classroom?.scores, studentId]);

    // This effect handles student presence: login session and attention tracking.
    useEffect(() => {
        if (!classroomId || !studentId) return;

        // --- Session Management ---
        // Set student as "logged in" when the component mounts.
        updateStudentPresence(classroomId, studentId, true);

        // Set student as "logged out" when they close the tab/browser.
        const handleBeforeUnload = () => {
             updateStudentPresence(classroomId, studentId, false);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup on component unmount
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Final "logout" update on cleanup
            updateStudentPresence(classroomId, studentId, false);
        };
    }, [classroomId, studentId, updateStudentPresence]);


    // This effect handles responding to teacher pings
    useEffect(() => {
        if (!classroom || !classroom.pingRequest || !studentId || !classroomId) return;
        
        const { id: pingId } = classroom.pingRequest;
        
        // Respond only to new pings and if the page is visible
        if (pingId !== lastRespondedPingId && document.visibilityState === 'visible') {
            console.log(`Responding to ping: ${pingId}`);
            // A ping response signals the student is online and active.
            updateStudentPresence(classroomId, studentId, true);
            setLastRespondedPingId(pingId);
        }
    }, [classroom, studentId, classroomId, lastRespondedPingId, updateStudentPresence]);


    // Listen for classroom-level changes (like the active question or lock state)
    useEffect(() => {
        if (!classroomId || sessionEnded) {
            if (sessionEnded && unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            return;
        }

        setLoading(true);
        unsubscribeRef.current = listenForClassroom(classroomId, (classroomData) => {
            if (!classroomData) {
                // If classroom is deleted or otherwise unavailable, treat as session ended.
                setLoading(false);
                setSessionEnded(true);
                return;
            };

            if (classroomData.isDismissed) {
                router.push('/class-dismissed');
                return;
            }
            
            setClassroom(classroomData);
            setIsLocked(classroomData.isLocked || false);
            setLoading(false);
        });

        return () => unsubscribeRef.current();
    }, [classroomId, listenForClassroom, sessionEnded, router]);

    // New effect to listen for submissions for the active question
    useEffect(() => {
        if (!classroomId || !activeQuestion?.id || sessionEnded) {
            setSubmissions([]);
            return;
        }

        const unsubscribe = listenForSubmissions(classroomId, activeQuestion.id, setSubmissions);
        return () => unsubscribe();

    }, [classroomId, activeQuestion?.id, listenForSubmissions, sessionEnded]);

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


    const handleVoteSubmit = async (answer: string | string[] | number | number[]) => {
        if (!classroomId || !studentId || !activeQuestion) return;
        await addSubmission(classroomId, activeQuestion.id, activeQuestion.question, activeQuestion.type, studentId, studentName, answer);
    };

    const handleClaimRace = async (): Promise<boolean> => {
        const studentAuthId = user?.uid;
        if (!classroomId || !studentAuthId || !activeRace) return false;
        return claimRace(classroomId, studentAuthId, studentName);
    };

    const handleLogout = () => {
        if (isLocked) return;
        if (classroomId) {
            // Explicitly set presence to offline before logging out
            if (studentId) {
                updateStudentPresence(classroomId, studentId, false);
            }
            router.push(`/join?classId=${classroomId}`);
        }
    };
    
    const handleRejoin = () => {
        setLoading(true);
        setSessionEnded(false);
    };

    let content;
    if (loading) {
        content = (
            <div className="flex flex-col items-center gap-4 text-foreground">
                <Loader2 className="h-12 w-12 animate-spin" />
                <p className="text-xl">{t('common.loading')}</p>
            </div>
        );
    } else if (sessionEnded) {
        content = (
            <Card className="w-full max-w-lg text-center animate-in fade-in-50">
                <CardHeader>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                        <LogOut className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{t('classroomPage.session_ended_title')}</CardTitle>
                    <CardDescription>{t('classroomPage.session_ended_description')}</CardDescription>
                </CardHeader>
                <CardFooter className="p-6 pt-2">
                    <Button onClick={handleRejoin} className="w-full">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {t('classroomPage.rejoin_session_button')}
                    </Button>
                </CardFooter>
            </Card>
        );
    } else if (activeRace) {
        content = <StudentRace key={activeRace.id} race={activeRace} studentId={user?.uid ?? null} onClaim={handleClaimRace} />;
    } else {
        const mySubmission = studentId ? submissions.find(sub => sub.studentId === studentId) : undefined;
        
        if (activeQuestion?.showAnswer) {
            content = <StudentAnswerResult question={activeQuestion} myAnswer={mySubmission?.answer ?? null} />;
        } else if (activeQuestion && !mySubmission) {
            content = <StudentQuestionForm question={activeQuestion} onVoteSubmit={handleVoteSubmit} />;
        } else {
            const messageCardTitle = activeQuestion
                ? t('classroomPage.submission_received_title')
                : t('classroomPage.welcome_title', { studentName });
            
            const messageCardDescription = activeQuestion
                ? t('classroomPage.submission_received_description')
                : t('classroomPage.welcome_description');

            content = (
                <Card className="w-full max-w-lg text-center animate-in fade-in-50">
                    <CardHeader>
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <PartyPopper className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">{messageCardTitle}</CardTitle>
                        <CardDescription>{messageCardDescription}</CardDescription>
                    </CardHeader>
                    <CardFooter className="p-6 pt-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-full">
                                        <Button
                                            variant="outline"
                                            onClick={handleLogout}
                                            className="w-full"
                                            disabled={isLocked}
                                            style={isLocked ? { pointerEvents: 'none' } : {}}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            {t('dashboard.sign_out')}
                                        </Button>
                                    </div>
                                </TooltipTrigger>
                                {isLocked && (
                                    <TooltipContent>
                                        <p>{t('classroomPage.logout_disabled_tooltip')}</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </CardFooter>
                </Card>
            );
        }
    }
    
    const showScore = !loading && !sessionEnded && classroom?.scores;

    return (
        <>
            {showScore && (
                <div className="absolute top-4 right-4 z-10 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    {myRank && (
                        <Badge variant="secondary" className="text-lg py-2 px-4 shadow-md border-primary/50">
                            <Award className="mr-2 h-5 w-5 text-primary" />
                            {t('classroomPage.your_rank', { rank: myRank })}
                        </Badge>
                    )}
                    <Badge variant="secondary" className="text-lg py-2 px-4 shadow-md border-primary/50">
                        <Trophy className="mr-2 h-5 w-5 text-amber-500" />
                        {t('classroomPage.your_score', { score: myScore })}
                    </Badge>
                </div>
            )}
            {content}
        </>
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
