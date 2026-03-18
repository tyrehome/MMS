import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    // Start as true — stays true until we have BOTH session + role resolved
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        /**
         * Fetch the user's role from the profiles table.
         * Returns the role string, never throws.
         */
        const fetchRole = async (uid) => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', uid)
                    .single();

                if (error) {
                    // PGRST116 = no row yet, default to staff
                    return 'staff';
                }
                return data?.role || 'staff';
            } catch {
                return 'staff';
            }
        };

        /**
         * onAuthStateChange is the SINGLE source of truth for session state.
         * It fires immediately on mount with the current session (or null).
         * We wait for fetchRole to finish BEFORE setting loading = false.
         */
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                const currentUser = session?.user || null;
                setUser(currentUser);

                if (currentUser) {
                    // Wait for role BEFORE marking load complete
                    const userRole = await fetchRole(currentUser.id);
                    if (mounted) {
                        setRole(userRole);
                        setLoading(false);
                    }
                } else {
                    // Logged out or no session
                    setRole(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        // Hard reload clears all React state and returns to login screen
        window.location.reload();
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
                    background: '#f8fafd',
                    gap: 16,
                }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        border: '4px solid #e8eaf6',
                        borderTop: '4px solid #1a237e',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <div style={{ fontFamily: 'Outfit, sans-serif', color: '#1a237e', fontWeight: 700, fontSize: 16 }}>
                        Loading Application...
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
