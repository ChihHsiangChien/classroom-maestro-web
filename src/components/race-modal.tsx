
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Frown, Hourglass } from 'lucide-react';
import type { RaceData } from '@/contexts/classroom-context';
import { useI18n } from '@/lib/i18n/provider';

interface RaceModalProps {
  race: RaceData | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}

export function RaceModal({ race, isOpen, onOpenChange, onReset }: RaceModalProps) {
  const { t } = useI18n();

  if (!isOpen || !race) {
    return null;
  }

  let content;
  let title;

  switch (race.status) {
    case 'pending':
      title = t('studentManagement.snatch_active');
      content = (
        <div className="flex flex-col items-center gap-4 py-6">
          <Hourglass className="h-16 w-16 text-primary animate-spin" />
          <p className="text-2xl font-bold">{t('studentManagement.snatch_countdown')}</p>
          <p className="text-muted-foreground">{t('classroomPage.snatch_waiting')}</p>
        </div>
      );
      break;
    case 'finished':
      title = t('studentManagement.snatch_finished_title');
      if (race.winnerName) {
        content = (
          <div className="flex flex-col items-center gap-4 py-6 text-amber-500">
            <Trophy className="h-16 w-16" />
            <p className="text-4xl font-bold">{race.winnerName}</p>
          </div>
        );
      } else {
        content = (
          <div className="flex flex-col items-center gap-4 py-6 text-destructive">
            <Frown className="h-16 w-16" />
            <p className="text-2xl font-bold">{t('studentManagement.snatch_no_winner')}</p>
          </div>
        );
      }
      break;
    default:
      return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">{title}</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter className="sm:justify-between sm:flex-row-reverse mt-2">
          <Button variant="outline" onClick={onReset}>{t('studentManagement.snatch_reset_button')}</Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
