
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, BrainCircuit } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/lib/i18n/provider';
import type { AiFeature } from '@/contexts/usage-context';

interface UsageLog {
  id: string;
  userId: string;
  userEmail: string;
  feature: AiFeature;
  timestamp: Timestamp;
}

export default function AiUsagePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();

  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (!isAdmin || !db) return;

    setLoadingData(true);
    const logsRef = collection(db, 'aiUsageLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UsageLog[];
      setLogs(fetchedLogs);
      setLoadingData(false);
    }, (error) => {
      console.error("Error fetching AI usage logs:", error);
      setLoadingData(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const featureUsageData = useMemo(() => {
    const counts = logs.reduce((acc, log) => {
      acc[log.feature] = (acc[log.feature] || 0) + 1;
      return acc;
    }, {} as { [key in AiFeature]: number });

    return Object.entries(counts).map(([name, count]) => ({
      name: t(`ai_usage.feature_name_${name}`),
      count,
    }));
  }, [logs, t]);

  const dailyUsageData = useMemo(() => {
    const counts = logs.reduce((acc, log) => {
      if (log.timestamp) {
        const date = format(log.timestamp.toDate(), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [logs]);

  if (authLoading || loadingData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-7xl py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{t('ai_usage.title')}</h1>
        <p className="text-muted-foreground">{t('ai_usage.description')}</p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('ai_usage.usage_by_feature_chart_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {featureUsageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <BarChart data={featureUsageData} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" barSize={30} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                 <div className="flex items-center justify-center h-[300px] text-muted-foreground">{t('ai_usage.no_data')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('ai_usage.usage_over_time_chart_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyUsageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" name="Calls" />
                </LineChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">{t('ai_usage.no_data')}</div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('ai_usage.raw_logs_table_title')}</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="max-h-[500px] overflow-y-auto border rounded-md">
            <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                    <TableHead>{t('ai_usage.table_header_feature')}</TableHead>
                    <TableHead>{t('ai_usage.table_header_user')}</TableHead>
                    <TableHead>{t('ai_usage.table_header_timestamp')}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {logs.length > 0 ? logs.map((log) => (
                    <TableRow key={log.id}>
                        <TableCell className="font-medium">{t(`ai_usage.feature_name_${log.feature}`)}</TableCell>
                        <TableCell>{log.userEmail}</TableCell>
                        <TableCell>{log.timestamp ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}</TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">{t('ai_usage.no_data')}</TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
