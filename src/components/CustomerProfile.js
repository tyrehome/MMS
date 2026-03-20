import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Avatar, Chip, 
  Divider, List, ListItem, ListItemText, ListItemIcon, 
  Button, TextField, InputAdornment, Tab, Tabs, 
  Paper
} from '@mui/material';
import {
  Person, DirectionsCar, Hotel, 
  LocalPhone, Email, 
  Receipt, Warning, CalendarMonth, SettingsAccessibility,
  Add as AddIcon
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
  businessProfile
}) => {
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
  const customerSales = sales.filter(s => s.customer_name === selectedCustomer?.name);
  const totalSpent = customerSales.reduce((sum, s) => sum + Number(s.total || 0), 0);

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Customer CRM</Typography>
        <Typography variant="body1" color="text.secondary">Unified relationship management and service scheduling</Typography>
      </Box>

      <Tabs 
        value={tabLevel1} 
        onChange={(e, v) => setTabLevel1(v)} 
        sx={{ 
          mb: 4,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
          '& .MuiTab-root': { fontWeight: 800, fontSize: '0.95rem', textTransform: 'none' }
        }}
      >
        <Tab icon={<SettingsAccessibility />} iconPosition="start" label="Customer Intelligence" />
        <Tab icon={<CalendarMonth />} iconPosition="start" label="Appointments & Tasks" />
        <Tab icon={<DirectionsCar />} iconPosition="start" label="Fleet Tracking" />
      </Tabs>

      {tabLevel1 === 0 && (
        <Grid container spacing={3}>
          {/* Left Panel: Search & List */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
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

          {/* Right Panel: Details */}
          <Grid item xs={12} md={8}>
            {!selectedCustomer ? (
              <Card sx={{ height: 'calc(100vh - 280px)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.01)', borderRadius: 4, border: '2px dashed rgba(0,0,0,0.05)' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Person sx={{ fontSize: 80, color: 'rgba(0,0,0,0.05)', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">Select a profile to view 360° intelligence</Typography>
                </Box>
              </Card>
            ) : (
              <Card sx={{ height: 'calc(100vh - 280px)', overflowY: 'auto', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Box sx={{ p: 4, bgcolor: 'primary.main', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                  <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)', fontSize: 32, fontWeight: 900, border: '4px solid rgba(255,255,255,0.3)' }}>
                      {selectedCustomer.name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{selectedCustomer.name}</Typography>
                      <Grid container spacing={2}>
                        <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocalPhone sx={{ fontSize: 16, opacity: 0.8 }} />
                          <Typography variant="body2">{selectedCustomer.phone}</Typography>
                        </Grid>
                        <Grid item sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email sx={{ fontSize: 16, opacity: 0.8 }} />
                          <Typography variant="body2">{selectedCustomer.email || 'No email'}</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                    <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                      <Chip 
                        label={totalSpent > 100000 ? 'PREMIUM CLIENT' : 'ACTIVE CLIENT'}
                        sx={{ bgcolor: totalSpent > 100000 ? 'secondary.main' : 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 900, px: 1 }}
                      />
                      <Chip 
                        label={`LTV: ${totalSpent.toLocaleString()} LKR`}
                        sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 800, px: 1 }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ px: 4, py: 2, bgcolor: 'rgba(26, 35, 126, 0.04)', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>REVENUE LTV</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{totalSpent.toLocaleString()} {businessProfile?.currency || 'LKR'}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>OUTSTANDING</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: Number(customerAccount?.receivable) > 0 ? 'error.main' : 'success.main' }}>
                      {Number(customerAccount?.receivable || 0).toLocaleString()} {businessProfile?.currency || 'LKR'}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>STORAGE ITEMS</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: 'secondary.main' }}>{customerHotel.length} Sets</Typography>
                  </Box>
                </Box>

                <Tabs 
                  value={tabLevel2} 
                  onChange={(e, v) => setTabLevel2(v)} 
                  sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { fontWeight: 700 } }}
                >
                  <Tab label="Financials" />
                  <Tab label="Vehicles" />
                  <Tab label="Tire Hotel" />
                  <Tab label="History" />
                </Tabs>

                <CardContent sx={{ p: 4 }}>
                  {tabLevel2 === 0 && (
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'rgba(26, 35, 126, 0.02)' }}>
                          <CardContent>
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Account Receivable</Typography>
                            <Typography variant="h4" color="primary" sx={{ fontWeight: 900 }}>
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
                          <CardContent>
                            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Lifetime Value</Typography>
                            <Typography variant="h4" color="secondary" sx={{ fontWeight: 900 }}>
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
                      {customerHotel.map(h => (
                        <Paper key={h.id} variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                          <Grid container alignItems="center">
                            <Grid item xs={2} sx={{ textAlign: 'center' }}><Hotel color="primary" /></Grid>
                            <Grid item xs={6}>
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
                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Recent Invoices</Typography>
                      <List>
                        {customerSales.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).map(s => (
                          <ListItem key={s.id} sx={{ px: 0 }}>
                            <ListItemIcon><Receipt color="action" /></ListItemIcon>
                            <ListItemText 
                              primary={<Typography sx={{ fontWeight: 700 }}>{Number(s.total).toLocaleString()} LKR Invoice</Typography>}
                              secondary={`${format(new Date(s.created_at || new Date()), 'PPP')} • Method: ${s.payment_method}`}
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
        </Grid>
      )}

      {tabLevel1 === 1 && <AppointmentSystem appointmentsList={appointments} vehiclesList={vehicles} />}
      {tabLevel1 === 2 && <VehicleTracking vehiclesList={vehicles} businessProfile={businessProfile} />}

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
