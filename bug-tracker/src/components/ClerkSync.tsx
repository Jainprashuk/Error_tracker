import React, { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react'; // ✅ was @clerk/react
import { useAuthStore } from '../store/auth';

export const ClerkSync: React.FC = () => {
    const { getToken, isLoaded: authLoaded } = useAuth();
    const { user: clerkUser, isLoaded: userLoaded } = useUser();
    const { user: currentStoreUser, setUser, logout, setError } = useAuthStore();

    useEffect(() => {
        if (!authLoaded || !userLoaded) {
            console.log("[ClerkSync] Waiting for Clerk to load...");
            return;
        }

        const syncSession = async () => {
            if (clerkUser) {
                // Skip if already synced in this session to prevent infinite fetch loops
                if (currentStoreUser && localStorage.getItem("session")) {
                    console.log("[ClerkSync] User already in store, skipping redundant sync.");
                    return;
                }

                console.log("[ClerkSync] Starting synchronization for:", clerkUser.id);
                try {
                    const token = await getToken();
                    let mongoUserId = clerkUser.id;

                    // Use localhost (Standard for local dev) or manual override
                    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                    console.log("[ClerkSync] Fetching from:", `${apiUrl}/auth/clerk-sync`);

                    const syncRes = await fetch(`${apiUrl}/auth/clerk-sync`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            clerk_id: clerkUser.id,
                            email: clerkUser.primaryEmailAddress?.emailAddress || "",
                            name: clerkUser.fullName || clerkUser.firstName || "User"
                        })
                    });

                    if (syncRes.ok) {
                        const data = await syncRes.json();
                        mongoUserId = data.user_id;
                        console.log("[ClerkSync] Successfully synced. MongoID:", mongoUserId);

                        const localUser = {
                            id: mongoUserId,
                            name: clerkUser.fullName || clerkUser.firstName || "User",
                            email: clerkUser.primaryEmailAddress?.emailAddress || "",
                        };

                        localStorage.setItem("session", JSON.stringify({
                            user: localUser,
                            token: token
                        }));

                        setUser(localUser);
                    } else {
                        const errText = await syncRes.text();
                        console.error("[ClerkSync] Backend error:", syncRes.status, errText);
                        setError(`Sync failed (${syncRes.status}): Please check backend logs.`);
                    }
                } catch (e: any) {
                    console.error("[ClerkSync] Network or runtime error:", e);
                    setError(`Sync connection failed. Is the backend at http://localhost:8000 running?`);
                }
            } else {
                console.log("[ClerkSync] No Clerk user found, logging out.");
                logout();
            }
        };

        syncSession();
    }, [clerkUser, authLoaded, userLoaded, getToken, setUser, logout, setError, currentStoreUser]);

    return null; // Hidden synchronizer logic!
};
