import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField, Button, Grid, Typography, Box, IconButton,
  Card, Tabs, Tab, Chip, Avatar
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Inventory as InventoryIcon,
    CheckCircle as ReleaseIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField as MuiTextField, Snackbar, Alert 
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  border: 'none',
  borderRadius: 24,
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  '& .MuiDataGrid-columnHeaders': {
    backgroundColor: 'rgba(26, 35, 126, 0.03)',
    color: '#1a237e',
    fontWeight: 900,
  },
  '& .MuiDataGrid-cell': {
    fontSize: '0.9rem',
    fontWeight: 500
  },
}));



function TireHotel({ hotelTiresProps = [], customersProps = [], addHotelTire, updateHotelTire, deleteHotelTire }) {
  const [hotelTires, setHotelTires] = useState(hotelTiresProps);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({ 
    customer_name: '', plate_number: '', brand: '', size: '', quantity: 4, notes: '' 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => setHotelTires(hotelTiresProps), [hotelTiresProps]);

  const occupancyData = useMemo(() => {
    const active = hotelTires.filter(t => !t.retrieved).length;
    return [
      { name: 'Occupied Units', value: active },
      { name: 'Available Est.', value: Math.max(0, 50 - active) } // Assuming 50 capacity for visualization
    ];
  }, [hotelTires]);

  const handleAddAsset = async () => {
    if (!newAsset.customer_name || !newAsset.plate_number) return;
    try {
      await addHotelTire(newAsset);
      setIsAddDialogOpen(false);
      setNewAsset({ customer_name: '', plate_number: '', brand: '', size: '', quantity: 4, notes: '' });
      setSnackbar({ open: true, message: 'Asset secured in vault.', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Security protocol failed.', severity: 'error' });
    }
  };

  const handleRelease = async (id) => {
    if (window.confirm('Authorize asset release to owner?')) {
      try {
        await updateHotelTire(id, { retrieved: true, retrieval_date: new Date().toISOString() });
        setSnackbar({ open: true, message: 'Asset released and logged.', severity: 'info' });
      } catch (err) {
        setSnackbar({ open: true, message: 'Release authorization failed.', severity: 'error' });
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Permanently erase this record?')) {
        try {
          await deleteHotelTire(id);
          setSnackbar({ open: true, message: 'Record purged.', severity: 'warning' });
        } catch (err) {
          setSnackbar({ open: true, message: 'Purge failed.', severity: 'error' });
        }
      }
  };

  const filteredTires = useMemo(() => {
    return hotelTires.filter(t => (t.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [hotelTires, searchTerm]);

  const columns = [
    { field: 'customer_name', headerName: 'OWNER', width: 200, renderCell: (p) => <Typography sx={{ fontWeight: 800 }}>{p.value}</Typography> },
    { field: 'plate_number', headerName: 'PLATE', width: 120 },
    { field: 'brand', headerName: 'BRAND', width: 120 },
    { field: 'quantity', headerName: 'QTY', width: 80, type: 'number' },
    {
      field: 'status',
      headerName: 'STATUS',
      width: 140,
      renderCell: (p) => (
        <Chip label={p.row.retrieved ? 'RELEASED' : 'SECURED'} size="small" sx={{ fontWeight: 900, borderRadius: 2 }} color={p.row.retrieved ? 'default' : 'secondary'} />
      ),
    },
    {
      field: 'actions',
      headerName: 'COMMANDS',
      width: 150,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" sx={{ bgcolor: 'rgba(26,35,126,0.05)' }} onClick={() => handleDelete(p.row.id)}><DeleteIcon fontSize="small" color="error" /></IconButton>
          {!p.row.retrieved && (
            <Button 
                variant="contained" 
                size="small" 
                color="secondary"
                startIcon={<ReleaseIcon />}
                onClick={() => handleRelease(p.row.id)}
                sx={{ borderRadius: 2, fontWeight: 900 }}
            >
                RELEASE
            </Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Tire Hotel Management</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Global custody control for premium client assets</Typography>
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 4 }}>
        <Tab label="Occupancy Overview" sx={{ fontWeight: 800 }} />
        <Tab label="Asset Registry" sx={{ fontWeight: 800 }} />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>Capacity Distribution</Typography>
                <Box sx={{ height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie 
                                data={occupancyData} 
                                dataKey="value" 
                                innerRadius={60} 
                                outerRadius={100} 
                                paddingAngle={5}
                            >
                                <Cell fill="#1a237e" />
                                <Cell fill="rgba(0,0,0,0.05)" />
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, mb: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.1)', mb: 2 }}><InventoryIcon /></Avatar>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Secure Holdings</Typography>
                <Typography variant="h2" sx={{ fontWeight: 900 }}>{hotelTires.length}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Identified sets currently in high-security storage</Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <TextField placeholder="Filter inventory..." size="small" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} InputProps={{ sx: { borderRadius: 4, width: 300, bgcolor: '#fff' } }} />
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddDialogOpen(true)} sx={{ borderRadius: 3, fontWeight: 900 }}>SECURE NEW ASSET</Button>
            </Box>
            <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                <StyledDataGrid 
                    rows={filteredTires} 
                    columns={columns} 
                    autoHeight 
                    components={{ Toolbar: GridToolbar }} 
                    getRowId={(r) => r.id}
                />
            </Card>

            <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
                <DialogTitle sx={{ fontWeight: 900 }}>Secure Custodial Asset</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                    <MuiTextField fullWidth label="Customer Name" variant="standard" value={newAsset.customer_name} onChange={e => setNewAsset({...newAsset, customer_name: e.target.value})} />
                    <Grid container spacing={2}>
                        <Grid item xs={6}><MuiTextField fullWidth label="Plate Number" variant="standard" value={newAsset.plate_number} onChange={e => setNewAsset({...newAsset, plate_number: e.target.value})} /></Grid>
                        <Grid item xs={6}><MuiTextField fullWidth label="Quantity" type="number" variant="standard" value={newAsset.quantity} onChange={e => setNewAsset({...newAsset, quantity: e.target.value})} /></Grid>
                    </Grid>
                    <Grid container spacing={2}>
                        <Grid item xs={6}><MuiTextField fullWidth label="Tire Brand" variant="standard" value={newAsset.brand} onChange={e => setNewAsset({...newAsset, brand: e.target.value})} /></Grid>
                        <Grid item xs={6}><MuiTextField fullWidth label="Size" variant="standard" value={newAsset.size} onChange={e => setNewAsset({...newAsset, size: e.target.value})} /></Grid>
                    </Grid>
                    <MuiTextField fullWidth label="Special Storage Notes" multiline rows={2} variant="standard" value={newAsset.notes} onChange={e => setNewAsset({...newAsset, notes: e.target.value})} />
                </DialogContent>
                <DialogActions sx={{ p: 4, pt: 0 }}>
                    <Button onClick={() => setIsAddDialogOpen(false)}>Abort</Button>
                    <Button variant="contained" onClick={handleAddAsset} sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}>AUTHORIZE STORAGE</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
                <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
      )}
    </Box>
  );
}

export default TireHotel;
