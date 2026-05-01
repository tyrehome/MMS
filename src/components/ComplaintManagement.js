import React, { useState, useMemo } from 'react';
import {
  TextField, Button, Grid, Typography, Box, IconButton,
  Card, Tabs, Tab, Chip, useMediaQuery, useTheme,
  Select, MenuItem, InputLabel, FormControl, Paper, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Alert, InputAdornment, Tooltip, Avatar, Checkbox, FormControlLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Feedback as FeedbackIcon,
  Gavel as WarrantyIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  TrendingDown as LossIcon,
  MonetizationOn as ProfitIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../supabaseClient';

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
  'Open': 'error',
  'In Progress': 'warning',
  'Resolved': 'success',
  'Closed': 'default'
};

const priorityColors = {
  'Critical': '#d32f2f',
  'High': '#f57c00',
  'Medium': '#0288d1',
  'Low': '#388e3c'
};

function ComplaintManagement({ complaints = [], customers = [], sales = [], suppliers = [], workers = [], recordAudit, isAdmin, tires = [], parts = [] }) {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:768px)');
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [logs, setLogs] = useState([]);
  const [newLogText, setNewLogText] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_id: '',
    sale_id: '',
    subject: '',
    description: '',
    category: 'Service',
    priority: 'Medium',
    status: 'Open',
    assigned_worker_id: '',
    is_warranty_claim: false,
    item_id: '',
    item_type: 'tire',
    supplier_id: '',
    claim_amount: 0,
    customer_refund_amount: 0,
    supplier_contribution: 0,
    shop_contribution: 0,
    replacement_given: false,
    replacement_item_details: '',
    created_at: new Date().toISOString().split('T')[0],
    resolution_notes: ''
  });

  const financialData = useMemo(() => {
    const totalLoss = complaints.reduce((sum, c) => sum + Number(c.shop_contribution || 0), 0);
    const supplierRecovered = complaints.reduce((sum, c) => sum + Number(c.supplier_contribution || 0), 0);
    const pendingClaims = complaints.filter(c => c.is_warranty_claim && c.status !== 'Closed').length;
    
    return { totalLoss, supplierRecovered, pendingClaims };
  }, [complaints]);

  const chartData = useMemo(() => {
    const categories = complaints.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(categories).map(name => ({ name, count: categories[name] }));
  }, [complaints]);

  const handleOpenDialog = (complaint = null) => {
    if (complaint) {
      setSelectedComplaint(complaint);
      setFormData({ ...complaint });
      // Fetch logs
      supabase.from('complaint_logs')
        .select('*')
        .eq('complaint_id', complaint.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setLogs(data || []));
    } else {
      setSelectedComplaint(null);
      setLogs([]);
      setFormData({
        customer_name: '', customer_phone: '', customer_id: '', sale_id: '',
        subject: '', description: '', category: 'Service', priority: 'Medium',
        status: 'Open', assigned_worker_id: '', is_warranty_claim: false,
        item_id: '', item_type: 'tire',
        supplier_id: '', claim_amount: 0, supplier_contribution: 0,
        shop_contribution: 0, 
        replacement_given: false,
        replacement_item_details: '',
        resolution_notes: ''
      });
    }
    setNewLogText('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.subject) return setSnackbar({ open: true, message: 'Subject is required', severity: 'error' });
    
    try {
      const isNew = !selectedComplaint;
      const cleanData = { ...formData };
      ['customer_id', 'sale_id', 'assigned_worker_id', 'item_id', 'supplier_id', 'replacement_item_id'].forEach(key => {
        if (!cleanData[key]) cleanData[key] = null;
      });

      let result;
      if (isNew) {
        // Ensure created_at is included for manual date entry
        result = await supabase.from('complaints').insert([{
          ...cleanData,
          created_at: cleanData.created_at || new Date().toISOString()
        }]).select();
        if (recordAudit) recordAudit('Create Complaint', { subject: cleanData.subject, customer: cleanData.customer_name }, 'complaints');
      } else {
        result = await supabase.from('complaints').update(cleanData).eq('id', selectedComplaint.id).select();
        if (recordAudit) recordAudit('Update Complaint', { id: selectedComplaint.id, status: cleanData.status }, 'complaints');
      }

      if (result.error) throw result.error;
      const savedComplaint = result.data[0];

      // AUTOMATIC STOCK ADJUSTMENT FOR REPLACEMENTS
      // If status changed to Resolved/Closed AND replacement_given is true AND stock wasn't deducted yet
      if ((cleanData.status === 'Resolved' || cleanData.status === 'Closed') && 
          cleanData.replacement_given && 
          (!selectedComplaint || !selectedComplaint.replacement_given)) {
        
        if (cleanData.item_id && cleanData.item_type) {
           const table = cleanData.item_type === 'tire' ? 'tires' : 'parts';
           // Decrement stock by 1 for the replacement
           const { error: stockErr } = await supabase.rpc('adjust_stock', { 
             p_item_id: cleanData.item_id, 
             p_item_type: cleanData.item_type, 
             p_amount: -1 
           });
           
           if (!stockErr) {
             await supabase.from('complaint_logs').insert([{ 
               complaint_id: savedComplaint.id, 
               note: `Inventory Update: 1x ${cleanData.item_type} deducted from stock for replacement.` 
             }]);
             if (recordAudit) recordAudit('Inventory Adjustment (Claim)', { id: cleanData.item_id, type: cleanData.item_type, qty: -1 }, 'inventory');
           }
        }
      }
      
      const logMessage = isNew ? "Complaint opened." : `Status updated to ${cleanData.status}.`;
      await supabase.from('complaint_logs').insert([{ complaint_id: savedComplaint.id, note: logMessage }]);
      
      setSnackbar({ open: true, message: `Complaint ${isNew ? 'created' : 'updated'} successfully`, severity: 'success' });
      setIsDialogOpen(false);
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleAddLog = async () => {
    if (!newLogText.trim()) return;
    try {
      const { error } = await supabase.from('complaint_logs').insert([{ complaint_id: selectedComplaint.id, note: newLogText }]);
      if (error) throw error;
      if (recordAudit) recordAudit('Add Complaint Log', { id: selectedComplaint.id, note: newLogText }, 'complaints');
      setNewLogText('');
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this complaint permanentely?')) return;
    try {
      const { error } = await supabase.from('complaints').delete().eq('id', id);
      if (error) throw error;
      if (recordAudit) recordAudit('Delete Complaint', { id }, 'complaints');
      setSnackbar({ open: true, message: 'Complaint deleted.', severity: 'warning' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Deletion failed.', severity: 'error' });
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => 
      (c.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [complaints, searchTerm]);

  const columns = [
    { field: 'created_at', headerName: 'DATE', width: 120, valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : 'N/A' },
    { field: 'customer_name', headerName: 'CUSTOMER', flex: 1, minWidth: 150, renderCell: (p) => (
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{p.value}</Typography>
        <Typography variant="caption" color="text.secondary">{p.row.customer_phone}</Typography>
      </Box>
    )},
    { field: 'subject', headerName: 'SUBJECT', flex: 1.5, minWidth: 200, renderCell: (p) => {
      const linkedItem = p.row.item_type === 'tire' ? (sales || []).flatMap(s => s.items || []).find(i => i && i.tire_id === p.row.item_id) : null;
      return (
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.value}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
            {p.row.is_warranty_claim && <Chip label="WARRANTY" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900 }} />}
            {p.row.item_id && (
              <Chip 
                label={p.row.item_type === 'tire' ? 'TIRE LINKED' : 'PART LINKED'} 
                size="small" 
                variant="outlined" 
                sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900 }} 
              />
            )}
          </Box>
        </Box>
      );
    }},
    { field: 'category', headerName: 'CATEGORY', width: 120 },
    { field: 'priority', headerName: 'PRIORITY', width: 120, renderCell: (p) => (
      <Chip 
        label={p.value} 
        size="small" 
        sx={{ fontWeight: 900, bgcolor: priorityColors[p.value] + '22', color: priorityColors[p.value], border: `1px solid ${priorityColors[p.value]}44` }} 
      />
    )},
    { field: 'status', headerName: 'STATUS', width: 130, renderCell: (p) => (
      <Chip label={p.value} size="small" color={statusColors[p.value]} sx={{ fontWeight: 900 }} />
    )},
    { field: 'shop_contribution', headerName: 'SHOP P/L', width: 120, renderCell: (p) => {
      const val = Number(p.value);
      return (
        <Typography sx={{ fontWeight: 900, color: val > 0 ? 'error.main' : val < 0 ? 'success.main' : 'text.secondary' }}>
          {val > 0 ? `-${val.toLocaleString()}` : val < 0 ? `+${Math.abs(val).toLocaleString()}` : '0'}
        </Typography>
      );
    }},
    { field: 'actions', headerName: 'ACTIONS', width: 120, renderCell: (p) => (
      <Box>
        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(p.row)}><SearchIcon fontSize="small" /></IconButton>
        {isAdmin && <IconButton size="small" color="error" onClick={() => handleDelete(p.row.id)}><DeleteIcon fontSize="small" /></IconButton>}
      </Box>
    )}
  ];

  return (
    <Box sx={{ p: isMobile ? 1 : 2, maxWidth: '100vw', overflowX: 'hidden' }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>
            Complaint Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            Track customer feedback, warranty claims, and service resolutions
          </Typography>
        </Box>
        {!isMobile && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 3, fontWeight: 900 }}>
            NEW COMPLAINT
          </Button>
        )}
      </Box>

      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 800, textTransform: 'none' } }}>
        <Tab icon={<FeedbackIcon />} iconPosition="start" label="Insights" />
        <Tab icon={<WarrantyIcon />} iconPosition="start" label={isMobile ? "All" : "All Complaints"} />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {/* ALL-IN-ONE AUDIT HEADER */}
          <Paper sx={{ p: isMobile ? 2 : 3, mb: 4, borderRadius: 5, background: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)', color: 'white', boxShadow: '0 8px 32px rgba(26, 35, 126, 0.2)' }}>
            <Grid container spacing={isMobile ? 2 : 3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 900, mb: 1 }}>Complaint Department Audit</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>Real-time summary of customer issues and financial recoveries.</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.7, display: 'block' }}>RECOVERY RATE</Typography>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 900 }}>
                      {financialData.totalLoss + financialData.supplierRecovered > 0 
                        ? ((financialData.supplierRecovered / (financialData.totalLoss + financialData.supplierRecovered)) * 100).toFixed(0) 
                        : 0}%
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.7, display: 'block' }}>TOTAL RESOLVED</Typography>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 900 }}>
                      {complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.7, display: 'block' }}>OPEN ISSUES</Typography>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 900, color: '#ff5252' }}>
                      {complaints.filter(c => c.status === 'Open' || c.status === 'In Progress').length}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              {!isMobile && (
                <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
                  <Button 
                    variant="contained" 
                    color="secondary" 
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    sx={{ borderRadius: 3, fontWeight: 900, px: 3, py: 1, bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
                  >
                    LOG NEW ISSUE
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>
          <Grid container spacing={isMobile ? 1.5 : 3} sx={{ mb: isMobile ? 2 : 4 }}>
            {[
              { label: 'TOTAL SHOP LOSS', value: `LKR ${financialData.totalLoss.toLocaleString()}`, sub: 'Costs incurred resolving claims', icon: <LossIcon />, color: 'error', bg: 'rgba(244, 67, 54, 0.05)' },
              { label: 'SUPPLIER RECOVERED', value: `LKR ${financialData.supplierRecovered.toLocaleString()}`, sub: 'Claims accepted by suppliers', icon: <ProfitIcon />, color: 'success', bg: 'rgba(76, 175, 80, 0.05)' },
              { label: 'PENDING CLAIMS', value: financialData.pendingClaims, sub: 'Ongoing investigations', icon: <WarrantyIcon />, color: 'primary', bg: 'rgba(2, 136, 209, 0.05)' }
            ].map((stat, i) => (
              <Grid item xs={12} sm={4} key={i}>
                <Card sx={{ p: isMobile ? 2 : 3, borderRadius: 4, bgcolor: stat.bg, border: `1px solid ${theme.palette[stat.color].main}22`, boxShadow: 'none' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ color: `${stat.color}.main`, mr: 1, display: 'flex' }}>{stat.icon}</Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: `${stat.color}.main`, letterSpacing: 0.5 }}>{stat.label}</Typography>
                  </Box>
                  <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 900, color: `${stat.color}.main` }}>{stat.value}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{stat.sub}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={isMobile ? 2 : 3}>
            <Grid item xs={12} md={8}>
              <Card sx={{ p: isMobile ? 2 : 3, borderRadius: 4, minHeight: isMobile ? 300 : 400 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: isMobile ? 2 : 3, fontSize: isMobile ? '1rem' : '1.25rem' }}>Complaints by Category</Typography>
                <Box sx={{ height: isMobile ? 200 : 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: isMobile ? 10 : 12 }} />
                      <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={theme.palette.primary.main} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ p: isMobile ? 2 : 3, borderRadius: 4, height: '100%', bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, fontSize: isMobile ? '1rem' : '1.25rem' }}>Quick Tip</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.6, fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                  High "Shop Loss" in the Service category often indicates a need for worker retraining. 
                  Monitor "Warranty Claims" to identify low-quality tire batches from specific suppliers.
                </Typography>
                <Divider sx={{ my: isMobile ? 2 : 3, borderColor: 'rgba(255,255,255,0.1)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon sx={{ mr: 1, opacity: 0.8, fontSize: 20 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                    {financialData.pendingClaims > 5 ? 'High volume of pending claims! Follow up with suppliers.' : 'Claim volume is healthy.'}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
            <TextField
              fullWidth={isMobile}
              size="small"
              placeholder="Search by customer or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: isMobile ? '100%' : 350, bgcolor: 'white', borderRadius: 3 }}
              InputProps={{ 
                startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>,
                sx: { borderRadius: 3 }
              }}
            />
            {isMobile && (
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()} 
                sx={{ borderRadius: 3, fontWeight: 900, py: 1.2 }}
              >
                NEW COMPLAINT
              </Button>
            )}
          </Box>
          {isMobile ? (
            <Grid container spacing={2}>
              {filteredComplaints.map((c) => (
                <Grid item xs={12} key={c.id}>
                  <Card sx={{ p: 2.5, borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                          <Chip label={c.status} size="small" color={statusColors[c.status]} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900 }} />
                          <Chip label={c.priority} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, bgcolor: priorityColors[c.priority] + '22', color: priorityColors[c.priority] }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main', lineHeight: 1.2 }}>{c.subject}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'} • {c.customer_name}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => handleOpenDialog(c)} sx={{ bgcolor: 'rgba(26,35,126,0.05)' }}>
                        <SearchIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Box>
                    <Divider sx={{ my: 1.5, opacity: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary' }}>CATEGORY</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.category}</Typography>
                      </Box>
                      {Number(c.shop_contribution) > 0 && (
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'error.main' }}>LOSS</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: 'error.main' }}>{Number(c.shop_contribution).toLocaleString()}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Card>
                </Grid>
              ))}
              {filteredComplaints.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary" sx={{ fontWeight: 700 }}>No complaints found.</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          ) : (
            <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
              <StyledDataGrid
                rows={filteredComplaints}
                columns={columns}
                autoHeight
                disableSelectionOnClick
                components={{ Toolbar: GridToolbar }}
              />
            </Card>
          )}
        </Box>
      )}

      {/* --- ADD/EDIT DIALOG --- */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="md" fullScreen={isMobile} PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          {selectedComplaint ? 'Update Complaint' : 'Record New Complaint'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            {/* Core Info */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Customer Name" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Phone" value={formData.customer_phone} onChange={e => setFormData({...formData, customer_phone: e.target.value})} variant="outlined" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth type="date" label="Reported Date" 
                value={formData.created_at} 
                onChange={e => setFormData({...formData, created_at: e.target.value})} 
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Subject / Issue Title" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="e.g., Tire puncture after 1 week" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Detailed Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} variant="outlined" />
            </Grid>

            {/* Classification */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, is_warranty_claim: e.target.value === 'Warranty'})}>
                  <MenuItem value="Service">Service Issue</MenuItem>
                  <MenuItem value="Product">Product Defect</MenuItem>
                  <MenuItem value="Billing">Billing/Pricing</MenuItem>
                  <MenuItem value="Warranty">Warranty Claim</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select label="Priority" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <MenuItem value="Open">Open</MenuItem>
                  <MenuItem value="In Progress">In Progress</MenuItem>
                  <MenuItem value="Resolved">Resolved</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Links */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Product Type</InputLabel>
                <Select label="Product Type" value={formData.item_type} onChange={e => setFormData({...formData, item_type: e.target.value, item_id: ''})}>
                  <MenuItem value="tire">Tire</MenuItem>
                  <MenuItem value="part">Spare Part</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Link Product</InputLabel>
                <Select 
                  label="Link Product" 
                  value={formData.item_id || ''} 
                  onChange={e => {
                    const id = e.target.value;
                    if (!id) {
                      setFormData({ ...formData, item_id: '', claim_amount: 0, shop_contribution: -formData.supplier_contribution });
                      return;
                    }
                    const item = formData.item_type === 'tire' 
                      ? (tires || []).find(t => String(t.id) === String(id)) 
                      : (parts || []).find(p => String(p.id) === String(id));
                    
                    const price = item ? Number(item.price || 0) : 0;
                    setFormData({
                      ...formData, 
                      item_id: id, 
                      claim_amount: price, 
                      shop_contribution: price - Number(formData.supplier_contribution || 0)
                    });
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  {formData.item_type === 'tire' ? (
                    tires.map(t => <MenuItem key={t.id} value={t.id}>{t.brand} {t.size}</MenuItem>)
                  ) : (
                    parts.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Assigned To</InputLabel>
                <Select label="Assigned To" value={formData.assigned_worker_id} onChange={e => setFormData({...formData, assigned_worker_id: e.target.value})}>
                  <MenuItem value="">Unassigned</MenuItem>
                  {workers.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
               <Tooltip title="Link to the original sale if known">
                <TextField fullWidth label="Invoice / Sale ID (Optional)" value={formData.sale_id} onChange={e => setFormData({...formData, sale_id: e.target.value})} variant="outlined" />
               </Tooltip>
            </Grid>

            {/* Financial Section (Settlement & Split) */}
            {(formData.is_warranty_claim || formData.status === 'Resolved' || formData.status === 'Closed') && (
              <Grid item xs={12}>
                <Paper sx={{ p: isMobile ? 2 : 3, bgcolor: 'rgba(26,35,126,0.02)', borderRadius: 4, border: '1px solid rgba(26,35,126,0.1)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', color: 'primary.main' }}>
                    <ProfitIcon sx={{ fontSize: 18, mr: 1 }} /> SETTLEMENT & LOSS TRACKING
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        fullWidth type="number" label="Tire/Product Value (Original)" 
                        value={formData.claim_amount} 
                        onChange={e => {
                          const val = Number(e.target.value);
                          setFormData({...formData, claim_amount: val, shop_contribution: val - formData.supplier_contribution});
                        }} 
                        InputProps={{ startAdornment: <InputAdornment position="start">LKR</InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Supplier Responsible</InputLabel>
                        <Select label="Supplier Responsible" value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})}>
                          <MenuItem value="">None</MenuItem>
                          {suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        fullWidth type="number" label="Amount Paid to Customer" 
                        value={formData.customer_refund_amount} 
                        onChange={e => {
                          const refund = Number(e.target.value);
                          setFormData({
                            ...formData, 
                            customer_refund_amount: refund, 
                            shop_contribution: refund - Number(formData.supplier_contribution || 0)
                          });
                        }}
                        helperText="What you actually gave back"
                        InputProps={{ startAdornment: <InputAdornment position="start">LKR</InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        fullWidth type="number" label="Supplier Refund" 
                        value={formData.supplier_contribution} 
                        onChange={e => {
                          const supp = Number(e.target.value);
                          setFormData({
                            ...formData, 
                            supplier_contribution: supp, 
                            shop_contribution: Number(formData.customer_refund_amount || 0) - supp
                          });
                        }}
                        helperText="What the supplier covers"
                        InputProps={{ startAdornment: <InputAdornment position="start">LKR</InputAdornment> }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField 
                        fullWidth label={formData.shop_contribution <= 0 ? "Net Shop Gain" : "Net Shop Loss"}
                        value={Math.abs(formData.shop_contribution).toLocaleString()} 
                        disabled
                        InputProps={{ 
                          startAdornment: <InputAdornment position="start">LKR</InputAdornment>,
                          sx: { '& .MuiInputBase-input': { color: formData.shop_contribution <= 0 ? 'success.main' : 'error.main', fontWeight: 900 } }
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                      <FormControlLabel 
                        control={<Checkbox checked={formData.replacement_given} onChange={e => setFormData({...formData, replacement_given: e.target.checked})} />}
                        label={<Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>New Replacement Tire Given to Customer?</Typography>}
                      />
                    </Grid>
                    
                    {formData.replacement_given && (
                      <Grid item xs={12}>
                        <TextField 
                          fullWidth label="Replacement Details (Serial #, Model, etc.)" 
                          value={formData.replacement_item_details} 
                          onChange={e => setFormData({...formData, replacement_item_details: e.target.value})}
                          placeholder="e.g. Bridgestone 195/65R15 - Serial: 4521"
                        />
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Resolution Notes" value={formData.resolution_notes} onChange={e => setFormData({...formData, resolution_notes: e.target.value})} variant="outlined" />
            </Grid>

            {/* TIMELINE / LOGS */}
            {selectedComplaint && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2 }}>ACTIVITY TIMELINE</Typography>
                
                <Box sx={{ mb: 3 }}>
                  <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Add a comment or update note..." 
                    value={newLogText}
                    onChange={e => setNewLogText(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button size="small" variant="contained" onClick={handleSave} disabled={!newLogText.trim()} sx={{ borderRadius: 2, fontWeight: 800 }}>Post</Button>
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {logs.map((log) => (
                    <Box key={log.id} sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Avatar sx={{ width: 8, height: 8, bgcolor: log.status_change ? 'primary.main' : 'grey.400' }}> </Avatar>
                        <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'rgba(0,0,0,0.05)', my: 0.5 }}></Box>
                      </Box>
                      <Box sx={{ flexGrow: 1, pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                            {new Date(log.created_at).toLocaleString()}
                          </Typography>
                          {log.status_change && <Chip label={log.status_change} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900 }} />}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>{log.update_text}</Typography>
                      </Box>
                    </Box>
                  ))}
                  {logs.length === 0 && <Typography variant="caption" color="text.disabled">No history yet.</Typography>}
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setIsDialogOpen(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ borderRadius: 2, fontWeight: 900, px: 4 }}>
            {selectedComplaint ? 'UPDATE RECORD' : 'SAVE COMPLAINT'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ComplaintManagement;
