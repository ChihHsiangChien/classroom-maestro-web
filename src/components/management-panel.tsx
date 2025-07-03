
"use client";

import React from 'react';
import QRCode from "qrcode.react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, Clapperboard, AlertTriangle } from 'lucide-react';
import { useI18n } from "@/lib/i18n/provider";
import type { Classroom, Submission } from '@/contexts/classroom-context';
import type { QuestionData } from "./create-poll-form";

interface ManagementPanelProps {
  classroom: Classroom;
  submissions: Submission[];
  joinUrl: string;
  activeQuestion: QuestionData | null;
}

export function ManagementPanel({ classroom, submissions, joinUrl, activeQuestion }: ManagementPanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const submittedIds = new Set(submissions.map(s => s.studentId));

  const QR_CODE_URL_MAX_LENGTH = 2000;
  const canDisplayQrCode = joinUrl && joinUrl.length < QR_CODE_URL_MAX_LENGTH;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    toast({
      title: t('studentManagement.copy_button_toast_title'),
      description: t('studentManagement.copy_button_toast_description'),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('studentManagement.title')}</CardTitle>
          <CardDescription>{t('studentManagement.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-2 border rounded-md bg-white">
              {canDisplayQrCode ? (
                <QRCode value={joinUrl} size={128} />
              ) : joinUrl ? (
                <div className="w-32 h-32 flex flex-col items-center justify-center bg-muted text-muted-foreground p-2 text-center">
                  <AlertTriangle className="h-6 w-6 mb-2" />
                  <p className="text-xs">{t('studentManagement.url_too_long_for_qr')}</p>
                </div>
              ) : (
                <div className="w-32 h-32 bg-gray-200 animate-pulse rounded-md" />
              )}
            </div>
            <p className="text-sm font-medium">{t('studentManagement.scan_to_join')}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('studentManagement.classroom_url_label')}</label>
            <div className="flex items-center gap-2">
              <Input value={joinUrl} readOnly />
              <Button size="icon" variant="outline" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-4">
            <CardTitle>{t('activePoll.submission_status_card_title')}</CardTitle>
            <CardDescription>
                {t('activePoll.submission_status_card_description', { submissionsCount: submissions.length, studentsCount: classroom.students.length })}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-64">
                <div className="space-y-2 pr-4">
                    {classroom.students.map(student => {
                        const hasSubmitted = submittedIds.has(student.id);
                        return (
                            <div key={student.id} className="flex items-center justify-between rounded-md p-2 bg-muted/50">
                                <p className="font-medium">{student.name}</p>
                                {hasSubmitted ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="h-5 w-5" />
                                        <span>{t('activePoll.submitted_status')}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">Waiting...</span>
                                )}
                            </div>
                        )
                    })}
                    {classroom.students.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">{t('studentManagement.no_students_logged_in_message')}</p>
                    )}
                </div>
            </ScrollArea>
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {t('teacherDashboard.lesson_status_card_title')}
          </CardTitle>
          <Clapperboard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold">
            {activeQuestion ? t('teacherDashboard.question_active') : t('teacherDashboard.idle')}
          </div>
          <p className="text-xs text-muted-foreground">
            {activeQuestion
              ? t('teacherDashboard.responses_count', { submissionsCount: submissions.length, studentsCount: classroom.students.length })
              : t('teacherDashboard.start_a_question_prompt')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
