import React, { useState, useEffect, useMemo } from 'react';
import {
  TextField, Button, Grid, Typography, Box, IconButton, Dialog, DialogTitle, DialogContent,
  Snackbar, Alert, Chip, Avatar, Card, CardContent, Tabs, Tab
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
    Delete as DeleteIcon,
    Edit as EditIcon,
    Add as AddIcon,
    Inventory as InventoryIcon,
    Launch as ReleaseIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

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

const CHART_COLORS = ['#1a237e', '#3949ab', '#5c6bc0', '#7986cb', '#9fa8da', '#c5cae9'];

function TireHotel({ hotelTiresProps = [], customersProps = [], addHotelTire, updateHotelTire, deleteHotelTire }) {
  const [hotelTires, setHotelTires] = useState(hotelTiresProps);
  const [customers, setCustomers] = useState(customersProps);
  const [newTire, setNewTire] = useState({ customer_name: '', brand: '', size: '', quantity: '', storage_date: '', plate_number: '' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => setHotelTires(hotelTiresProps), [hotelTiresProps]);

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
          <IconButton size="small" sx={{ bgcolor: 'rgba(26,35,126,0.05)' }}><EditIcon fontSize="small" /></IconButton>
          {!p.row.retrieved && <Button variant="outlined" size="small" sx={{ borderRadius: 2, fontWeight: 900 }}>RELEASE</Button>}
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
                            <Pie data={[{name: 'Active', value: 70}, {name: 'Available', value: 30}]} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={5}>
                                <Cell fill="#1a237e" /><Cell fill="rgba(0,0,0,0.05)" />
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
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsDialogOpen(true)} sx={{ borderRadius: 3, fontWeight: 900 }}>SECURE NEW ASSET</Button>
            </Box>
            <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>            <StyledDataGrid rows={filteredTires} columns={columns} autoHeight components={{ Toolbar: GridToolbar }} />
            </Card>
        </Box>
      )}
    </Box>
  );
}

export default TireHotel;
