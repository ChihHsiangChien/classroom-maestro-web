
'use client';

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type AiFeature = 
    | 'generatePoll' 
    | 'generateImage' 
    | 'analyzeShortAnswers' 
    | 'generateQuestionsFromText';

interface UsageContextType {
  logAiUsage: (feature: AiFeature) => Promise<void>;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function UsageProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();

    const logAiUsage = useCallback(async (feature: AiFeature) => {
        if (!user || !db) return;
        try {
            await addDoc(collection(db, 'aiUsageLogs'), {
                userId: user.uid,
                userEmail: user.email || 'N/A', // Denormalize for easier display
                feature: feature,
                timestamp: serverTimestamp(),
            });
        } catch (error) {
            console.error("Failed to log AI usage", error);
        }
    }, [user]);

    const value = useMemo(() => ({ logAiUsage }), [logAiUsage]);

    return (
        <UsageContext.Provider value={value}>
            {children}
        </UsageContext.Provider>
    );
}

export function useUsage() {
    const context = useContext(UsageContext);
    if (context === undefined) {
        throw new Error('useUsage must be used within a UsageProvider');
    }
    return context;
}
