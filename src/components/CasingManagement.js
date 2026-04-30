import React, { useState, useMemo } from 'react';
import {
  TextField, Button, Grid, Typography, Box, IconButton,
  Card, Tabs, Tab, Chip, useMediaQuery, useTheme,
  Select, MenuItem, InputLabel, FormControl, Paper, Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Inventory as InventoryIcon,
    LocalShipping as ShippingIcon,
    Delete as DeleteIcon,
    Sync as SyncIcon
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

const statusColors = {
  'Received': 'info',
  'Sent to Supplier': 'warning',
  'Returned': 'success',
  'Supplier Rejected': 'error',
  'Sold': 'default'
};

function MobileJobCard({ job, onDispatch, onReceive, onDelete }) {
  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 3, p: 2, mb: 2, border: '1px solid rgba(0,0,0,0.08)' }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: '0.95rem' }}>{job.customer_name}</Typography>
          <Typography variant="caption" color="text.secondary">{job.vehicle_number || '—'}</Typography>
        </Box>
        <Chip
          label={job.status}
          size="small"
          color={statusColors[job.status] || 'default'}
          sx={{ fontWeight: 900, borderRadius: 2, fontSize: '0.65rem' }}
        />
      </Box>

      <Divider sx={{ my: 1 }} />

      <Grid container spacing={1} sx={{ mb: 1.5 }}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>BRAND & SIZE</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{job.brand} {job.size}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>SERIAL NO</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace' }}>{job.serial_number}</Typography>
        </Grid>
        {job.job_number && (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>SUPPLIER JOB #</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{job.job_number}</Typography>
          </Grid>
        )}
        {job.selling_price > 0 && (
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>SELL PRICE</Typography>
            <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.9rem' }}>{Number(job.selling_price).toLocaleString()}</Typography>
          </Grid>
        )}
      </Grid>

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        {job.status === 'Received' && (
          <Button size="small" variant="outlined" color="primary" onClick={() => onDispatch(job)} sx={{ borderRadius: 2, fontWeight: 800, fontSize: '0.72rem' }}>
            DISPATCH
          </Button>
        )}
        {job.status === 'Sent to Supplier' && (
          <Button size="small" variant="outlined" color="success" onClick={() => onReceive(job)} sx={{ borderRadius: 2, fontWeight: 800, fontSize: '0.72rem' }}>
            MARK RETURNED
          </Button>
        )}
        <IconButton size="small" onClick={() => onDelete(job.id)} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
}

function CasingManagement({ retreadJobs = [], suppliers = [], masterData = {}, addRetreadJob, updateRetreadJob, deleteRetreadJob }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
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
        (t.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [retreadJobs, searchTerm]);

  const columns = [
    { field: 'customer_name', headerName: 'CUSTOMER', flex: 1, minWidth: 140, renderCell: (p) => <Typography sx={{ fontWeight: 800 }}>{p.value}</Typography> },
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
      width: 220,
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

  const statCards = [
    { label: 'Total Jobs', value: retreadJobs.length, color: '#1a237e', bg: 'rgba(26,35,126,0.07)' },
    { label: 'Pending', value: retreadJobs.filter(j => j.status === 'Received').length, color: '#0288d1', bg: 'rgba(2,136,209,0.07)' },
    { label: 'With Supplier', value: retreadJobs.filter(j => j.status === 'Sent to Supplier').length, color: '#f57f17', bg: 'rgba(245,127,23,0.07)' },
    { label: 'Ready to Sell', value: retreadJobs.filter(j => j.status === 'Returned').length, color: '#2e7d32', bg: 'rgba(46,125,50,0.07)' },
  ];

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      {/* Header */}
      <Box sx={{ mb: isMobile ? 2 : 4 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>
          Casing & Retreads
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Track casings from drop-off → supplier → sale
        </Typography>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant={isMobile ? 'fullWidth' : 'standard'}
        sx={{ mb: isMobile ? 2 : 4, '& .MuiTab-root': { fontWeight: 800, fontSize: isMobile ? '0.78rem' : '0.9rem', minHeight: 44 } }}
      >
        <Tab icon={<InventoryIcon sx={{ fontSize: isMobile ? 16 : 20 }} />} iconPosition="start" label="Dashboard" />
        <Tab icon={<ShippingIcon sx={{ fontSize: isMobile ? 16 : 20 }} />} iconPosition="start" label="Job Tracker" />
      </Tabs>

      {/* ── DASHBOARD TAB ── */}
      {activeTab === 0 && (
        <Box>
          {/* Stat cards */}
          <Grid container spacing={isMobile ? 1.5 : 2} sx={{ mb: 3 }}>
            {statCards.map(s => (
              <Grid item xs={6} sm={3} key={s.label}>
                <Card sx={{ borderRadius: 3, p: isMobile ? 1.5 : 2.5, bgcolor: s.bg, boxShadow: 'none', border: `1px solid ${s.color}22` }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Typography>
                  <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ fontWeight: 900, color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pie Chart */}
          <Card sx={{ borderRadius: 4, p: isMobile ? 2 : 4 }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ fontWeight: 900, mb: 1 }}>Jobs by Status</Typography>
            <Box sx={{ height: isMobile ? 220 : 300 }}>
              {statusData.length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={isMobile ? 40 : 60} outerRadius={isMobile ? 75 : 100} paddingAngle={5}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <SyncIcon sx={{ fontSize: 48, color: 'rgba(0,0,0,0.1)', mb: 1 }} />
                    <Typography color="text.secondary">No active jobs yet</Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Card>
        </Box>
      )}

      {/* ── JOB TRACKER TAB ── */}
      {activeTab === 1 && (
        <Box>
          {/* Toolbar */}
          <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
            <TextField
              fullWidth={isMobile}
              placeholder="Search customer, serial, brand..."
              size="small"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{ sx: { borderRadius: 3, bgcolor: '#fff', width: isMobile ? '100%' : 280 } }}
            />
            <Button
              fullWidth={isMobile}
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsAddDialogOpen(true)}
              sx={{ borderRadius: 3, fontWeight: 900, whiteSpace: 'nowrap' }}
            >
              RECEIVE CASING
            </Button>
          </Box>

          {/* Mobile: Cards | Desktop: DataGrid */}
          {isMobile || isTablet ? (
            <Box>
              {filteredJobs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <SyncIcon sx={{ fontSize: 56, color: 'rgba(0,0,0,0.08)', mb: 1 }} />
                  <Typography color="text.secondary">No casing jobs found</Typography>
                </Box>
              ) : (
                filteredJobs.map(job => (
                  <MobileJobCard
                    key={job.id}
                    job={job}
                    onDispatch={(j) => { setSelectedJob(j); setDispatchData({ supplier_id: j.supplier_id || '', job_number: '' }); setIsDispatchDialogOpen(true); }}
                    onReceive={(j) => { setSelectedJob(j); setReturnData({ cost_price: 0, selling_price: 0, status: 'Returned' }); setIsReturnDialogOpen(true); }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </Box>
          ) : (
            <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
              <StyledDataGrid
                rows={filteredJobs}
                columns={columns}
                autoHeight
                disableSelectionOnClick
                components={{ Toolbar: GridToolbar }}
              />
            </Card>
          )}
        </Box>
      )}

      {/* ── RECEIVE CASING DIALOG ── */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, p: isMobile ? 0 : 1 } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.25rem' }}>Receive Casing from Customer</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <MuiTextField fullWidth label="Customer Name *" variant="outlined" value={newJob.customer_name} onChange={e => setNewJob({...newJob, customer_name: e.target.value})} />
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <MuiTextField fullWidth label="Phone" variant="outlined" value={newJob.customer_phone} onChange={e => setNewJob({...newJob, customer_phone: e.target.value})} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <MuiTextField fullWidth label="Vehicle Number" variant="outlined" value={newJob.vehicle_number} onChange={e => setNewJob({...newJob, vehicle_number: e.target.value})} />
            </Grid>
          </Grid>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Brand</InputLabel>
                <Select value={newJob.brand} onChange={e => setNewJob({...newJob, brand: e.target.value})} label="Brand">
                  {(masterData?.brands || []).map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4}>
              <MuiTextField fullWidth label="Size" variant="outlined" value={newJob.size} onChange={e => setNewJob({...newJob, size: e.target.value})} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <MuiTextField fullWidth label="Serial Number *" variant="outlined" value={newJob.serial_number} onChange={e => setNewJob({...newJob, serial_number: e.target.value})} />
            </Grid>
          </Grid>
          <MuiTextField fullWidth label="Inspection Notes" multiline rows={2} variant="outlined" value={newJob.notes} onChange={e => setNewJob({...newJob, notes: e.target.value})} />
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 2 : 3, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button fullWidth={isMobile} variant="contained" onClick={handleAddJob} sx={{ borderRadius: 2, fontWeight: 900 }}>REGISTER CASING</Button>
        </DialogActions>
      </Dialog>

      {/* ── DISPATCH TO SUPPLIER DIALOG ── */}
      <Dialog open={isDispatchDialogOpen} onClose={() => setIsDispatchDialogOpen(false)} fullWidth maxWidth="xs" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4 } }}>
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
        <DialogActions sx={{ p: isMobile ? 2 : 3, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setIsDispatchDialogOpen(false)}>Cancel</Button>
          <Button fullWidth={isMobile} variant="contained" color="warning" onClick={handleDispatch} sx={{ borderRadius: 2, fontWeight: 900 }}>MARK DISPATCHED</Button>
        </DialogActions>
      </Dialog>

      {/* ── RECEIVE FROM SUPPLIER DIALOG ── */}
      <Dialog open={isReturnDialogOpen} onClose={() => setIsReturnDialogOpen(false)} fullWidth maxWidth="xs" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4 } }}>
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
        <DialogActions sx={{ p: isMobile ? 2 : 3, gap: 1 }}>
          <Button fullWidth={isMobile} onClick={() => setIsReturnDialogOpen(false)}>Cancel</Button>
          <Button fullWidth={isMobile} variant="contained" color="success" onClick={handleReturn} sx={{ borderRadius: 2, fontWeight: 900 }}>SAVE RECORD</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default CasingManagement;
