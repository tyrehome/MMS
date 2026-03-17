import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    Box, Button, TextField, Typography, Paper, Container, Alert,
    Link, CircularProgress, Fade, InputAdornment, IconButton
} from '@mui/material';
import { styled } from '@mui/material/styles';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';

const Background = styled(Box)({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e293b 100%)',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
        content: '""',
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 30%, rgba(37, 99, 235, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)',
        animation: 'pulse 10s infinite alternate',
    },
    '@keyframes pulse': {
        '0%': { transform: 'scale(1)' },
        '100%': { transform: 'scale(1.1)' },
    }
});

const GlassPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    width: '100%',
    borderRadius: 24,
    textAlign: 'center',
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    color: '#fff',
}));

const StyledTextField = styled(TextField)({
    '& .MuiOutlinedInput-root': {
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        color: '#fff',
        '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.25)',
        },
        '&.Mui-focused fieldset': {
            borderColor: '#3b82f6',
        },
    },
    '& .MuiInputLabel-root': {
        color: 'rgba(255, 255, 255, 0.5)',
    },
    margin: '12px 0',
});

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [branding, setBranding] = useState({ name: 'Dost Auto Tires', logoUrl: '' });

    useEffect(() => {
        const fetchBranding = async () => {
            const { data, error } = await supabase
                .from('business_settings')
                .select('*')
                .limit(1)
                .single();

            if (!error && data) {
                setBranding({
                    name: data.name,
                    logoUrl: data.logo_url
                });
            }
        };

        fetchBranding();

        const subscription = supabase
            .channel('public:business_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'business_settings' }, payload => {
                if (payload.new) {
                    setBranding({
                        name: payload.new.name,
                        logoUrl: payload.new.logo_url
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (loginError) throw loginError;
        } catch (err) {
            setError('Login failed. Please check your credentials.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }
        setLoading(true);
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password',
            });
            if (resetError) throw resetError;
            setError('');
            alert('Password reset email sent! Check your inbox.');
        } catch (err) {
            setError('Failed to send reset email. Verify your address.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Background>
            <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
                <Fade in={true} timeout={1000}>
                    <GlassPaper elevation={0}>
                        <Box sx={{ mb: 4 }}>
                            <Box sx={{
                                display: 'inline-flex',
                                p: branding.logoUrl ? 0 : 2,
                                borderRadius: '50%',
                                background: branding.logoUrl ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                                border: branding.logoUrl ? 'none' : '1px solid rgba(59, 130, 246, 0.2)',
                                mb: 2,
                                overflow: 'hidden'
                            }}>
                                {branding.logoUrl ? (
                                    <img src={branding.logoUrl} alt="Logo" style={{ height: 60 }} />
                                ) : (
                                    <BuildCircleIcon sx={{ fontSize: 40, color: '#3b82f6' }} />
                                )}
                            </Box>
                            <Typography variant="h4" fontWeight="800" letterSpacing="-0.5px">
                                {branding.name}
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 1 }}>
                                Authorized cloud management console
                            </Typography>
                        </Box>

                        {error && (
                            <Alert
                                severity="error"
                                variant="filled"
                                sx={{
                                    mb: 3,
                                    borderRadius: 3,
                                    backgroundColor: 'rgba(220, 38, 38, 0.2)',
                                    color: '#fecaca',
                                    border: '1px solid rgba(220, 38, 38, 0.3)'
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                            <StyledTextField
                                required
                                fullWidth
                                label="Email Address"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon sx={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <StyledTextField
                                required
                                fullWidth
                                name="password"
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon sx={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword(!showPassword)}
                                                edge="end"
                                                sx={{ color: 'rgba(255, 255, 255, 0.3)' }}
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                disabled={loading}
                                sx={{
                                    mt: 4,
                                    mb: 2,
                                    py: 1.8,
                                    borderRadius: 3,
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    backgroundColor: '#2563eb',
                                    textTransform: 'none'
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Log In'}
                            </Button>

                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                <Link
                                    component="button"
                                    type="button"
                                    variant="body2"
                                    onClick={handleResetPassword}
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.4)',
                                        textDecoration: 'none',
                                        '&:hover': { color: '#fff' }
                                    }}
                                >
                                    Forgot Password?
                                </Link>
                            </Box>

                            <Typography variant="body2" sx={{ mt: 3, color: 'rgba(255, 255, 255, 0.4)' }}>
                                Public registration is disabled. <br />
                                Contact administrator to create an account.
                            </Typography>
                        </Box>
                    </GlassPaper>
                </Fade>
            </Container>
        </Background>
    );
};

export default Login;
