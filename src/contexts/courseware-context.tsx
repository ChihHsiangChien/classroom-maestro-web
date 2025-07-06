
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  onSnapshot,
  orderBy,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/provider';
import type { QuestionData } from '@/components/create-poll-form';

// --- Types ---
export interface Activity extends QuestionData {
  id: string;
}

export interface Courseware {
  id: string;
  name: string;
  ownerId: string;
  activities: Activity[];
  order: number;
}


// --- Context ---
interface CoursewareContextType {
  coursewares: Courseware[];
  loading: boolean;
  addCourseware: (name: string) => Promise<void>;
  updateCourseware: (coursewareId: string, name: string) => Promise<void>;
  deleteCourseware: (coursewareId: string) => Promise<void>;
  addActivity: (coursewareId: string, activityData: QuestionData) => Promise<void>;
  updateActivity: (coursewareId: string, activityId: string, activityData: QuestionData) => Promise<void>;
  deleteActivity: (coursewareId: string, activityId: string) => Promise<void>;
  reorderActivities: (coursewareId: string, activities: Activity[]) => Promise<void>;
  reorderCoursewares: (reorderedCoursewares: Courseware[]) => Promise<void>;
  addCoursewareFromActivities: (name: string, activities: QuestionData[]) => Promise<void>;
  addMultipleActivities: (coursewareId: string, activitiesData: QuestionData[]) => Promise<void>;
  duplicateCourseware: (coursewareId: string) => Promise<void>;
  duplicateActivity: (coursewareId: string, activityId: string) => Promise<void>;
  moveActivity: (sourceCoursewareId: string, destinationCoursewareId: string, activityId: string) => Promise<void>;
}

const CoursewareContext = createContext<CoursewareContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export function CoursewareProvider({ children }: { children: React.ReactNode }) {
    const [coursewares, setCoursewares] = useState<Courseware[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, isAdmin } = useAuth();
    const { toast } = useToast();
    const { t } = useI18n();

    const handleFirestoreError = useCallback((error: any, action: string) => {
        console.error(`Courseware Error performing '${action}':`, error);
        toast({ variant: "destructive", title: t('common.error'), description: `Could not perform action '${action}'. Please try again.` });
    }, [toast, t]);

    useEffect(() => {
        if (user && db) {
            setLoading(true);
            
            let q;
            if (isAdmin) {
                // Admins can see all courseware, ordered by owner and then by custom order
                q = query(collection(db, "courseware"), orderBy("ownerId"), orderBy("order"));
            } else {
                // Regular users only see their own courseware
                q = query(collection(db, "courseware"), where("ownerId", "==", user.uid), orderBy("order"));
            }

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const fetchedCoursewares = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Courseware));
                setCoursewares(fetchedCoursewares);
                setLoading(false);
            }, (error) => {
                handleFirestoreError(error, 'fetch-courseware');
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setCoursewares([]);
            setLoading(false);
        }
    }, [user, isAdmin, handleFirestoreError]);

    const addCourseware = useCallback(async (name: string) => {
        if (!user || !db) return;
        try {
            const userCoursewares = coursewares.filter(cw => cw.ownerId === user.uid);
            const newOrder = userCoursewares.length > 0 ? Math.max(...userCoursewares.map(c => c.order || 0)) + 1 : 0;
            await addDoc(collection(db, "courseware"), { 
              name, 
              ownerId: user.uid, 
              activities: [],
              order: newOrder
            });
        } catch (error) {
            handleFirestoreError(error, 'add-courseware');
        }
    }, [user, handleFirestoreError, coursewares]);

    const updateCourseware = useCallback(async (coursewareId: string, name: string) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, 'courseware', coursewareId), { name });
        } catch (error) {
            handleFirestoreError(error, 'update-courseware');
        }
    }, [handleFirestoreError]);

    const deleteCourseware = useCallback(async (coursewareId: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'courseware', coursewareId));
            toast({ title: t('courseware.toast_package_deleted') });
        } catch (error) {
            handleFirestoreError(error, 'delete-courseware');
        }
    }, [t, toast, handleFirestoreError]);

    const findCourseware = useCallback((coursewareId: string) => {
        return coursewares.find(c => c.id === coursewareId);
    }, [coursewares]);

    const addActivity = useCallback(async (coursewareId: string, activityData: QuestionData) => {
        if (!db) return;
        const courseware = findCourseware(coursewareId);
        if (!courseware) return;
        
        const newActivity: Activity = { ...activityData, id: generateId() };
        const updatedActivities = [...(courseware.activities || []), newActivity];

        try {
            await updateDoc(doc(db, 'courseware', coursewareId), { activities: updatedActivities });
        } catch (error) {
            handleFirestoreError(error, 'add-activity');
        }
    }, [findCourseware, handleFirestoreError]);

    const addMultipleActivities = useCallback(async (coursewareId: string, activitiesData: QuestionData[]) => {
        if (!db) return;
        const courseware = findCourseware(coursewareId);
        if (!courseware) return;
        
        const newActivities: Activity[] = activitiesData.map(activity => ({
            ...activity,
            id: generateId()
        }));
        
        const updatedActivities = [...(courseware.activities || []), ...newActivities];

        try {
            await updateDoc(doc(db, 'courseware', coursewareId), { activities: updatedActivities });
        } catch (error) {
            handleFirestoreError(error, 'add-multiple-activities');
        }
    }, [findCourseware, handleFirestoreError]);
    
    const updateActivity = useCallback(async (coursewareId: string, activityId: string, activityData: QuestionData) => {
        if (!db) return;
        const courseware = findCourseware(coursewareId);
        if (!courseware) return;

        const updatedActivities = (courseware.activities || []).map(a => a.id === activityId ? { ...activityData, id: activityId } : a);
        
        try {
            await updateDoc(doc(db, 'courseware', coursewareId), { activities: updatedActivities });
            toast({ title: t('courseware.toast_activity_saved') });
        } catch (error) {
            handleFirestoreError(error, 'update-activity');
        }
    }, [findCourseware, t, toast, handleFirestoreError]);

    const deleteActivity = useCallback(async (coursewareId: string, activityId: string) => {
        if (!db) return;
        const courseware = findCourseware(coursewareId);
        if (!courseware) return;
        
        const updatedActivities = (courseware.activities || []).filter(a => a.id !== activityId);
        
        try {
            await updateDoc(doc(db, 'courseware', coursewareId), { activities: updatedActivities });
            toast({ title: t('courseware.toast_activity_deleted') });
        } catch (error) {
            handleFirestoreError(error, 'delete-activity');
        }
    }, [findCourseware, t, toast, handleFirestoreError]);
    
    const reorderActivities = useCallback(async (coursewareId: string, activities: Activity[]) => {
        if (!db) return;
        const courseware = findCourseware(coursewareId);
        if (!courseware) return;

        try {
            await updateDoc(doc(db, 'courseware', coursewareId), { activities });
        } catch (error) {
            handleFirestoreError(error, 'reorder-activities');
        }
    }, [findCourseware, handleFirestoreError]);

    const reorderCoursewares = useCallback(async (reorderedCoursewares: Courseware[]) => {
        if (!db) return;
        try {
            const batch = writeBatch(db);
            reorderedCoursewares.forEach((courseware, index) => {
                const coursewareRef = doc(db, 'courseware', courseware.id);
                batch.update(coursewareRef, { order: index });
            });
            await batch.commit();
        } catch (error) {
            handleFirestoreError(error, 'reorder-coursewares');
        }
    }, [handleFirestoreError]);

    const addCoursewareFromActivities = useCallback(async (name: string, activities: QuestionData[]) => {
        if (!user || !db) return;
        try {
            const userCoursewares = coursewares.filter(cw => cw.ownerId === user.uid);
            const newOrder = userCoursewares.length > 0 ? Math.max(...userCoursewares.map(c => c.order || 0)) + 1 : 0;
            const newActivitiesWithIds: Activity[] = activities.map(activity => ({
                ...activity,
                id: generateId()
            }));
            await addDoc(collection(db, "courseware"), { 
              name, 
              ownerId: user.uid, 
              activities: newActivitiesWithIds,
              order: newOrder
            });
        } catch (error) {
            handleFirestoreError(error, 'add-courseware-from-activities');
            throw error;
        }
    }, [user, coursewares, handleFirestoreError]);

    const duplicateCourseware = useCallback(async (coursewareId: string) => {
        if (!user || !db) return;
        const coursewareToDuplicate = coursewares.find(cw => cw.id === coursewareId);
        if (!coursewareToDuplicate) {
            handleFirestoreError(new Error("Courseware not found"), 'duplicate-courseware');
            return;
        }
        
        try {
            const userCoursewares = coursewares.filter(cw => cw.ownerId === user.uid);
            const newOrder = userCoursewares.length > 0 ? Math.max(...userCoursewares.map(c => c.order || 0)) + 1 : 0;
            
            const newActivities = (coursewareToDuplicate.activities || []).map(activity => ({
                ...activity,
                id: generateId()
            }));

            await addDoc(collection(db, "courseware"), { 
              name: `${coursewareToDuplicate.name} (${t('common.copy')})`,
              ownerId: user.uid, 
              activities: newActivities,
              order: newOrder
            });
            toast({ title: t('courseware.toast_package_duplicated') });
        } catch (error) {
            handleFirestoreError(error, 'duplicate-courseware');
        }
    }, [user, coursewares, handleFirestoreError, t, toast]);

    const duplicateActivity = useCallback(async (coursewareId: string, activityId: string) => {
        if (!db) return;
        const courseware = findCourseware(coursewareId);
        if (!courseware) return;

        const activityToDuplicate = (courseware.activities || []).find(a => a.id === activityId);
        if (!activityToDuplicate) return;

        const newActivity: Activity = { ...activityToDuplicate, id: generateId() };
        
        const originalIndex = (courseware.activities || []).findIndex(a => a.id === activityId);
        const updatedActivities = [...(courseware.activities || [])];
        updatedActivities.splice(originalIndex + 1, 0, newActivity);

        try {
            await updateDoc(doc(db, 'courseware', coursewareId), { activities: updatedActivities });
            toast({ title: t('courseware.toast_activity_duplicated') });
        } catch (error) {
            handleFirestoreError(error, 'duplicate-activity');
        }
    }, [findCourseware, handleFirestoreError, t, toast]);

    const moveActivity = useCallback(async (sourceCoursewareId: string, destinationCoursewareId: string, activityId: string) => {
        if (!db || sourceCoursewareId === destinationCoursewareId) return;

        try {
            await runTransaction(db, async (transaction) => {
                const sourceRef = doc(db, 'courseware', sourceCoursewareId);
                const destRef = doc(db, 'courseware', destinationCoursewareId);

                const sourceSnap = await transaction.get(sourceRef);
                const destSnap = await transaction.get(destRef);

                if (!sourceSnap.exists() || !destSnap.exists()) {
                    throw new Error("Source or destination courseware not found.");
                }

                const sourceData = sourceSnap.data() as Courseware;
                const destData = destSnap.data() as Courseware;

                const activityToMove = (sourceData.activities || []).find(a => a.id === activityId);
                if (!activityToMove) {
                    throw new Error("Activity not found in source courseware.");
                }
                
                const newSourceActivities = (sourceData.activities || []).filter(a => a.id !== activityId);
                const newDestActivities = [...(destData.activities || []), activityToMove];

                transaction.update(sourceRef, { activities: newSourceActivities });
                transaction.update(destRef, { activities: newDestActivities });
            });
            toast({ title: t('courseware.toast_activity_moved') });
        } catch (error) {
            handleFirestoreError(error, 'move-activity');
        }
    }, [handleFirestoreError, t, toast]);

    const value = useMemo(() => ({
        coursewares,
        loading,
        addCourseware,
        updateCourseware,
        deleteCourseware,
        addActivity,
        updateActivity,
        deleteActivity,
        reorderActivities,
        reorderCoursewares,
        addCoursewareFromActivities,
        addMultipleActivities,
        duplicateCourseware,
        duplicateActivity,
        moveActivity,
    }), [
        coursewares,
        loading,
        addCourseware,
        updateCourseware,
        deleteCourseware,
        addActivity,
        updateActivity,
        deleteActivity,
        reorderActivities,
        reorderCoursewares,
        addCoursewareFromActivities,
        addMultipleActivities,
        duplicateCourseware,
        duplicateActivity,
        moveActivity,
    ]);

    return (
        <CoursewareContext.Provider value={value}>
            {children}
        </CoursewareContext.Provider>
    );
}

export function useCourseware() {
  const context = useContext(CoursewareContext);
  if (context === undefined) {
    throw new Error('useCourseware must be used within a CoursewareProvider');
  }
  return context;
}
