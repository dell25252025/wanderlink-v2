'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
    const [user] = useAuthState(auth);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const notificationsRef = collection(db, `users/${user.uid}/notifications`);
        const q = query(notificationsRef, where('read', '==', false));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [user]);

    const handleBellClick = () => {
        router.push('/notifications');
    };

    return (
        <button onClick={handleBellClick} className="relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {unreadCount}
                </span>
            )}
        </button>
    );
}
