
'use client';

import { CoursewareManagement } from '@/components/courseware-management';
import { useI18n } from '@/lib/i18n/provider';

export default function CoursewarePage() {
    const { t } = useI18n();
    return (
        <div className="container mx-auto max-w-5xl py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">{t('courseware.title')}</h1>
                <p className="text-muted-foreground">{t('courseware.description')}</p>
            </div>
            <CoursewareManagement />
        </div>
    )
}
