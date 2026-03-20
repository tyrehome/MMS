import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// How long (ms) to wait for the profiles DB call before giving up and defaulting to 'staff'
const ROLE_FETCH_TIMEOUT_MS = 8000;

// Hard global fallback: if loading is STILL true after this many ms, force it false
// so the user is never permanently blocked
const GLOBAL_LOADING_TIMEOUT_MS = 10000;

const ROLE_CACHE_KEY = 'sb-user-role';

/**
 * Fetch role from the profiles table with a race-based timeout.
 */
const fetchRoleWithTimeout = async (uid) => {
    const fetchPromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();

    const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('timeout') }), ROLE_FETCH_TIMEOUT_MS)
    );

    try {
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        if (error) {
            console.warn('[Auth] Role fetch error/timeout, using fallback staff');
            return 'staff';
        }

        if (!data) {
            console.warn(`[Auth] No profile row found for UID: ${uid}. Defaulting to staff.`);
            return 'staff';
        }

        const normalizedRole = (data.role || 'staff').toLowerCase().trim();
        // Cache the role for next load
        localStorage.setItem(ROLE_CACHE_KEY, normalizedRole);
        return normalizedRole;
    } catch (err) {
        console.warn('[Auth] Unexpected error in fetchRole:', err);
        return 'staff';
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const handleAuth = async (session) => {
            if (!mounted) return;
            
            const currentUser = session?.user || null;
            // Support multiple owner/bypass emails for Sewwa
            const ownerEmails = [
                'sewwasofficial@gmail.com',
                'sewwas@gmail.com',
                'sewwa.mms@gmail.com',
                'sewwa.tms@gmail.com'
            ];
            
            if (currentUser) {
                const userEmail = (currentUser.email || '').toLowerCase().trim();
                const isOwner = ownerEmails.some(email => userEmail === email);

                // LAYER 1: Immediate Bypass for Owner
                if (isOwner) {
                    console.info('[Auth] Owner bypass active for:', userEmail);
                    setUser(currentUser);
                    setRole('admin');
                    setLoading(false);
                    // Continue with repair in background (non-blocking)
                    (async () => {
                        try {
                            const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', currentUser.id).maybeSingle();
                            if (!profile || profile.role !== 'admin') {
                                await supabase.from('profiles').upsert({
                                    id: currentUser.id,
                                    email: userEmail,
                                    role: 'admin',
                                    name: 'ADMIN_BYPASS'
                                });
                            }
                            localStorage.setItem(ROLE_CACHE_KEY, 'admin');
                        } catch (e) {
                            console.warn('[Auth] Background repair failed (non-critical):', e.message);
                        }
                    })();
                    return; // EXIT EARLY: User is unlocked as admin
                }

                // LAYER 2: Optimistic UI for others via Cache
                const cachedRole = localStorage.getItem(ROLE_CACHE_KEY);
                if (cachedRole && mounted) {
                    setUser(currentUser);
                    setRole(cachedRole);
                    setLoading(false);
                }

                // LAYER 3: Fresh Fetch for non-owners
                const userRole = await fetchRoleWithTimeout(currentUser.id);
                
                if (mounted) {
                    // Only update if it actually changed or if we are still loading
                    setUser(currentUser);
                    setRole(userRole);
                    setLoading(false);
                    // Update cache with the definitive role
                    localStorage.setItem(ROLE_CACHE_KEY, userRole);
                }
            } else {
                if (mounted) {
                    localStorage.removeItem(ROLE_CACHE_KEY);
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                }
            }
        };

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                await handleAuth(session);
            } catch (err) {
                console.error('[Auth] initAuth failed:', err);
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;
                
                // On sign in or refresh, re-run core logic
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                    await handleAuth(session);
                }

                if (event === 'SIGNED_OUT') {
                    localStorage.removeItem(ROLE_CACHE_KEY);
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                }
            }
        );

        // Global hard-timeout safety net (10 seconds)
        const globalTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[Auth] Global safety timeout reached — unlocking UI');
                setLoading(false);
            }
        }, GLOBAL_LOADING_TIMEOUT_MS);

        return () => {
            mounted = false;
            subscription?.unsubscribe();
            clearTimeout(globalTimeout);
        };
    }, []);

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('[Auth] Logout error:', err);
        } finally {
            // Always clear local state regardless of server response
            setUser(null);
            setRole(null);
            // Hard reload ensures all component state is fully cleared
            window.location.reload();
        }
    };

    const value = {
        user,
        role,
        isAdmin: role === 'admin',
        loading,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: 'linear-gradient(135deg, #f8fafd 0%, #eef2ff 100%)',
                    gap: 20,
                }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        border: '4px solid #e8eaf6',
                        borderTop: '4px solid #1a237e',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <div style={{
                        fontFamily: 'Outfit, Inter, sans-serif',
                        color: '#1a237e',
                        fontWeight: 700,
                        fontSize: 16,
                        letterSpacing: '-0.3px',
                    }}>
                        Loading Application...
                    </div>
                    <div style={{
                        fontFamily: 'Outfit, Inter, sans-serif',
                        color: '#94a3b8',
                        fontSize: 12,
                    }}>
                        Verifying session
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
