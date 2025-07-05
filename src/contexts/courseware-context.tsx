
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';
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
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/provider';
import type { QuestionData } from '@/components/create-poll-form';

// --- Types ---
export interface Activity extends QuestionData {
  id: string;
}

export interface Unit {
  id: string;
  name: string;
  activities: Activity[];
}

export interface CoursewarePackage {
  id: string;
  name: string;
  ownerId: string;
  units: Unit[];
}


// --- Context ---
interface CoursewareContextType {
  packages: CoursewarePackage[];
  loading: boolean;
  addPackage: (name: string) => Promise<void>;
  deletePackage: (packageId: string) => Promise<void>;
  addUnit: (packageId: string, unitName: string) => Promise<void>;
  deleteUnit: (packageId: string, unitId: string) => Promise<void>;
  addActivity: (packageId: string, unitId: string, activityData: QuestionData) => Promise<void>;
  updateActivity: (packageId: string, unitId: string, activityId: string, activityData: QuestionData) => Promise<void>;
  deleteActivity: (packageId: string, unitId: string, activityId: string) => Promise<void>;
  reorderActivities: (packageId: string, unitId: string, activities: Activity[]) => Promise<void>;
}

const CoursewareContext = createContext<CoursewareContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export function CoursewareProvider({ children }: { children: React.ReactNode }) {
    const [packages, setPackages] = useState<CoursewarePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    const { t } = useI18n();

    const handleFirestoreError = useCallback((error: any, action: string) => {
        console.error(`Courseware Error performing '${action}':`, error);
        toast({ variant: "destructive", title: t('common.error'), description: `Could not perform action '${action}'. Please try again.` });
    }, [toast, t]);

    useEffect(() => {
        if (user && db) {
            setLoading(true);
            const q = query(collection(db, "courseware"), where("ownerId", "==", user.uid));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const fetchedPackages = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as CoursewarePackage));
                setPackages(fetchedPackages);
                setLoading(false);
            }, (error) => {
                handleFirestoreError(error, 'fetch-courseware');
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            setPackages([]);
            setLoading(false);
        }
    }, [user, handleFirestoreError]);

    const addPackage = useCallback(async (name: string) => {
        if (!user || !db) return;
        try {
            await addDoc(collection(db, "courseware"), { name, ownerId: user.uid, units: [] });
        } catch (error) {
            handleFirestoreError(error, 'add-package');
        }
    }, [user, handleFirestoreError]);

    const deletePackage = useCallback(async (packageId: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'courseware', packageId));
            toast({ title: t('courseware.toast_package_deleted') });
        } catch (error) {
            handleFirestoreError(error, 'delete-package');
        }
    }, [t, toast, handleFirestoreError]);
    
    const findPackageAndUnit = useCallback((packageId: string, unitId: string) => {
        const pkg = packages.find(p => p.id === packageId);
        if (!pkg) return { pkg: null, unit: null, unitIndex: -1 };
        const unitIndex = pkg.units.findIndex(u => u.id === unitId);
        const unit = unitIndex > -1 ? pkg.units[unitIndex] : null;
        return { pkg, unit, unitIndex };
    }, [packages]);

    const addUnit = useCallback(async (packageId: string, unitName: string) => {
        if (!db) return;
        const newUnit: Unit = { id: generateId(), name: unitName, activities: [] };
        try {
            await updateDoc(doc(db, 'courseware', packageId), {
                units: arrayUnion(newUnit)
            });
        } catch (error) {
            handleFirestoreError(error, 'add-unit');
        }
    }, [handleFirestoreError]);

    const deleteUnit = useCallback(async (packageId: string, unitId: string) => {
        if (!db) return;
        const { pkg, unit } = findPackageAndUnit(packageId, unitId);
        if (!pkg || !unit) return;
        try {
            await updateDoc(doc(db, 'courseware', packageId), {
                units: arrayRemove(unit)
            });
            toast({ title: t('courseware.toast_unit_deleted') });
        } catch (error) {
            handleFirestoreError(error, 'delete-unit');
        }
    }, [t, toast, handleFirestoreError, findPackageAndUnit]);

    const addActivity = useCallback(async (packageId: string, unitId: string, activityData: QuestionData) => {
        if (!db) return;
        const { pkg, unit, unitIndex } = findPackageAndUnit(packageId, unitId);
        if (!pkg || !unit) return;
        
        const newActivity: Activity = { ...activityData, id: generateId() };
        const updatedUnit = { ...unit, activities: [...unit.activities, newActivity] };
        const newUnits = [...pkg.units];
        newUnits[unitIndex] = updatedUnit;

        try {
            await updateDoc(doc(db, 'courseware', packageId), { units: newUnits });
        } catch (error) {
            handleFirestoreError(error, 'add-activity');
        }
    }, [findPackageAndUnit, handleFirestoreError]);
    
    const updateActivity = useCallback(async (packageId: string, unitId: string, activityId: string, activityData: QuestionData) => {
        if (!db) return;
        const { pkg, unit, unitIndex } = findPackageAndUnit(packageId, unitId);
        if (!pkg || !unit) return;

        const updatedActivities = unit.activities.map(a => a.id === activityId ? { ...activityData, id: activityId } : a);
        const updatedUnit = { ...unit, activities: updatedActivities };
        const newUnits = [...pkg.units];
        newUnits[unitIndex] = updatedUnit;
        
        try {
            await updateDoc(doc(db, 'courseware', packageId), { units: newUnits });
            toast({ title: t('courseware.toast_activity_saved') });
        } catch (error) {
            handleFirestoreError(error, 'update-activity');
        }
    }, [findPackageAndUnit, t, toast, handleFirestoreError]);

    const deleteActivity = useCallback(async (packageId: string, unitId: string, activityId: string) => {
        if (!db) return;
        const { pkg, unit, unitIndex } = findPackageAndUnit(packageId, unitId);
        if (!pkg || !unit) return;
        
        const updatedActivities = unit.activities.filter(a => a.id !== activityId);
        const updatedUnit = { ...unit, activities: updatedActivities };
        const newUnits = [...pkg.units];
        newUnits[unitIndex] = updatedUnit;
        
        try {
            await updateDoc(doc(db, 'courseware', packageId), { units: newUnits });
            toast({ title: t('courseware.toast_activity_deleted') });
        } catch (error) {
            handleFirestoreError(error, 'delete-activity');
        }
    }, [findPackageAndUnit, t, toast, handleFirestoreError]);
    
    const reorderActivities = useCallback(async (packageId: string, unitId: string, activities: Activity[]) => {
        if (!db) return;
        const { pkg, unit, unitIndex } = findPackageAndUnit(packageId, unitId);
        if (!pkg || !unit) return;

        const updatedUnit = { ...unit, activities };
        const newUnits = [...pkg.units];
        newUnits[unitIndex] = updatedUnit;

        try {
            await updateDoc(doc(db, 'courseware', packageId), { units: newUnits });
        } catch (error) {
            handleFirestoreError(error, 'reorder-activities');
        }
    }, [findPackageAndUnit, handleFirestoreError]);

    const value = useMemo(() => ({
        packages,
        loading,
        addPackage,
        deletePackage,
        addUnit,
        deleteUnit,
        addActivity,
        updateActivity,
        deleteActivity,
        reorderActivities,
    }), [
        packages,
        loading,
        addPackage,
        deletePackage,
        addUnit,
        deleteUnit,
        addActivity,
        updateActivity,
        deleteActivity,
        reorderActivities,
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
