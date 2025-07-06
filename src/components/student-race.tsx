
'use client';

import { useState, useEffect, useRef } from 'react';
import type { RaceData } from '@/contexts/classroom-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/provider';
import { Trophy, Frown, Hourglass, Loader2 } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

interface StudentRaceProps {
  race: RaceData;
  studentId: string | null;
  onClaim: () => Promise<boolean>;
}

export function StudentRace({ race, studentId, onClaim }: StudentRaceProps) {
    const { t } = useI18n();
    const [countdown, setCountdown] = useState(3);
    const [buttonState, setButtonState] = useState<'countdown' | 'active' | 'claiming' | 'won' | 'lost' | 'finished'>('countdown');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // This effect handles the race state transitions
    useEffect(() => {
        // Stop any running intervals when the race data changes
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // --- FINAL STATES ---
        // If the race is finished, determine the final state (won or just finished for spectators)
        if (race.status === 'finished') {
            setButtonState(race.winnerId === studentId ? 'won' : 'finished');
            return;
        }

        // --- PENDING STATE ---
        // If the race is pending, start the countdown timer.
        if (race.status === 'pending' && race.startTime && 'toMillis' in race.startTime) {
            const activationTime = (race.startTime as Timestamp).toMillis() + 3000;

            const updateState = () => {
                const now = Date.now();
                if (now >= activationTime) {
                    // Time is up, activate the button if it's still in countdown
                    setButtonState(current => (current === 'countdown' ? 'active' : current));
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                } else {
                    // Still counting down, update the display
                    setCountdown(Math.ceil((activationTime - now) / 1000));
                }
            };
            
            // Immediately update state in case we're already past the activation time
            updateState();
            
            // Set up an interval to keep checking, which is robust against tab-out
            intervalRef.current = setInterval(updateState, 250);

        } else if (race.status === 'pending') {
            // This handles the case where the component renders before the server timestamp is available.
            // We just show a generic "Get Ready" state. The effect will re-run when `race.startTime` is populated.
             setButtonState('countdown');
             setCountdown(3);
        }

        // --- CLEANUP ---
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [race, studentId]);
    
    const handleClaim = async () => {
        if (buttonState !== 'active') return;
        setButtonState('claiming');
        const didWin = await onClaim();
        if(!didWin && buttonState !== 'won') {
             // Check buttonState again because the 'won' state might have been set by the useEffect
             // if the response was very fast.
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
                    <Loader2 className="h-16 w-16 text-muted-foreground animate-spin" />
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
