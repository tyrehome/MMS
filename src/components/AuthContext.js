import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
                setLoading(false);
            }
        };

        getInitialSession();

        // 2. Listen for auth changes
        const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user || null;
                setUser(currentUser);

                if (currentUser) {
                    await fetchProfile(currentUser);
                } else {
                    setRole(null);
                }
                setLoading(false);
            }
        );

        return () => {
            authListener?.unsubscribe();
        };
    }, []);

    const fetchProfile = async (currentUser) => {
        try {
            // Force admin for the owner
            if (
                currentUser.email?.toLowerCase() === 'sewwasofficial@gmail.com' ||
                currentUser.email?.toLowerCase() === 'sewwasofficialz@gmail.com'
            ) {
                setRole('admin');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', currentUser.id)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
                setRole('staff');
            } else {
                setRole(data?.role || 'staff');
            }
        } catch (err) {
            setRole('staff');
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
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
