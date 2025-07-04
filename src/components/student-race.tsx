'use client';

import { useState, useEffect } from 'react';
import type { RaceData } from '@/contexts/classroom-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/provider';
import { Trophy, Frown, Hourglass } from 'lucide-react';

interface StudentRaceProps {
  race: RaceData;
  studentId: string | null;
  onClaim: () => Promise<boolean>;
}

export function StudentRace({ race, studentId, onClaim }: StudentRaceProps) {
    const { t } = useI18n();
    const [countdown, setCountdown] = useState(3);
    const [buttonState, setButtonState] = useState<'countdown' | 'active' | 'claiming' | 'won' | 'lost' | 'finished'>('countdown');

    useEffect(() => {
        if (race.status === 'finished') {
            setButtonState(race.winnerId === studentId ? 'won' : 'finished');
            return;
        }

        if (race.status === 'pending' && race.startTime) {
             const activationTime = race.startTime.toMillis() + 3000;
            const interval = setInterval(() => {
                const now = Date.now();
                const diff = activationTime - now;

                if (diff <= 0) {
                    setCountdown(0);
                    if (buttonState === 'countdown') {
                       setButtonState('active');
                    }
                    clearInterval(interval);
                } else {
                    setCountdown(Math.ceil(diff / 1000));
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, [race, studentId, buttonState]);
    
    const handleClaim = async () => {
        if (buttonState !== 'active') return;
        setButtonState('claiming');
        const didWin = await onClaim();
        // The useEffect will catch the 'finished' status from props and update the UI correctly.
        // This local state change is just for immediate feedback.
        if(!didWin) {
            setButtonState('lost');
        }
    };
    
    let content;
    switch (buttonState) {
        case 'countdown':
            content = (
                <div className="flex flex-col items-center gap-4">
                    <Hourglass className="h-16 w-16 text-primary animate-spin" style={{ animationDuration: '3s' }}/>
                    <p className="text-6xl font-bold tabular-nums">{countdown}</p>
                    <p className="text-muted-foreground">{t('classroomPage.snatch_countdown')}</p>
                </div>
            );
            break;
        case 'active':
            content = (
                 <Button onClick={handleClaim} className="w-full h-32 text-4xl font-bold animate-pulse bg-accent hover:bg-accent/90">
                    {t('classroomPage.snatch_go')}
                 </Button>
            );
            break;
        case 'claiming':
             content = (
                <div className="flex flex-col items-center gap-4">
                    <Hourglass className="h-16 w-16 text-muted-foreground animate-spin" />
                    <p className="text-xl text-muted-foreground">{t('classroomPage.snatch_waiting')}</p>
                </div>
            );
            break;
        case 'won':
            content = (
                <div className="flex flex-col items-center gap-4 text-green-500">
                    <Trophy className="h-16 w-16" />
                    <p className="text-4xl font-bold">{t('classroomPage.snatch_you_won')}</p>
                </div>
            );
            break;
        case 'lost':
             content = (
                <div className="flex flex-col items-center gap-4 text-destructive">
                    <Frown className="h-16 w-16" />
                    <p className="text-4xl font-bold">{t('classroomPage.snatch_too_slow')}</p>
                </div>
            );
            break;
        case 'finished':
            content = (
                 <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Trophy className="h-16 w-16" />
                    <p className="text-2xl font-bold">{t('classroomPage.snatch_winner_was', { name: race.winnerName || '' })}</p>
                </div>
            );
            break;
        default:
             content = null;
    }

    return (
        <Card className="w-full max-w-lg text-center animate-in fade-in-50">
            <CardHeader>
                <CardTitle className="text-2xl">{t('studentManagement.snatch_button')}</CardTitle>
            </CardHeader>
            <CardContent className="p-10">
                {content}
            </CardContent>
        </Card>
    );
}
