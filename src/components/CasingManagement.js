import React, { useState, useMemo } from 'react';
import {
  TextField, Button, Grid, Typography, Box, IconButton,
  Card, Tabs, Tab, Chip, Avatar, useMediaQuery, useTheme, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Inventory as InventoryIcon,
    LocalShipping as ShippingIcon,
    CheckCircle as CheckCircleIcon,
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

function CasingManagement({ retreadJobs = [], suppliers = [], masterData = {}, addRetreadJob, updateRetreadJob, deleteRetreadJob }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [newJob, setNewJob] = useState({ 
    customer_name: '', customer_phone: '', vehicle_number: '', brand: '', size: '', serial_number: '', notes: '' 
  });
  const [dispatchData, setDispatchData] = useState({ supplier_id: '', job_number: '' });
  const [returnData, setReturnData] = useState({ cost_price: 0, selling_price: 0, status: 'Returned' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const statusColors = {
    'Received': 'info',
    'Sent to Supplier': 'warning',
    'Returned': 'success',
    'Supplier Rejected': 'error',
    'Sold': 'default'
  };

  const statusData = useMemo(() => {
    const counts = retreadJobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
    }, {});
    return Object.keys(counts).map(status => ({ name: status, value: counts[status] }));
  }, [retreadJobs]);

  const handleAddJob = async () => {
    if (!newJob.customer_name || !newJob.serial_number) {
        setSnackbar({ open: true, message: 'Customer name and serial number required.', severity: 'error' });
        return;
    }
    try {
      await addRetreadJob({ ...newJob, status: 'Received' });
      setIsAddDialogOpen(false);
      setNewJob({ customer_name: '', customer_phone: '', vehicle_number: '', brand: '', size: '', serial_number: '', notes: '' });
      setSnackbar({ open: true, message: 'Casing received successfully.', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to receive casing.', severity: 'error' });
    }
  };

  const handleDispatch = async () => {
    if (!dispatchData.supplier_id) {
        setSnackbar({ open: true, message: 'Please select a supplier.', severity: 'error' });
        return;
    }
    try {
        await updateRetreadJob(selectedJob.id, { 
            supplier_id: dispatchData.supplier_id, 
            job_number: dispatchData.job_number,
            status: 'Sent to Supplier' 
        });
        setIsDispatchDialogOpen(false);
        setSnackbar({ open: true, message: 'Casing dispatched to supplier.', severity: 'success' });
    } catch (err) {
        setSnackbar({ open: true, message: 'Failed to dispatch casing.', severity: 'error' });
    }
  };

  const handleReturn = async () => {
    try {
        await updateRetreadJob(selectedJob.id, { 
            cost_price: returnData.cost_price, 
            selling_price: returnData.selling_price,
            status: returnData.status
        });
        setIsReturnDialogOpen(false);
        setSnackbar({ open: true, message: 'Casing return recorded.', severity: 'success' });
    } catch (err) {
        setSnackbar({ open: true, message: 'Failed to record return.', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Permanently delete this retread job?')) {
        try {
          await deleteRetreadJob(id);
          setSnackbar({ open: true, message: 'Record deleted.', severity: 'warning' });
        } catch (err) {
          setSnackbar({ open: true, message: 'Deletion failed.', severity: 'error' });
        }
      }
  };

  const filteredJobs = useMemo(() => {
    return retreadJobs.filter(t => 
        (t.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [retreadJobs, searchTerm]);

  const columns = [
    { field: 'customer_name', headerName: 'CUSTOMER', width: 180, renderCell: (p) => <Typography sx={{ fontWeight: 800 }}>{p.value}</Typography> },
    { field: 'vehicle_number', headerName: 'VEHICLE', width: 120 },
    { field: 'serial_number', headerName: 'SERIAL NO', width: 150 },
    { field: 'brand', headerName: 'BRAND & SIZE', width: 160, renderCell: (p) => `${p.row.brand} ${p.row.size}` },
    {
      field: 'status',
      headerName: 'STATUS',
      width: 150,
      renderCell: (p) => (
        <Chip label={p.value} size="small" sx={{ fontWeight: 900, borderRadius: 2 }} color={statusColors[p.value] || 'default'} />
      ),
    },
    {
      field: 'actions',
      headerName: 'ACTIONS',
      width: 250,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {p.row.status === 'Received' && (
            <Button size="small" variant="outlined" color="primary" onClick={() => { setSelectedJob(p.row); setDispatchData({ supplier_id: p.row.supplier_id || '', job_number: '' }); setIsDispatchDialogOpen(true); }}>
                DISPATCH
            </Button>
          )}
          {p.row.status === 'Sent to Supplier' && (
            <Button size="small" variant="outlined" color="secondary" onClick={() => { setSelectedJob(p.row); setReturnData({ cost_price: 0, selling_price: 0, status: 'Returned' }); setIsReturnDialogOpen(true); }}>
                RECEIVE
            </Button>
          )}
          <IconButton size="small" onClick={() => handleDelete(p.row.id)}><DeleteIcon fontSize="small" color="error" /></IconButton>
        </Box>
      ),
    },
  ];

  const pieColors = ['#1a237e', '#f50057', '#ff9800', '#4caf50', '#9e9e9e'];

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Casing & Retreads Management</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Track casings from customer drop-off to supplier return and sale</Typography>
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant={isMobile ? "scrollable" : "standard"} scrollButtons={isMobile ? "auto" : false} sx={{ mb: 4 }}>
        <Tab icon={<InventoryIcon />} iconPosition="start" label="Dashboard" sx={{ fontWeight: 800 }} />
        <Tab icon={<ShippingIcon />} iconPosition="start" label="Job Tracker" sx={{ fontWeight: 800 }} />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, p: 4, height: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>Jobs by Status</Typography>
                <Box sx={{ height: 300 }}>
                    {statusData.length > 0 ? (
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={5}>
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <Typography sx={{ mt: 5, textAlign: 'center', color: 'text.secondary' }}>No active jobs</Typography>}
                </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 4, mb: 4, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Avatar sx={{ bgcolor: 'rgba(26, 35, 126, 0.1)', color: 'primary.main', mb: 2 }}><CheckCircleIcon /></Avatar>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Total Jobs Tracked</Typography>
                <Typography variant="h2" sx={{ fontWeight: 900 }}>{retreadJobs.length}</Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Box>
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', mb: 3, gap: 2 }}>
                <TextField 
                  fullWidth={isMobile}
                  placeholder="Search customer or serial..." 
                  size="small" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  InputProps={{ sx: { borderRadius: 4, width: isMobile ? '100%' : 300, bgcolor: '#fff' } }} 
                />
                <Button fullWidth={isMobile} variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddDialogOpen(true)} sx={{ borderRadius: 3, fontWeight: 900 }}>RECEIVE CASING</Button>
            </Box>
            
            <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                <Box sx={{ minWidth: isMobile ? 800 : '100%' }}>
                  <StyledDataGrid 
                      rows={filteredJobs} 
                      columns={columns} 
                      autoHeight 
                      disableSelectionOnClick
                      components={{ Toolbar: GridToolbar }} 
                  />
                </Box>
            </Card>
        </Box>
      )}

      {/* Receive Casing Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
          <DialogTitle sx={{ fontWeight: 900 }}>Receive Casing from Customer</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <MuiTextField fullWidth label="Customer Name" variant="outlined" value={newJob.customer_name} onChange={e => setNewJob({...newJob, customer_name: e.target.value})} />
              <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={12} sm={6}><MuiTextField fullWidth label="Phone" variant="outlined" value={newJob.customer_phone} onChange={e => setNewJob({...newJob, customer_phone: e.target.value})} /></Grid>
                  <Grid item xs={12} sm={6}><MuiTextField fullWidth label="Vehicle Number" variant="outlined" value={newJob.vehicle_number} onChange={e => setNewJob({...newJob, vehicle_number: e.target.value})} /></Grid>
              </Grid>
              <Grid container spacing={isMobile ? 1 : 2}>
                  <Grid item xs={12} sm={4}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Brand</InputLabel>
                        <Select value={newJob.brand} onChange={e => setNewJob({...newJob, brand: e.target.value})} label="Brand">
                          {(masterData?.brands || []).map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                        </Select>
                      </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}><MuiTextField fullWidth label="Size" variant="outlined" value={newJob.size} onChange={e => setNewJob({...newJob, size: e.target.value})} /></Grid>
                  <Grid item xs={12} sm={4}><MuiTextField fullWidth label="Serial Number" variant="outlined" value={newJob.serial_number} onChange={e => setNewJob({...newJob, serial_number: e.target.value})} /></Grid>
              </Grid>
              <MuiTextField fullWidth label="Inspection Notes" multiline rows={2} variant="outlined" value={newJob.notes} onChange={e => setNewJob({...newJob, notes: e.target.value})} />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleAddJob} sx={{ borderRadius: 2, fontWeight: 900 }}>REGISTER CASING</Button>
          </DialogActions>
      </Dialog>

      {/* Dispatch to Supplier Dialog */}
      <Dialog open={isDispatchDialogOpen} onClose={() => setIsDispatchDialogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 900 }}>Dispatch to Supplier</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Select Supplier</InputLabel>
                <Select value={dispatchData.supplier_id} onChange={e => setDispatchData({...dispatchData, supplier_id: e.target.value})} label="Select Supplier">
                    {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
              <MuiTextField fullWidth label="Supplier Job / Reference Number" variant="outlined" value={dispatchData.job_number} onChange={e => setDispatchData({...dispatchData, job_number: e.target.value})} />
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setIsDispatchDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" color="warning" onClick={handleDispatch} sx={{ borderRadius: 2, fontWeight: 900 }}>MARK DISPATCHED</Button>
          </DialogActions>
      </Dialog>

      {/* Receive from Supplier Dialog */}
      <Dialog open={isReturnDialogOpen} onClose={() => setIsReturnDialogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 900 }}>Process Supplier Return</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Return Status</InputLabel>
                <Select value={returnData.status} onChange={e => setReturnData({...returnData, status: e.target.value})} label="Return Status">
                    <MenuItem value="Returned">Successfully Retreaded</MenuItem>
                    <MenuItem value="Supplier Rejected">Rejected by Supplier (Unrepairable)</MenuItem>
                </Select>
              </FormControl>
              {returnData.status === 'Returned' && (
                  <>
                      <MuiTextField fullWidth type="number" label="Supplier Cost (Payable)" variant="outlined" value={returnData.cost_price} onChange={e => setReturnData({...returnData, cost_price: e.target.value})} />
                      <MuiTextField fullWidth type="number" label="Selling Price to Customer" variant="outlined" value={returnData.selling_price} onChange={e => setReturnData({...returnData, selling_price: e.target.value})} />
                  </>
              )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setIsReturnDialogOpen(false)}>Cancel</Button>
              <Button variant="contained" color="success" onClick={handleReturn} sx={{ borderRadius: 2, fontWeight: 900 }}>SAVE RECORD</Button>
          </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
          <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default CasingManagement;
