
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
        // If the race is finished, determine the final state (won or just finished for spectators)
        if (race.status === 'finished') {
            setButtonState(race.winnerId === studentId ? 'won' : 'finished');
            return;
        }

        // If the race is pending, start the countdown timer.
        if (race.status === 'pending' && race.startTime) {
            // This is a more robust way to handle the countdown and activation
            
            // Timer for updating the visual countdown display
            const countdownInterval = setInterval(() => {
                const activationTime = race.startTime.toMillis() + 3000;
                const now = Date.now();
                const diff = activationTime - now;

                if (diff > 0) {
                    setCountdown(Math.ceil(diff / 1000));
                } else {
                    setCountdown(0);
                    clearInterval(countdownInterval); // Stop this interval once countdown is 0
                }
            }, 500);

            // Single, more reliable timer to activate the button
            const activationTimeMs = race.startTime.toMillis() + 3000;
            const delay = Math.max(0, activationTimeMs - Date.now());
            
            const activationTimeout = setTimeout(() => {
                setButtonState(current => (current === 'countdown' ? 'active' : current));
            }, delay);

            // Cleanup function
            return () => {
                clearInterval(countdownInterval);
                clearTimeout(activationTimeout);
            };
        }
    }, [race, studentId]);
    
    const handleClaim = async () => {
        if (buttonState !== 'active') return;
        setButtonState('claiming');
        const didWin = await onClaim();
        // If the claim failed (e.g., another student was faster), set state to 'lost'.
        // If it succeeded, the useEffect will catch the new 'finished' status from props and set state to 'won'.
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
