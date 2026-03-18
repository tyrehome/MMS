import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // Safety net: if loading hasn't resolved in 5s, force it to stop
        const safetyTimeout = setTimeout(() => {
            if (mounted) {
                console.warn('AuthContext: session check timed out, forcing load complete.');
                setLoading(false);
            }
        }, 5000);

        // 1. Get initial session
        const getInitialSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;
                
                if (data && data.session) {
                    setUser(data.session.user);
                    await fetchProfile(data.session.user);
                }
            } catch (err) {
                console.error("Session initialization error:", err);
            } finally {
                if (mounted) {
                    clearTimeout(safetyTimeout);
                    setLoading(false);
                }
            }
        };

        getInitialSession();

        // 2. Listen for auth changes
        const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user || null;
                if (mounted) setUser(currentUser);

                if (currentUser) {
                    await fetchProfile(currentUser);
                } else {
                    if (mounted) setRole(null);
                }
                if (mounted) setLoading(false);
            }
        );

        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
            authListener?.unsubscribe();
        };
    }, []);

    const fetchProfile = async (currentUser) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', currentUser.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No profile row yet — default to staff
                    console.warn('No profile row found for user, defaulting to staff.');
                    setRole('staff');
                } else {
                    console.error('Error fetching profile:', error);
                    setRole('staff');
                }
            } else {
                // Use whatever role is stored in the database (admin, staff, etc.)
                setRole(data?.role || 'staff');
            }
        } catch (err) {
            console.error('fetchProfile error:', err);
            setRole('staff');
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        // Force a hard reload to clear all in-memory state and return to the login screen
        window.location.reload();
    };

    const value = {
        user,
        role,
        isAdmin: role === 'admin',
        loading,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafd' }}>
                    <div style={{ fontFamily: 'sans-serif', color: '#1a237e', fontWeight: 'bold' }}>Loading Application...</div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
