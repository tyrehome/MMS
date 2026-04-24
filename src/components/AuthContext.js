import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const ROLE_CACHE_KEY = 'sb-user-role';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(localStorage.getItem(ROLE_CACHE_KEY) || 'staff');
    const [loading, setLoading] = useState(true);
    const userRef = useRef(null);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        let mounted = true;

        const handleAuth = async (session) => {
            if (!mounted) return;
            const currentUser = session?.user || null;

            if (currentUser) {
                // 1. Get role from JWT metadata (Instant)
                let userRole = currentUser.app_metadata?.role || currentUser.user_metadata?.role || 'staff';
                
                if (mounted) {
                    setUser(currentUser);
                    setRole(userRole);
                    setLoading(false);
                    localStorage.setItem(ROLE_CACHE_KEY, userRole);
                }

                // 2. Refresh role from DB (Background)
                // We use a very simple query to avoid potential hangs
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', currentUser.id);
                    
                    if (mounted && !error && data && data.length > 0) {
                        const dbRole = data[0].role;
                        if (dbRole && dbRole !== userRole) {
                            setRole(dbRole);
                            localStorage.setItem(ROLE_CACHE_KEY, dbRole);
                        }
                    }
                } catch (e) {
                    // Ignore DB errors in background
                }
            } else {
                if (mounted) {
                    setUser(null);
                    setRole('staff');
                    setLoading(false);
                    localStorage.removeItem(ROLE_CACHE_KEY);
                }
            }
        };

        // Standard listener handles both initial load and changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleAuth(session);
        });

        // Fail-safe
        const timer = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 5000);

        return () => {
            mounted = false;
            subscription?.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem(ROLE_CACHE_KEY);
        window.location.reload();
    };

    return (
        <AuthContext.Provider value={{ user, role, isAdmin: role?.toLowerCase() === 'admin', loading, logout }}>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#020617' }}>
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
