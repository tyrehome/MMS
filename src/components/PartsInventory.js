import React, { useState, useEffect } from 'react';
import {
    Typography, Grid, TextField, Button, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Box, Chip, Card,
    Avatar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
    LocalHospital as PatchIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const PartsInventory = ({ businessProfile, partsProps = [], salesProps = [] }) => {
    const { isAdmin } = useAuth();
    const [parts, setParts] = useState(partsProps);
    const [patchCount, setPatchCount] = useState(0);
    const [newPart, setNewPart] = useState({ name: '', category: 'Consumable', stock: 0, price: 0 });
    const [editPart, setEditPart] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const categories = ['Consumable', 'Spare Part'];
    const currency = businessProfile?.currency || 'LKR';

    useEffect(() => setParts(partsProps), [partsProps]);
    useEffect(() => {
        let count = 0;
        salesProps.forEach(s => s.items?.forEach(i => i.service_name === 'Patching' && (count += parseInt(i.quantity || 1))));
        setPatchCount(count);
    }, [salesProps]);

    const handleAddPart = async (e) => {
        if (e) e.preventDefault();
        await supabase.from('parts').insert([{ 
            ...newPart, 
            stock: parseInt(newPart.stock || 0),
            price: parseFloat(newPart.price || 0),
            created_at: new Date().toISOString() 
        }]);
        setNewPart({ name: '', category: 'Consumable', stock: 0, price: 0 });
    };

    const handleDeletePart = async (id) => {
        if (window.confirm('Erase this item?')) await supabase.from('parts').delete().eq('id', id);
    };

    const handleEditSave = async () => {
        await supabase.from('parts').update({ 
            name: editPart.name,
            category: editPart.category,
            stock: parseInt(editPart.stock || 0),
            price: parseFloat(editPart.price || 0)
        }).eq('id', editPart.id);
        setIsEditDialogOpen(false);
    };

    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Parts & Consumables</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Inventory management for repair materials and shop consumables</Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 4, p: 4, background: 'linear-gradient(135deg, rgba(26, 35, 126, 0.05) 0%, rgba(26, 35, 126, 0.1) 100%)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mb: 2 }}><PatchIcon sx={{ fontSize: 32 }} /></Avatar>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Lifetime Consumption</Typography>
                        <Typography variant="h2" sx={{ fontWeight: 900, color: 'primary.main' }}>{patchCount}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.6 }}>Total patch units utilized in service</Typography>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card sx={{ borderRadius: 4, p: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Register Component</Typography>
                        <form onSubmit={handleAddPart}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={4}><TextField fullWidth label="Designation" value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} variant="standard" required /></Grid>
                                <Grid item xs={12} sm={2}>
                                    <FormControl fullWidth variant="standard">
                                        <InputLabel>Category</InputLabel>
                                        <Select value={newPart.category} onChange={e => setNewPart({...newPart, category: e.target.value})}>
                                            {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={2}><TextField fullWidth label="Qty" type="number" value={newPart.stock} onChange={e => setNewPart({...newPart, stock: e.target.value})} variant="standard" required /></Grid>
                                <Grid item xs={12} sm={2}><TextField fullWidth label={`Rate (${currency})`} type="number" value={newPart.price} onChange={e => setNewPart({...newPart, price: e.target.value})} variant="standard" required /></Grid>
                                <Grid item xs={12} sm={2}><Button fullWidth variant="contained" type="submit" sx={{ height: 48, borderRadius: 3, fontWeight: 900 }}>APPEND</Button></Grid>
                            </Grid>
                        </form>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.01)' }}>
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>Asset Ledger</Typography>
                            <TextField size="small" placeholder="Filter parts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.5 }} />, sx: { borderRadius: 4, bgcolor: '#fff' } }} />
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 900 }}>PART</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>CATEGORY</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 900 }}>STOCK</TableCell>
                                        {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>VALUATION</TableCell>}
                                        <TableCell align="center" sx={{ fontWeight: 900 }}>ACTIONS</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parts.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                                        <TableRow key={p.id} hover>
                                            <TableCell sx={{ fontWeight: 800 }}>{p.name}</TableCell>
                                            <TableCell><Chip label={p.category} size="small" sx={{ fontWeight: 900, borderRadius: 2 }} /></TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 900 }}>{p.stock}</TableCell>
                                            {isAdmin && <TableCell align="right">{(p.stock * p.price).toLocaleString()} {currency}</TableCell>}
                                            <TableCell align="center">
                                                <IconButton onClick={() => { setEditPart(p); setIsEditDialogOpen(true); }}><EditIcon /></IconButton>
                                                <IconButton color="error" onClick={() => handleDeletePart(p.id)}><DeleteIcon /></IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Grid>
            </Grid>

            <Dialog open={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>Refine Specifications</DialogTitle>
                <DialogContent>
                    {editPart && (
                        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField fullWidth label="Designation" value={editPart.name} onChange={e => setEditPart({...editPart, name: e.target.value})} variant="standard" />
                            <TextField fullWidth label="Stock Level" type="number" value={editPart.stock} onChange={e => setEditPart({...editPart, stock: e.target.value})} variant="standard" />
                            <TextField fullWidth label={`Unit Valuation (${currency})`} type="number" value={editPart.price} onChange={e => setEditPart({...editPart, price: e.target.value})} variant="standard" />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 4 }}>
                    <Button onClick={() => setIsEditDialogOpen(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
                    <Button onClick={handleEditSave} variant="contained" sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}>Apply changes</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PartsInventory;
