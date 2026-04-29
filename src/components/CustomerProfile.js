import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Avatar, Chip, 
  Divider, List, ListItem, ListItemText, ListItemIcon, 
  Button, TextField, InputAdornment, Tab, Tabs, 
  Paper, useMediaQuery, useTheme, IconButton
} from '@mui/material';
import {
  Person, DirectionsCar, Hotel, 
  LocalPhone, Email, 
  Receipt, Warning, CalendarMonth, SettingsAccessibility, Sync as SyncIcon,
  Add as AddIcon, PhoneInTalk as PhoneIcon, ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Snackbar, Alert 
} from '@mui/material';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';
import AppointmentSystem from './AppointmentSystem';
import VehicleTracking from './VehicleTracking';

const CustomerProfile = ({ 
  customers = [], 
  vehicles = [], 
  accounts = [], 
  hotelTires = [], 
  appointments = [],
  sales = [],
  retreadJobs = [],
  businessProfile
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabLevel1, setTabLevel1] = useState(0);
  const [tabLevel2, setTabLevel2] = useState(0);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', vehicle_number: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleRegister = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
        setSnackbar({ open: true, message: 'Name and Phone are mandatory.', severity: 'error' });
        return;
    }
    try {
        const { error } = await supabase.from('customers').insert([newCustomer]);
        if (error) throw error;
        setIsRegisterOpen(false);
        setNewCustomer({ name: '', phone: '', email: '', vehicle_number: '' });
        setSnackbar({ open: true, message: 'Client intelligence profile created.', severity: 'success' });
    } catch (err) {
        setSnackbar({ open: true, message: 'Registry failure: ' + err.message, severity: 'error' });
    }
  };

  // Aggregated Data for selected customer
  const customerVehicles = vehicles.filter(v => v.customer_name === selectedCustomer?.name);
  const customerAccount = accounts.find(a => a.customer_name === selectedCustomer?.name);
  const customerHotel = hotelTires.filter(h => h.customer_name === selectedCustomer?.name);
  const customerRetreads = retreadJobs.filter(r => r.customer_name === selectedCustomer?.name);
  const customerSales = sales.filter(s => s.customer_name === selectedCustomer?.name);
  const totalSpent = customerSales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  // Retention Logic: identify customers who haven't visited in > 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const retentionList = customers.map(c => {
    const custSales = sales.filter(s => s.customer_name === c.name);
    if (custSales.length === 0) return null;
    const lastSale = custSales.sort((a,b) => new Date(b.created_at || new Date().toISOString()) - new Date(a.created_at || new Date().toISOString()))[0];
    const lastVisit = new Date(lastSale.created_at || new Date().toISOString());
    return { ...c, lastVisit, isDue: lastVisit < sixMonthsAgo };
  }).filter(c => c && c.isDue).sort((a,b) => a.lastVisit - b.lastVisit);

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Customer CRM</Typography>
        <Typography variant="body1" color="text.secondary">Unified relationship management and service scheduling</Typography>
      </Box>

      <Tabs 
        value={tabLevel1} 
        onChange={(e, v) => setTabLevel1(v)} 
        variant={isMobile ? "scrollable" : "standard"}
        scrollButtons={isMobile ? "auto" : false}
        sx={{ 
          mb: isMobile ? 2 : 4,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
          '& .MuiTab-root': { fontWeight: 800, fontSize: isMobile ? '0.85rem' : '0.95rem', textTransform: 'none' }
        }}
      >
        <Tab icon={<SettingsAccessibility />} iconPosition="start" label={isMobile ? "Clients" : "Customer Intelligence"} />
        <Tab icon={<CalendarMonth />} iconPosition="start" label={isMobile ? "Bookings" : "Appointments & Tasks"} />
        <Tab icon={<DirectionsCar />} iconPosition="start" label={isMobile ? "Fleet" : "Fleet Tracking"} />
        <Tab icon={<PhoneIcon />} iconPosition="start" label={isMobile ? "Retention" : `Retention & Call List (${retentionList.length})`} />
      </Tabs>

      {tabLevel1 === 0 && (
        <React.Fragment>
        <Grid container spacing={3}>
          {/* Left Panel: Search & List */}
          {(!isMobile || !selectedCustomerId) && (
            <Grid item xs={12} md={4}>
              <Card sx={{ height: isMobile ? 'calc(100vh - 240px)' : 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Box sx={{ p: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Filter clients..."
                    variant="outlined"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 3 }
                    }}
                  />
                  <Button 
                      fullWidth 
                      variant="contained" 
                      startIcon={<AddIcon />} 
                      onClick={() => setIsRegisterOpen(true)}
                      sx={{ mt: 2, borderRadius: 3, fontWeight: 900 }}
                  >
                      REGISTER CLIENT
                  </Button>
                </Box>
                <Divider />
                <List sx={{ overflowY: 'auto', flexGrow: 1, p: 0 }}>
                  {filteredCustomers.map((customer) => (
                    <React.Fragment key={customer.id}>
                      <ListItem 
                        button 
                        selected={selectedCustomerId === customer.id}
                        onClick={() => setSelectedCustomerId(customer.id)}
                        sx={{
                          py: 2,
                          px: 3,
                          borderLeft: '4px solid transparent',
                          '&.Mui-selected': {
                            borderLeftColor: 'primary.main',
                            bgcolor: 'rgba(26, 35, 126, 0.04)',
                            '&:hover': { bgcolor: 'rgba(26, 35, 126, 0.08)' }
                          }
                        }}
                      >
                        <ListItemIcon>
                          <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', fontWeight: 800 }}>
                            {customer.name?.charAt(0)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText 
                          primary={<Typography sx={{ fontWeight: 700 }}>{customer.name}</Typography>}
                          secondary={customer.phone}
                        />
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </Card>
            </Grid>
          )}

          {/* Right Panel: Details */}
          {(!isMobile || selectedCustomerId) && (
            <Grid item xs={12} md={8}>
            {!selectedCustomer ? (
              <Card sx={{ height: 'calc(100vh - 280px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.01)', borderRadius: 4, border: '2px dashed rgba(0,0,0,0.05)' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Person sx={{ fontSize: 80, color: 'rgba(0,0,0,0.05)', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">Select a profile to view 360° intelligence</Typography>
                </Box>
              </Card>
            ) : (
                <Card sx={{ height: isMobile ? 'calc(100vh - 160px)' : 'calc(100vh - 280px)', overflowY: 'auto', borderRadius: isMobile ? 0 : 4, boxShadow: isMobile ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', border: isMobile ? 'none' : '1px solid rgba(0,0,0,0.05)' }}>
                  <Box sx={{ p: isMobile ? 2 : 4, bgcolor: 'primary.main', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                    {isMobile && (
                      <IconButton 
                        onClick={() => setSelectedCustomerId(null)} 
                        sx={{ color: '#fff', mb: 2, p: 0.5, bgcolor: 'rgba(255,255,255,0.1)' }}
                      >
                        <ArrowBackIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    )}
                    <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: isMobile ? 1.5 : 3, textAlign: isMobile ? 'center' : 'left' }}>
                      <Avatar sx={{ width: isMobile ? 70 : 80, height: isMobile ? 70 : 80, bgcolor: 'rgba(255,255,255,0.2)', fontSize: isMobile ? 28 : 32, fontWeight: 900, border: '4px solid rgba(255,255,255,0.3)' }}>
                        {selectedCustomer.name?.charAt(0)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 900, mb: isMobile ? 0.5 : 1 }}>{selectedCustomer.name}</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start', gap: isMobile ? 1 : 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocalPhone sx={{ fontSize: 14, opacity: 0.8 }} />
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{selectedCustomer.phone}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Email sx={{ fontSize: 14, opacity: 0.8 }} />
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{selectedCustomer.email || 'No email'}</Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: isMobile ? 'center' : 'right', display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', mt: isMobile ? 1 : 0 }}>
                        <Chip 
                          label={totalSpent > 100000 ? 'PREMIUM' : 'ACTIVE'}
                          size="small"
                          sx={{ bgcolor: totalSpent > 100000 ? 'secondary.main' : 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 900, height: 20, fontSize: '0.65rem' }}
                        />
                        <Chip 
                          label={`LTV: ${totalSpent.toLocaleString()}`}
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 800, height: 20, fontSize: '0.65rem' }}
                        />
                      </Box>
                    </Box>
                  </Box>

                <Box sx={{ px: isMobile ? 2 : 4, py: isMobile ? 1.5 : 2, bgcolor: 'rgba(26, 35, 126, 0.04)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 1.5 : 4 }}>
                  <Box sx={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: isMobile ? 'space-between' : 'flex-start', alignItems: isMobile ? 'center' : 'flex-start' }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', display: 'block', letterSpacing: 0.5 }}>REVENUE LTV</Typography>
                    <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 900, color: 'primary.main' }}>{totalSpent.toLocaleString()} <Typography component="span" variant="caption" sx={{ fontSize: '0.65rem' }}>{businessProfile?.currency || 'LKR'}</Typography></Typography>
                  </Box>
                  {!isMobile && <Divider orientation="vertical" flexItem />}
                  <Box sx={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: isMobile ? 'space-between' : 'flex-start', alignItems: isMobile ? 'center' : 'flex-start' }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', display: 'block', letterSpacing: 0.5 }}>OUTSTANDING</Typography>
                    <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 900, color: Number(customerAccount?.receivable) > 0 ? 'error.main' : 'success.main' }}>
                      {Number(customerAccount?.receivable || 0).toLocaleString()} <Typography component="span" variant="caption" sx={{ fontSize: '0.65rem' }}>{businessProfile?.currency || 'LKR'}</Typography>
                    </Typography>
                  </Box>
                  {!isMobile && <Divider orientation="vertical" flexItem />}
                  <Box sx={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: isMobile ? 'space-between' : 'flex-start', alignItems: isMobile ? 'center' : 'flex-start' }}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', display: 'block', letterSpacing: 0.5 }}>STORAGE ITEMS</Typography>
                    <Typography variant={isMobile ? "subtitle2" : "h6"} sx={{ fontWeight: 900, color: 'secondary.main' }}>{customerHotel.length} Sets</Typography>
                  </Box>
                </Box>

                <Tabs 
                  value={tabLevel2} 
                  onChange={(e, v) => setTabLevel2(v)} 
                  variant={isMobile ? "scrollable" : "standard"}
                  sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { fontWeight: 700, minWidth: isMobile ? 'auto' : 90 } }}
                >
                  <Tab label="Financials" />
                  <Tab label="Vehicles" />
                  <Tab label="Storage" />
                  <Tab label="Retreads" />
                  <Tab label="History" />
                </Tabs>

                <CardContent sx={{ p: isMobile ? 2 : 4 }}>
                  {tabLevel2 === 0 && (
                    <Grid container spacing={isMobile ? 2 : 3}>
                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'rgba(26, 35, 126, 0.02)' }}>
                          <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Account Receivable</Typography>
                            <Typography variant={isMobile ? "h5" : "h4"} color="primary" sx={{ fontWeight: 900 }}>
                              {Number(customerAccount?.receivable || 0).toLocaleString()} LKR
                            </Typography>
                            {Number(customerAccount?.receivable || 0) > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                                <Warning color="warning" sx={{ fontSize: 16 }} />
                                <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 700 }}>Outstanding Balance Due</Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'rgba(245, 0, 87, 0.02)' }}>
                          <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Lifetime Value</Typography>
                            <Typography variant={isMobile ? "h5" : "h4"} color="secondary" sx={{ fontWeight: 900 }}>
                              {totalSpent.toLocaleString()} LKR
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  {tabLevel2 === 1 && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Registered Vehicles</Typography>
                      <Grid container spacing={2}>
                        {customerVehicles.map(v => (
                          <Grid item xs={12} sm={6} key={v.id}>
                            <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main' }}><DirectionsCar /></Avatar>
                              <Box>
                                <Typography sx={{ fontWeight: 800 }}>{v.license_plate}</Typography>
                                <Typography variant="body2" color="text.secondary">{v.make_model}</Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {tabLevel2 === 2 && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Active Storage</Typography>
                      {customerHotel.length === 0 && (
                        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No active tire storage for this customer.</Typography>
                      )}
                      {customerHotel.map(h => (
                        <Paper key={h.id} variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                          <Grid container alignItems="center">
                            <Grid item xs={2} sx={{ textAlign: 'center' }}><Hotel color="primary" /></Grid>
                            <Grid item xs={10}>
                              <Typography sx={{ fontWeight: 800 }}>{h.quantity}x {h.brand} Tires</Typography>
                              <Typography variant="caption" color="text.secondary">Storage: {h.storage_date}</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Box>
                  )}

                  {tabLevel2 === 3 && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Retread & Casing Jobs</Typography>
                      {customerRetreads.length === 0 && (
                        <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No retread jobs for this customer.</Typography>
                      )}
                      {customerRetreads.map(r => (
                        <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                          <Grid container alignItems="center">
                            <Grid item xs={2} sx={{ textAlign: 'center' }}><SyncIcon color="primary" /></Grid>
                            <Grid item xs={10}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography sx={{ fontWeight: 800 }}>{r.brand} {r.size}</Typography>
                                <Chip label={r.status} size="small" color={r.status === 'Returned' ? 'success' : r.status === 'Sold' ? 'default' : 'warning'} sx={{ fontWeight: 900, fontSize: '0.65rem' }} />
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Serial: {r.serial_number}</Typography>
                              <Typography variant="caption" color="text.secondary">Received: {format(new Date(r.created_at), 'PPP')}</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      ))}
                    </Box>
                  )}

                  {tabLevel2 === 4 && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Recent Invoices</Typography>
                      <List sx={{ p: 0 }}>
                        {customerSales.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(s => (
                          <ListItem key={s.id} sx={{ px: 0, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                            <ListItemIcon sx={{ minWidth: 40 }}><Receipt color="action" /></ListItemIcon>
                            <ListItemText 
                              primary={<Typography sx={{ fontWeight: 700 }}>{Number(s.total).toLocaleString()} LKR</Typography>}
                              secondary={`${format(new Date(s.created_at || new Date()), isMobile ? 'MMM d, yyyy' : 'PPP')} • ${s.payment_method}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                    </CardContent>
                  </Card>
                )}
              </Grid>
            )}
          </Grid>
        </React.Fragment>
      )}

      {tabLevel1 === 1 && <AppointmentSystem appointmentsList={appointments} vehiclesList={vehicles} />}
      {tabLevel1 === 2 && <VehicleTracking vehiclesList={vehicles} businessProfile={businessProfile} />}
      
      {tabLevel1 === 3 && (
        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: 'primary.main' }}>Retention Call List</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            These customers haven't purchased anything in the last 6 months. It's time to call them for periodic services (Alignments, Rotations, Oil Changes).
          </Typography>
          
          {retentionList.length === 0 ? (
            <Alert severity="success" sx={{ borderRadius: 3 }}>All clients are fully up-to-date with their service protocols!</Alert>
          ) : (
            <List sx={{ p: 0 }}>
              {retentionList.map(c => (
                <Paper key={c.id} variant="outlined" sx={{ p: isMobile ? 1.5 : 2, mb: 1.5, borderRadius: 3, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'error.light', color: 'error.main' }}><Warning /></Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 900, fontSize: isMobile ? '0.95rem' : '1rem' }}>{c.name}</Typography>
                      <Typography variant="body2" color="text.secondary">Last seen: {format(c.lastVisit, isMobile ? 'MMM d, yyyy' : 'PPP')}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto', gap: 2 }}>
                    <Typography sx={{ fontWeight: 800, color: 'text.secondary', fontSize: isMobile ? '0.85rem' : '1rem' }}>{c.phone || 'No Phone'}</Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size={isMobile ? "small" : "medium"}
                      startIcon={<PhoneIcon />} 
                      onClick={() => setSelectedCustomerId(c.id) || setTabLevel1(0)} 
                      sx={{ borderRadius: 2, fontWeight: 800 }}
                    >
                      VIEW LOG
                    </Button>
                  </Box>
                </Paper>
              ))}
            </List>
          )}
        </Card>
      )}

      <Dialog open={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Client Intelligence Registration</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField fullWidth label="Full Name" variant="standard" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} required />
            <TextField fullWidth label="Contact Number" variant="standard" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} required />
            <TextField fullWidth label="Email Address" variant="standard" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
            <TextField fullWidth label="Primary Vehicle Number" variant="standard" value={newCustomer.vehicle_number} onChange={e => setNewCustomer({...newCustomer, vehicle_number: e.target.value})} />
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 1 }}>
            <Button onClick={() => setIsRegisterOpen(false)}>Abort</Button>
            <Button variant="contained" onClick={handleRegister} sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}>SYNC & PROTOCOL</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerProfile;
