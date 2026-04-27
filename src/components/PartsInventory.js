import React, { useState, useEffect } from 'react';
import {
    Typography, Grid, TextField, Button, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Box, Chip, Card,
    Avatar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Select, MenuItem, FormControl, InputLabel, LinearProgress, Tooltip, useMediaQuery,
    Divider
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    Add as AddIcon,
    TrendingUp as ProfitIcon,
    Inventory2 as StockIcon,
    MonetizationOn as ValueIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const PRESET_CATEGORIES = [
    'Consumable',
    'Spare Part',
    'Lubricant',
    'Filter',
    'Battery',
    'Electrical',
    'Brake Parts',
    'Suspension',
    'Body Parts',
    'Tool',
    'Chemical',
    'Other',
    'Custom',
];

const CATEGORY_COLORS = {
    'Consumable':  '#1a237e',
    'Spare Part':  '#4a148c',
    'Lubricant':   '#e65100',
    'Filter':      '#1b5e20',
    'Battery':     '#b71c1c',
    'Electrical':  '#f57f17',
    'Brake Parts': '#880e4f',
    'Suspension':  '#006064',
    'Body Parts':  '#37474f',
    'Tool':        '#4e342e',
    'Chemical':    '#00695c',
    'Other':       '#546e7a',
    'Custom':      '#6a1b9a',
};

const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || '#546e7a';

const PartsInventory = ({ businessProfile, partsProps = [] }) => {
    const { isAdmin } = useAuth();
    const isMobile = useMediaQuery('(max-width:600px)');
    const [parts, setParts]               = useState(partsProps);
    const [newPart, setNewPart]           = useState({
        name: '', category: 'Consumable', customCategory: '',
        stock: 0, price: 0, cost_price: 0,
    });
    const [editPart, setEditPart]                   = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen]   = useState(false);
    const [searchTerm, setSearchTerm]               = useState('');
    const [filterCategory, setFilterCategory]       = useState('All');

    const currency = businessProfile?.currency || 'LKR';

    useEffect(() => setParts(partsProps), [partsProps]);


    /* ─── Helpers ─── */
    const getFinalCategory = (part) =>
        part.category === 'Custom' ? (part.customCategory || 'Custom') : part.category;

    const profitPerUnit = (part) => (part.price || 0) - (part.cost_price || 0);

    const marginPct = (part) =>
        part.price > 0 ? (profitPerUnit(part) / part.price) * 100 : 0;

    const getUniqueCategories = () => {
        const cats = [...new Set(parts.map(p => p.category).filter(Boolean))];
        return ['All', ...cats];
    };

    /* ─── Stats ─── */
    const totalSKUs     = parts.length;
    const totalStock    = parts.reduce((s, p) => s + (p.stock || 0), 0);
    const totalValue    = parts.reduce((s, p) => s + ((p.stock || 0) * (p.price || 0)), 0);
    const avgMargin     = parts.length > 0
        ? (parts.reduce((s, p) => s + marginPct(p), 0) / parts.length).toFixed(1)
        : 0;

    /* ─── Filtered list ─── */
    const filteredParts = parts.filter(p => {
        const matchSearch   = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              p.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = filterCategory === 'All' || p.category === filterCategory;
        return matchSearch && matchCategory;
    });

    /* ─── CRUD ─── */
    const handleAddPart = async (e) => {
        if (e) e.preventDefault();
        const finalCategory = getFinalCategory(newPart);
        await supabase.from('parts').insert([{
            name:       newPart.name,
            category:   finalCategory,
            stock:      parseInt(newPart.stock || 0),
            price:      parseFloat(newPart.price || 0),
            cost_price: parseFloat(newPart.cost_price || 0),
            created_at: new Date().toISOString(),
        }]);
        setNewPart({ name: '', category: 'Consumable', customCategory: '', stock: 0, price: 0, cost_price: 0 });
    };

    const handleDeletePart = async (id) => {
        if (window.confirm('Delete this component?'))
            await supabase.from('parts').delete().eq('id', id);
    };

    const handleEditSave = async () => {
        await supabase.from('parts').update({
            name:       editPart.name,
            category:   editPart.category,
            stock:      parseInt(editPart.stock || 0),
            price:      parseFloat(editPart.price || 0),
            cost_price: parseFloat(editPart.cost_price || 0),
        }).eq('id', editPart.id);
        setIsEditDialogOpen(false);
    };

    /* ─── Live margin preview in the form ─── */
    const liveMargin = newPart.price > 0
        ? (((newPart.price - newPart.cost_price) / newPart.price) * 100).toFixed(0)
        : null;

    return (
        <Box sx={{ p: isMobile ? 0 : 1 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>
                    Parts &amp; Consumables
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Full inventory control · cost-price tracking · profit analysis · advanced categories
                </Typography>
            </Box>

            {/* Stats Row */}
            {/* Stats Row */}
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              mb: 3, 
              overflowX: isMobile ? 'auto' : 'visible',
              pb: isMobile ? 1 : 0,
              width: isMobile ? 'calc(100% + 0px)' : '100%',
              '&::-webkit-scrollbar': { display: 'none' }
            }}>
                {[
                  { label: 'Total SKUs',   value: totalSKUs,   icon: <StockIcon />,  color: 'primary.main',   bg: 'rgba(26,35,126,0.06)' },
                  { label: 'Stock Units',  value: totalStock,  icon: <StockIcon />,  color: 'success.main',   bg: 'rgba(76,175,80,0.08)' },
                  { label: 'Stock Value',  value: totalValue,  icon: <ValueIcon />,  color: 'secondary.main', bg: 'rgba(245,0,87,0.08)', isPrice: true },
                  { label: 'Avg Margin',   value: avgMargin,   icon: <ProfitIcon />, color: '#e65100',        bg: 'rgba(230,81,0,0.10)', isPct: true },
                ].map(s => (
                  <Card key={s.label} sx={{ 
                    minWidth: isMobile ? 130 : 'auto', 
                    flex: isMobile ? '0 0 auto' : 1,
                    borderRadius: 4, 
                    p: isMobile ? 2 : 2.5, 
                    background: s.bg,
                    border: '1px solid rgba(0,0,0,0.03)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {React.cloneElement(s.icon, { sx: { fontSize: 16, color: s.color } })}
                      <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', fontSize: '0.6rem' }}>{s.label}</Typography>
                    </Box>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 900, color: s.color, lineHeight: 1.1 }}>
                      {s.isPrice ? s.value.toLocaleString() : s.value}
                      {s.isPct ? '%' : ''}
                    </Typography>
                  </Card>
                ))}
            </Box>

            <Grid container spacing={3}>
                {/* ── Register Component Form ── */}
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 4, p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 42, height: 42 }}><AddIcon /></Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 900 }}>Register Component</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Add items with cost price — profit &amp; margin calculated automatically
                                </Typography>
                            </Box>
                        </Box>

                        <form onSubmit={handleAddPart}>
                            <Grid container spacing={2} alignItems="flex-end">
                                {/* Name */}
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth label="Part / Component Name"
                                        value={newPart.name}
                                        onChange={e => setNewPart({ ...newPart, name: e.target.value })}
                                        variant="standard" required
                                    />
                                </Grid>

                                {/* Category */}
                                <Grid item xs={12} sm={2}>
                                    <FormControl fullWidth variant="standard">
                                        <InputLabel>Category</InputLabel>
                                        <Select
                                            value={newPart.category}
                                            onChange={e => setNewPart({ ...newPart, category: e.target.value, customCategory: '' })}
                                        >
                                            {PRESET_CATEGORIES.map(c => (
                                                <MenuItem key={c} value={c}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getCategoryColor(c) }} />
                                                        {c}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                {/* Custom category text field */}
                                {newPart.category === 'Custom' && (
                                    <Grid item xs={12} sm={2}>
                                        <TextField
                                            fullWidth label="Custom Category Name"
                                            value={newPart.customCategory}
                                            onChange={e => setNewPart({ ...newPart, customCategory: e.target.value })}
                                            variant="standard" required
                                            placeholder="e.g. Valve Stem"
                                        />
                                    </Grid>
                                )}

                                {/* Qty */}
                                <Grid item xs={4} sm={1}>
                                    <TextField
                                        fullWidth label="Qty" type="number"
                                        value={newPart.stock}
                                        onChange={e => setNewPart({ ...newPart, stock: e.target.value })}
                                        variant="standard" required
                                        inputProps={{ min: 0 }}
                                    />
                                </Grid>

                                {/* Cost price */}
                                <Grid item xs={4} sm={2}>
                                    <TextField
                                        fullWidth label={`Cost Price (${currency})`} type="number"
                                        value={newPart.cost_price}
                                        onChange={e => setNewPart({ ...newPart, cost_price: e.target.value })}
                                        variant="standard"
                                        inputProps={{ min: 0, step: 0.01 }}
                                        helperText="Buying / purchase price"
                                    />
                                </Grid>

                                {/* Sell price */}
                                <Grid item xs={4} sm={2}>
                                    <TextField
                                        fullWidth label={`Sell Price (${currency})`} type="number"
                                        value={newPart.price}
                                        onChange={e => setNewPart({ ...newPart, price: e.target.value })}
                                        variant="standard" required
                                        inputProps={{ min: 0, step: 0.01 }}
                                    />
                                </Grid>

                                {/* Margin badge + Submit */}
                                <Grid item xs={12} sm={newPart.category === 'Custom' ? 12 : 2}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: isMobile ? 2 : 0 }}>
                                        {liveMargin !== null && newPart.cost_price > 0 && (
                                            <Chip
                                                label={`+${liveMargin}% margin`}
                                                size="small"
                                                sx={{
                                                    bgcolor: liveMargin >= 40 ? 'rgba(76,175,80,0.12)' : liveMargin >= 20 ? 'rgba(255,152,0,0.12)' : 'rgba(244,67,54,0.12)',
                                                    color:   liveMargin >= 40 ? 'success.main' : liveMargin >= 20 ? 'warning.main' : 'error.main',
                                                    fontWeight: 900,
                                                }}
                                            />
                                        )}
                                        <Button fullWidth variant="contained" type="submit" sx={{ height: isMobile ? 40 : 48, borderRadius: 3, fontWeight: 900, minWidth: 110 }}>
                                            APPEND
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </form>
                    </Card>
                </Grid>

                {/* ── Asset Ledger ── */}
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.01)', flexWrap: 'wrap', gap: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 900 }}>Asset Ledger</Typography>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <Select
                                        value={filterCategory}
                                        onChange={e => setFilterCategory(e.target.value)}
                                        sx={{ borderRadius: 3, fontSize: '0.85rem', bgcolor: '#fff' }}
                                    >
                                        {getUniqueCategories().map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField
                                    size="small" placeholder="Search parts..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.5 }} />, sx: { borderRadius: 4, bgcolor: '#fff' } }}
                                />
                            </Box>
                        </Box>

                        {isMobile ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                                {filteredParts.map(p => {
                                    const ppu = profitPerUnit(p);
                                    const margin = marginPct(p);
                                    const isHigh = margin >= 40;
                                    const isLow = margin < 20 && p.price > 0;
                                    const barColor = isHigh ? 'success.main' : isLow ? 'error.main' : 'warning.main';

                                    return (
                                        <Card key={p.id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                                <Box>
                                                    <Typography sx={{ fontWeight: 800, color: 'primary.main' }}>{p.name}</Typography>
                                                    <Chip
                                                        label={p.category}
                                                        size="small"
                                                        sx={{
                                                            mt: 0.5, fontWeight: 900, borderRadius: 1.5, fontSize: '0.65rem', height: 18,
                                                            bgcolor: `${getCategoryColor(p.category)}12`,
                                                            color: getCategoryColor(p.category),
                                                        }}
                                                    />
                                                </Box>
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary' }}>STOCK</Typography>
                                                    <Chip label={p.stock} size="small" color={p.stock <= 2 ? 'error' : p.stock <= 5 ? 'warning' : 'default'} sx={{ fontWeight: 900, height: 20 }} />
                                                </Box>
                                            </Box>

                                            <Divider sx={{ my: 1.5, opacity: 0.5 }} />

                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary' }}>SELL PRICE</Typography>
                                                    <Typography sx={{ fontWeight: 800 }}>{(p.price || 0).toLocaleString()} {currency}</Typography>
                                                </Grid>
                                                {isAdmin && (
                                                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                                                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary' }}>VALUATION</Typography>
                                                        <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{((p.stock || 0) * (p.price || 0)).toLocaleString()} {currency}</Typography>
                                                    </Grid>
                                                )}
                                                {isAdmin && (
                                                    <Grid item xs={12}>
                                                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box>
                                                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary' }}>MARGIN</Typography>
                                                                <Typography sx={{ fontWeight: 900, color: barColor }}>{margin.toFixed(1)}%</Typography>
                                                            </Box>
                                                            <Box sx={{ textAlign: 'right' }}>
                                                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary' }}>PROFIT/UNIT</Typography>
                                                                <Typography sx={{ fontWeight: 900, color: ppu >= 0 ? 'success.main' : 'error.main' }}>
                                                                    {ppu >= 0 ? '+' : ''}{ppu.toLocaleString()}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </Grid>
                                                )}
                                            </Grid>

                                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                                <Button
                                                    fullWidth variant="outlined" size="small" startIcon={<EditIcon />}
                                                    onClick={() => { setEditPart({ ...p, cost_price: p.cost_price || 0 }); setIsEditDialogOpen(true); }}
                                                    sx={{ borderRadius: 2.5, fontWeight: 800, py: 1 }}
                                                >
                                                    EDIT
                                                </Button>
                                                <IconButton color="error" onClick={() => handleDeletePart(p.id)} sx={{ bgcolor: 'rgba(244,67,54,0.05)', borderRadius: 2.5, width: 44 }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Card>
                                    );
                                })}
                            </Box>
                        ) : (
                            <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 900 }}>PART / COMPONENT</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>CATEGORY</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 900 }}>STOCK</TableCell>
                                        {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>COST PRICE</TableCell>}
                                        {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>SELL PRICE</TableCell>}
                                        {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>PROFIT / UNIT</TableCell>}
                                        {isAdmin && <TableCell align="right" sx={{ fontWeight: 900, minWidth: 120 }}>MARGIN</TableCell>}
                                        {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>VALUATION</TableCell>}
                                        <TableCell align="center" sx={{ fontWeight: 900 }}>ACTIONS</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredParts.map(p => {
                                        const ppu     = profitPerUnit(p);
                                        const margin  = marginPct(p);
                                        const isHigh  = margin >= 40;
                                        const isLow   = margin < 20 && p.price > 0;
                                        const barColor = isHigh ? 'success.main' : isLow ? 'error.main' : 'warning.main';

                                        return (
                                            <TableRow key={p.id} hover>
                                                <TableCell sx={{ fontWeight: 800 }}>{p.name}</TableCell>

                                                <TableCell>
                                                    <Chip
                                                        label={p.category}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 900, borderRadius: 2,
                                                            bgcolor: `${getCategoryColor(p.category)}18`,
                                                            color:   getCategoryColor(p.category),
                                                            border:  `1px solid ${getCategoryColor(p.category)}30`,
                                                        }}
                                                    />
                                                </TableCell>

                                                <TableCell align="right">
                                                    <Chip
                                                        label={p.stock}
                                                        size="small"
                                                        color={p.stock <= 2 ? 'error' : p.stock <= 5 ? 'warning' : 'default'}
                                                        sx={{ fontWeight: 900 }}
                                                    />
                                                </TableCell>

                                                {isAdmin && (
                                                    <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                                                        {(p.cost_price || 0).toLocaleString()} {currency}
                                                    </TableCell>
                                                )}

                                                {isAdmin && (
                                                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                                                        {(p.price || 0).toLocaleString()} {currency}
                                                    </TableCell>
                                                )}

                                                {isAdmin && (
                                                    <TableCell align="right">
                                                        <Typography sx={{ fontWeight: 900, color: ppu >= 0 ? 'success.main' : 'error.main', fontSize: '0.9rem' }}>
                                                            {ppu >= 0 ? '+' : ''}{ppu.toLocaleString()} {currency}
                                                        </Typography>
                                                    </TableCell>
                                                )}

                                                {isAdmin && (
                                                    <TableCell align="right">
                                                        <Box sx={{ minWidth: 90 }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 900, color: barColor }}>
                                                                {margin.toFixed(1)}%
                                                            </Typography>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={Math.min(Math.max(margin, 0), 100)}
                                                                sx={{
                                                                    height: 5, borderRadius: 3, mt: 0.5,
                                                                    bgcolor: 'rgba(0,0,0,0.06)',
                                                                    '& .MuiLinearProgress-bar': { bgcolor: barColor }
                                                                }}
                                                            />
                                                        </Box>
                                                    </TableCell>
                                                )}

                                                {isAdmin && (
                                                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                                                        {((p.stock || 0) * (p.price || 0)).toLocaleString()} {currency}
                                                    </TableCell>
                                                )}

                                                <TableCell align="center">
                                                    <Tooltip title="Edit component">
                                                        <IconButton onClick={() => { setEditPart({ ...p, cost_price: p.cost_price || 0 }); setIsEditDialogOpen(true); }}>
                                                            <EditIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete">
                                                        <IconButton color="error" onClick={() => handleDeletePart(p.id)}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}

                                    {filteredParts.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 8, color: 'text.secondary', fontWeight: 600 }}>
                                                No parts found. Register your first component above ↑
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        )}
                    </Card>
                </Grid>
            </Grid>

            {/* Edit Dialog */}
            <Dialog
                open={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 4, p: 2, minWidth: { xs: 320, sm: 460 } } }}
            >
                <DialogTitle sx={{ fontWeight: 900 }}>Edit Component</DialogTitle>
                <DialogContent>
                    {editPart && (
                        <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField
                                fullWidth label="Designation"
                                value={editPart.name}
                                onChange={e => setEditPart({ ...editPart, name: e.target.value })}
                                variant="standard"
                            />

                            <FormControl fullWidth variant="standard">
                                <InputLabel>Category</InputLabel>
                                <Select value={editPart.category} onChange={e => setEditPart({ ...editPart, category: e.target.value })}>
                                    {PRESET_CATEGORIES.map(c => (
                                        <MenuItem key={c} value={c}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getCategoryColor(c) }} />
                                                {c}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                    {/* Preserve existing custom categories not in preset list */}
                                    {!PRESET_CATEGORIES.includes(editPart.category) && (
                                        <MenuItem value={editPart.category}>{editPart.category}</MenuItem>
                                    )}
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth label="Stock Level" type="number"
                                value={editPart.stock}
                                onChange={e => setEditPart({ ...editPart, stock: e.target.value })}
                                variant="standard"
                                inputProps={{ min: 0 }}
                            />

                            <TextField
                                fullWidth label={`Cost Price — Buying Price (${currency})`} type="number"
                                value={editPart.cost_price || 0}
                                onChange={e => setEditPart({ ...editPart, cost_price: e.target.value })}
                                variant="standard"
                                helperText="What you paid for it (purchase / buying price)"
                                inputProps={{ min: 0, step: 0.01 }}
                            />

                            <TextField
                                fullWidth label={`Selling Price (${currency})`} type="number"
                                value={editPart.price}
                                onChange={e => setEditPart({ ...editPart, price: e.target.value })}
                                variant="standard"
                                inputProps={{ min: 0, step: 0.01 }}
                            />

                            {/* Live profit preview */}
                            {editPart.price > 0 && (
                                <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(76,175,80,0.05)', border: '1px solid rgba(76,175,80,0.2)' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'success.main', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                        📊 Profit Preview
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Profit per unit</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 900, color: 'success.main' }}>
                                            +{((editPart.price || 0) - (editPart.cost_price || 0)).toLocaleString()} {currency}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>Margin</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 900, color: 'success.main' }}>
                                            {editPart.price > 0
                                                ? ((((editPart.price || 0) - (editPart.cost_price || 0)) / editPart.price) * 100).toFixed(1)
                                                : 0}%
                                        </Typography>
                                    </Box>
                                    {editPart.stock > 0 && (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>Total stock profit potential</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 900, color: 'success.main' }}>
                                                +{(((editPart.price || 0) - (editPart.cost_price || 0)) * (editPart.stock || 0)).toLocaleString()} {currency}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 4 }}>
                    <Button onClick={() => setIsEditDialogOpen(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
                    <Button onClick={handleEditSave} variant="contained" sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}>
                        Apply Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PartsInventory;
