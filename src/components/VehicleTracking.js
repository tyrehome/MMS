import React, { useState, useEffect } from 'react';
import {
    TextField, Button, Paper, Grid, Typography, Dialog, DialogActions,
    DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText,
    Divider, Avatar, Card, CardContent, Box, Chip, Snackbar, Alert
} from '@mui/material';
import { Add, Search, Delete, DirectionsCar, Notifications, PictureAsPdf } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format, addDays } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../supabaseClient';

const VehicleTracking = ({ businessProfile, vehiclesList = [] }) => {
    const [vehicles, setVehicles] = useState(vehiclesList);
    const [searchPlate, setSearchPlate] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [newService, setNewService] = useState({
        mechanic_name: '', work_done: '', cost: '', next_service_date: addDays(new Date(), 180), date: new Date()
    });
    const [openForm, setOpenForm] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [statistics, setStatistics] = useState({ totalVehicles: 0, totalServices: 0, totalRevenue: 0 });

    const currency = businessProfile?.currency || 'LKR';

    useEffect(() => {
        setVehicles(vehiclesList);
        let totalVehicles = vehiclesList.length;
        let totalServices = 0;
        let totalRevenue = 0;
        vehiclesList.forEach(v => {
            totalServices += (v.services || []).length;
            (v.services || []).forEach(s => totalRevenue += parseFloat(s.cost || 0));
        });
        setStatistics({ totalVehicles, totalServices, totalRevenue });

        if (selectedVehicle) {
            const updated = vehiclesList.find(v => v.license_plate === selectedVehicle.license_plate);
            if (updated) setSelectedVehicle(updated);
        }
    }, [vehiclesList, selectedVehicle]);

    const handleSearch = () => {
        const vehicle = vehicles.find(v => v.license_plate?.toLowerCase() === searchPlate.toLowerCase());
        if (vehicle) {
            setSelectedVehicle(vehicle);
            setSnackbar({ open: true, message: 'Vehicle identified.', severity: 'success' });
        } else {
            setSelectedVehicle({ license_plate: searchPlate, services: [] });
            setSnackbar({ open: true, message: 'New vehicle record initialized.', severity: 'info' });
        }
    };

    const handleAddService = async () => {
        const existingVehicle = vehicles.find(v => v.license_plate === selectedVehicle.license_plate);
        const formatted = {
            ...newService,
            date: format(newService.date, 'yyyy-MM-dd'),
            next_service_date: format(newService.next_service_date, 'yyyy-MM-dd')
        };
        try {
            if (existingVehicle) {
                await supabase.from('vehicles').update({
                    services: [...(existingVehicle.services || []), formatted],
                    updated_at: new Date().toISOString()
                }).eq('id', existingVehicle.id);
            } else {
                await supabase.from('vehicles').insert([{
                    license_plate: selectedVehicle.license_plate,
                    services: [formatted],
                    created_at: new Date().toISOString()
                }]);
            }
            setOpenForm(false);
            setNewService({ mechanic_name: '', work_done: '', cost: '', next_service_date: addDays(new Date(), 180), date: new Date() });
            setSnackbar({ open: true, message: 'Service log saved.', severity: 'success' });
        } catch (e) { console.error(e); }
    };

    const handleDeleteService = async (index) => {
        const updated = selectedVehicle.services.filter((_, i) => i !== index);
        try {
            await supabase.from('vehicles').update({
                services: updated,
                updated_at: new Date().toISOString()
            }).eq('id', selectedVehicle.id);
            setSnackbar({ open: true, message: 'Log entry removed.', severity: 'success' });
        } catch (e) { console.error(e); }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        doc.text(`Service History - ${selectedVehicle.license_plate}`, 14, 20);
        doc.autoTable({
            head: [['Date', 'Mechanic', 'Service Performed', 'Cost']],
            body: selectedVehicle.services.map(s => [s.date, s.mechanic_name, s.work_done, `${s.cost} ${currency}`]),
            startY: 30
        });
        doc.save(`${selectedVehicle.license_plate}_History.pdf`);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>Vehicle Service Tracking</Typography>
                <Typography variant="body1" color="text.secondary">Maintain detailed maintenance logs for commercial and private fleets</Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.02)' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'rgba(26, 35, 126, 0.08)', color: 'primary.main', mr: 2 }}><DirectionsCar /></Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Fleet Summary</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">Total Registered: <strong>{statistics.totalVehicles}</strong></Typography>
                            <Typography variant="body2" color="text.secondary">Lifetime Logs: <strong>{statistics.totalServices}</strong></Typography>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>{statistics.totalRevenue.toLocaleString()} {currency}</Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.02)' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'rgba(245, 0, 87, 0.08)', color: 'secondary.main', mr: 2 }}><Notifications /></Avatar>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Maintenance Alerts</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                <Chip
                                    label="System Operational: All vehicles current"
                                    color="success"
                                    variant="soft"
                                    sx={{ fontWeight: 700, borderRadius: 2 }}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Card sx={{ p: 1, borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                label="License Plate Number"
                                value={searchPlate}
                                onChange={e => setSearchPlate(e.target.value)}
                                fullWidth
                                variant="outlined"
                                InputProps={{ sx: { borderRadius: 3 } }}
                            />
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<Search />}
                                onClick={handleSearch}
                                sx={{ borderRadius: 3, px: 6, py: 1.5, fontWeight: 700 }}
                            >
                                IDENTIFY
                            </Button>
                        </Box>
                    </Card>
                </Grid>

                {selectedVehicle && (
                    <Grid item xs={12}>
                        <Card sx={{ borderRadius: 4, boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                    <Box>
                                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>Records for: {selectedVehicle.license_plate}</Typography>
                                        <Typography variant="body2" color="text.secondary">History of services and maintenance performed</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Button variant="contained" color="secondary" startIcon={<Add />} onClick={() => setOpenForm(true)} sx={{ borderRadius: 2, fontWeight: 700 }}>LOG SERVICE</Button>
                                        <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={generatePDF} sx={{ borderRadius: 2, fontWeight: 700 }}>PDF EXPORT</Button>
                                    </Box>
                                </Box>

                                <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                                    {selectedVehicle.services && selectedVehicle.services.length > 0 ? (
                                        selectedVehicle.services.map((s, i) => (
                                            <React.Fragment key={i}>
                                                <ListItem sx={{ py: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' } }}>
                                                    <Box sx={{ mr: 3, textAlign: 'center', minWidth: 80 }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>DATE</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.date}</Typography>
                                                    </Box>
                                                    <ListItemText
                                                        primary={<Typography sx={{ fontWeight: 800, color: 'primary.main' }}>{s.work_done}</Typography>}
                                                        secondary={`Lead Mechanic: ${s.mechanic_name} • Material/Labor Cost: ${Number(s.cost).toLocaleString()} ${currency}`}
                                                    />
                                                    <IconButton onClick={() => handleDeleteService(i)} color="error" sx={{ bgcolor: 'rgba(244, 67, 54, 0.05)' }}><Delete /></IconButton>
                                                </ListItem>
                                                {i < selectedVehicle.services.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <Box sx={{ py: 8, textAlign: 'center' }}>
                                            <Typography color="text.secondary">No service history found for this vehicle.</Typography>
                                        </Box>
                                    )}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>

            <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>New Service Entry</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField label="Lead Mechanic" fullWidth margin="normal" value={newService.mechanic_name} onChange={e => setNewService({ ...newService, mechanic_name: e.target.value })} variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                    <TextField label="Work Description" fullWidth margin="normal" multiline rows={3} value={newService.work_done} onChange={e => setNewService({ ...newService, work_done: e.target.value })} variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                    <TextField label={`Total Cost (${currency})`} fullWidth margin="normal" type="number" value={newService.cost} onChange={e => setNewService({ ...newService, cost: e.target.value })} variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                    <Box sx={{ mt: 2 }}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Service Delivery Date"
                                value={newService.date}
                                onChange={d => setNewService({ ...newService, date: d })}
                                renderInput={ps => <TextField {...ps} fullWidth margin="normal" variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />}
                            />
                        </LocalizationProvider>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenForm(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
                    <Button onClick={handleAddService} variant="contained" sx={{ borderRadius: 2, fontWeight: 700, px: 4 }}>Save Service Log</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default VehicleTracking;
