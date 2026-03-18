import React, { useState, useEffect } from 'react';
import {
    Box, Typography, TextField, Button, Grid,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, CircularProgress, Avatar, Chip, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import SaveIcon from '@mui/icons-material/Save';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import { createClient } from '@supabase/supabase-js';

const Settings = ({ businessProfile: propBusinessProfile, masterData: propMasterData }) => {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Local state for forms (synced with props via useEffect or just used for submission)
    const [businessProfile, setBusinessProfile] = useState(propBusinessProfile);
    const [masterData, setMasterData] = useState(propMasterData);
    const [newItem, setNewItem] = useState({ type: '', value: '' });

    // Users & Invitations State
    const [users, setUsers] = useState([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState('staff');

    useEffect(() => {
        setBusinessProfile(propBusinessProfile);
    }, [propBusinessProfile]);

    useEffect(() => {
        setMasterData(propMasterData);
    }, [propMasterData]);

    useEffect(() => {
        if (!currentUser) return;

        const fetchUsersAndInvitations = async () => {
            setLoading(true);
            try {
                const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
                if (pError) throw pError;
                setUsers(profiles || []);
            } catch (err) {
                console.error("Error fetching users/invites:", err);
                setError('Failed to load user data.');
            } finally {
                setLoading(false);
            }
        };

        fetchUsersAndInvitations();

        // Subscriptions
        const profilesChannel = supabase.channel('profiles-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchUsersAndInvitations)
            .subscribe();

        const invitesChannel = supabase.channel('invitations-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, fetchUsersAndInvitations)
            .subscribe();

        return () => {
            supabase.removeChannel(profilesChannel);
            supabase.removeChannel(invitesChannel);
        };
    }, [currentUser]);

    const handleMasterDataAdd = async (type) => {
        if (!newItem.value) return;
        setSaving(true);
        try {
            const { error: err } = await supabase.from('master_data').insert([{
                type: type,
                value: newItem.value
            }]);
            if (err) throw err;
            setNewItem({ type: '', value: '' });
            setSuccess(`Added to ${type} successfully!`);
        } catch (err) {
            setError('Failed to update master data.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleMasterDataDelete = async (type, value) => {
        setSaving(true);
        try {
            const { error: err } = await supabase.from('master_data').delete().match({ type, value });
            if (err) throw err;
            setSuccess(`Removed from ${type} successfully!`);
        } catch (err) {
            setError('Failed to update master data.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setSaving(true);
        setError('');
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            setBusinessProfile({ ...businessProfile, logo_url: publicUrl });
            setSuccess('Logo uploaded! Click update to save changes.');
        } catch (err) {
            console.error("Error uploading logo:", err);
            setError('Failed to upload logo.');
        } finally {
            setSaving(false);
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        // Prepare object for DB (ensure no extra local-only fields if any, though businessProfile seems fine)
        const profileToSave = {
            name: businessProfile.name,
            logo_url: businessProfile.logo_url,
            currency: businessProfile.currency,
            address: businessProfile.address
        };

        try {
            const { data: existing } = await supabase.from('business_settings').select('id');
            let err;
            if (existing && existing.length > 0) {
                const { error } = await supabase.from('business_settings').update(profileToSave).eq('id', existing[0].id);
                err = error;
            } else {
                const { error } = await supabase.from('business_settings').insert([profileToSave]);
                err = error;
            }
            if (err) throw err;
            setSuccess('Business profile updated successfully!');
        } catch (err) {
            setError('Failed to update profile.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUserEmail || !newUserName || !newUserPassword) {
            setError('Please supply Name, Email, and Password.');
            return;
        }

        setSaving(true);
        try {
            const emailClean = newUserEmail.toLowerCase().trim();

            // 1. Create a non-persistent auth client to sign up the new user 
            // without signing out the current admin
            const tempSupabase = createClient(
                process.env.REACT_APP_SUPABASE_URL,
                process.env.REACT_APP_SUPABASE_ANON_KEY,
                { auth: { autoRefreshToken: false, persistSession: false } }
            );

            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email: emailClean,
                password: newUserPassword,
                options: {
                    data: { name: newUserName }
                }
            });

            if (authError) {
                // If user exists, authError code might be 'user_already_exists'. 
                // We'll proceed with upserting the profile anyway just in case the profile wasn't set.
                if (authError.message.includes('already exists')) {
                    console.log('User already exists in Auth, updating profile instead.');
                } else {
                    throw authError;
                }
            }
            
            // Get user ID. If user was just created, it's in authData.user.
            let newUserId = authData?.user?.id;
            
            // If we couldn't get ID because user existed, fetch from profiles or fail
            if (!newUserId) {
                const existingUser = users.find(u => u.email?.toLowerCase() === emailClean);
                if (existingUser) {
                    newUserId = existingUser.id;
                } else {
                    // Try to guess from invitations or fail
                    throw new Error('User exists but not in profiles. Cannot update.');
                }
            }

            // 2. Update profiles chart with new role
            const { error: pError } = await supabase.from('profiles').upsert({
                id: newUserId,
                email: emailClean,
                name: newUserName,
                role: newUserRole
            });
            if (pError) throw pError;

            // Remove from invitations if present, just housekeeping
            await supabase.from('invitations').delete().eq('email', emailClean);

            setSuccess(`User ${emailClean} created/updated as ${newUserRole}.`);
            setNewUserEmail('');
            setNewUserName('');
            setNewUserPassword('');
        } catch (err) {
            setError(err.message || 'Failed to add user.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (userEmail === currentUser?.email) {
            setError('You cannot remove your own account.');
            return;
        }

        if (window.confirm(`Are you sure you want to remove access for ${userEmail}?`)) {
            setSaving(true);
            try {
                // Update profile role to revoked
                const { error: pError } = await supabase.from('profiles').update({ role: 'revoked' }).eq('id', userId);
                if (pError) throw pError;

                // Remove or update invitation
                await supabase.from('invitations').delete().eq('email', userEmail.toLowerCase());

                setSuccess(`Access revoked for ${userEmail}`);
            } catch (err) {
                setError('Failed to revoke user access.');
                console.error(err);
            } finally {
                setSaving(false);
            }
        }
    };

    const handleRoleToggle = async (user) => {
        if (user.email === currentUser?.email) {
            setError('You cannot change your own role.');
            return;
        }

        const newRole = user.role === 'admin' ? 'staff' : 'admin';
        setSaving(true);
        try {
            const { error: pError } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
            if (pError) throw pError;

            // Sync with invitation list if it exists
            await supabase.from('invitations').update({ role: newRole }).eq('email', user.email.toLowerCase());

            setSuccess(`Changed ${user.email} role to ${newRole}`);
        } catch (err) {
            setError('Failed to change user role.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading && users.length === 0) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>System Administration</Typography>
                    <Typography variant="body1" color="text.secondary">Configure business identifiers, master data lists, and user permissions</Typography>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }}>{success}</Alert>}

            <Grid container spacing={4}>
                {/* Business Profile Section */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.02)' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}><BusinessIcon /></Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>Business Profile</Typography>
                            </Box>

                            <form onSubmit={handleProfileSave}>
                                <Grid container spacing={2.5}>
                                    <Grid item xs={12}>
                                        <TextField fullWidth label="Business Name" value={businessProfile.name || ''} onChange={(e) => setBusinessProfile({ ...businessProfile, name: e.target.value })} variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                            {businessProfile.logo_url && (
                                                <Avatar 
                                                    src={businessProfile.logo_url} 
                                                    variant="rounded" 
                                                    sx={{ width: 64, height: 64, border: '1px solid rgba(0,0,0,0.1)' }} 
                                                />
                                            )}
                                            <Button
                                                variant="outlined"
                                                component="label"
                                                disabled={saving}
                                                sx={{ borderRadius: 3 }}
                                            >
                                                Upload Business Logo
                                                <input
                                                    type="file"
                                                    hidden
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                />
                                            </Button>
                                            {businessProfile.logo_url && (
                                                <Typography variant="caption" color="text.secondary">
                                                    Current logo loaded
                                                </Typography>
                                            )}
                                        </Box>
                                    </Grid>
                                    <Grid item xs={4}>
                                        <TextField fullWidth label="Currency" value={businessProfile.currency || ''} onChange={(e) => setBusinessProfile({ ...businessProfile, currency: e.target.value })} variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField fullWidth label="Address" multiline rows={2} value={businessProfile.address || ''} onChange={(e) => setBusinessProfile({ ...businessProfile, address: e.target.value })} variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            size="large"
                                            fullWidth
                                            disabled={saving}
                                            sx={{ py: 1.5, borderRadius: 3, fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 14px 0 rgba(26, 35, 126, 0.39)' }}
                                            startIcon={<SaveIcon />}
                                        >
                                            Update Business Identity
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Master Data Lists */}
                    <Card sx={{ mt: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.02)' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: 'primary.main' }}>Master Data Catalogs</Typography>

                            {['brands', 'vehicles'].map(type => (
                                <Box key={type} sx={{ mb: 4 }}>
                                    <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>{type.toUpperCase()}</Typography>
                                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            placeholder={`Add new ${type.slice(0, -1)}...`}
                                            value={newItem.type === type ? newItem.value : ''}
                                            onChange={(e) => setNewItem({ type, value: e.target.value })}
                                            InputProps={{ sx: { borderRadius: 2 } }}
                                        />
                                        <Button variant="contained" size="small" sx={{ borderRadius: 2, fontWeight: 700, px: 3 }} onClick={() => handleMasterDataAdd(type)}>ADD</Button>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {(masterData[type] || []).map((val, idx) => (
                                            <Chip
                                                key={idx}
                                                label={val}
                                                onDelete={() => handleMasterDataDelete(type, val)}
                                                sx={{
                                                    borderRadius: 2,
                                                    fontWeight: 600,
                                                    bgcolor: 'rgba(26,35,126,0.05)',
                                                    color: 'primary.main',
                                                    '& .MuiChip-deleteIcon': { color: 'primary.main' }
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                {/* User Management Section */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.02)' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}><PersonAddIcon /></Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 800 }}>User Authorization</Typography>
                            </Box>

                            <Box component="form" onSubmit={handleAddUser} sx={{ mb: 4 }}>
                                <Grid container spacing={1.5}>
                                    <Grid item xs={12} sm={3}>
                                        <TextField fullWidth size="small" placeholder="Full Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} InputProps={{ sx: { borderRadius: 2 } }} />
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <TextField fullWidth size="small" placeholder="Email Address" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} InputProps={{ sx: { borderRadius: 2 } }} />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <TextField fullWidth size="small" placeholder="Password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} InputProps={{ sx: { borderRadius: 2 } }} />
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Role</InputLabel>
                                            <Select
                                                value={newUserRole}
                                                label="Role"
                                                onChange={(e) => setNewUserRole(e.target.value)}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                <MenuItem value="staff">Staff</MenuItem>
                                                <MenuItem value="admin">Admin</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={2}>
                                        <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ borderRadius: 2, fontWeight: 700, height: '40px' }}>CREATE</Button>
                                    </Grid>
                                </Grid>
                            </Box>

                            <Typography variant="caption" sx={{ display: 'block', mb: 2, color: 'text.secondary', fontStyle: 'italic' }}>
                                Tip: Click on a user's role chip (STAFF/ADMIN) to toggle their authority level.
                            </Typography>

                            <TableContainer sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: 'rgba(26, 35, 126, 0.04)' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800, color: 'primary.main', py: 1.5 }}>USER IDENTITY</TableCell>
                                            <TableCell sx={{ fontWeight: 800, color: 'primary.main', py: 1.5 }}>AUTHORITY</TableCell>
                                            <TableCell sx={{ fontWeight: 800, color: 'primary.main', py: 1.5 }} align="center">ACCESS</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {users.filter(u => u.role !== 'revoked').map((u) => (
                                            <TableRow key={u.id} hover>
                                                <TableCell sx={{ py: 2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main', mr: 2, fontWeight: 700 }}>{u.name?.[0] || 'U'}</Avatar>
                                                        <Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{u.name}</Typography>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{u.email}</Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                     <Chip
                                                        label={(u.role || 'staff').toUpperCase()}
                                                        size="small"
                                                        onClick={() => handleRoleToggle(u)}
                                                        disabled={u.email === currentUser?.email}
                                                        title={u.email === currentUser?.email ? 'Cannot change your own role' : 'Click to toggle role'}
                                                        sx={{
                                                            fontWeight: 800,
                                                            fontSize: '10px',
                                                            bgcolor: u.role === 'admin' ? 'secondary.main' : 'rgba(0,0,0,0.06)',
                                                            color: u.role === 'admin' ? '#fff' : 'inherit',
                                                            borderRadius: 1,
                                                            cursor: u.email === currentUser?.email ? 'default' : 'pointer',
                                                            '&:hover': u.email === currentUser?.email ? {} : { bgcolor: u.role === 'admin' ? 'secondary.dark' : 'rgba(0,0,0,0.1)' }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDeleteUser(u.id, u.email)}
                                                        disabled={u.email === currentUser?.email}
                                                        title={u.email === currentUser?.email ? 'Cannot remove your own account' : 'Revoke access'}
                                                        color="error"
                                                        sx={{ bgcolor: 'rgba(244, 67, 54, 0.05)' }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Settings;
