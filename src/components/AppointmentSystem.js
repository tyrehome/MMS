import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel,
  Grid, Card, CardContent, CardActions, IconButton, Snackbar, Alert, Tabs, Tab, Chip, Divider
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider, DatePicker, TimePicker } from "@mui/x-date-pickers";
import { Edit, Delete, CheckCircle, EventNote, PictureAsPdf, Phone } from "@mui/icons-material";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "../supabaseClient";

const localizer = momentLocalizer(moment);

const services_list = [
  "Tire Change",
  "Wheel Balancing",
  "Wheel Alignment",
  "Brake Service",
  "Oil Change",
  "General Maintenance",
];

const AppointmentSystem = ({ appointmentsList = [], vehiclesList = [] }) => {
  const [appointments, setAppointments] = useState(appointmentsList);

  useEffect(() => {
    setAppointments(appointmentsList);
  }, [appointmentsList]);

  const [formData, setFormData] = useState({
    customer_name: "", phone_number: "", email: "", service: "",
    appointment_date: null, appointment_time: null, notes: "", send_reminder: false,
  });
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [tabValue, setTabValue] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const appointmentData = {
      customer_name: formData.customer_name,
      phone_number: formData.phone_number,
      email: formData.email,
      service: formData.service,
      notes: formData.notes,
      send_reminder: formData.send_reminder,
      appointment_date: formData.appointment_date ? formData.appointment_date.toISOString() : null,
      appointment_time: formData.appointment_time ? formData.appointment_time.toISOString() : null,
      status: editingId ? "Updated" : "New",
      updated_at: new Date().toISOString()
    };
    try {
      if (editingId) {
        await supabase.from('appointments').update(appointmentData).eq('id', editingId);
        setEditingId(null);
        setSnackbar({ open: true, message: "Appointment updated", severity: "success" });
      } else {
        await supabase.from('appointments').insert([{ ...appointmentData, created_at: new Date().toISOString() }]);
        setSnackbar({ open: true, message: "Appointment saved", severity: "success" });
      }
      setFormData({ customer_name: "", phone_number: "", email: "", service: "", appointment_date: null, appointment_time: null, notes: "", send_reminder: false });
    } catch (e) {
      console.error(e);
      setSnackbar({ open: true, message: "Operation failed", severity: "error" });
    }
  };

  const handleEdit = (appointment) => {
    setFormData({
      ...appointment,
      customer_name: appointment.customer_name || "",
      phone_number: appointment.phone_number || "",
      appointment_date: appointment.appointment_date ? new Date(appointment.appointment_date) : null,
      appointment_time: appointment.appointment_time ? new Date(appointment.appointment_time) : null
    });
    setEditingId(appointment.id);
    setTabValue(0);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this appointment?")) {
      try {
        await supabase.from('appointments').delete().eq('id', id);
        setSnackbar({ open: true, message: "Appointment deleted", severity: "info" });
      } catch (e) { console.error(e); }
    }
  };

  const handleComplete = async (id) => {
    try {
      await supabase.from('appointments').update({ status: "Completed" }).eq('id', id);
      setSnackbar({ open: true, message: "Appointment completed", severity: "success" });
    } catch (e) { console.error(e); }
  };

  const filteredAppointments = filterStatus ? appointments.filter(app => app.status === filterStatus) : appointments;

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [["Customer", "Phone", "Service", "Date", "Status"]],
      body: appointments.map(app => [app.customer_name, app.phone_number, app.service, app.appointment_date ? new Date(app.appointment_date).toLocaleDateString() : "", app.status]),
    });
    doc.save("appointments.pdf");
  };

  const calendarEvents = appointments.map(app => ({
    id: app.id,
    title: `${app.customer_name} - ${app.service}`,
    start: app.appointment_date ? new Date(app.appointment_date) : new Date(),
    end: app.appointment_date ? moment(new Date(app.appointment_date)).add(1, "hours").toDate() : new Date(),
    resource: app,
  }));

  return (
    <Box sx={{ p: 2 }} >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>Service Appointment Log</Typography>
        <Typography variant="body1" color="text.secondary">Schedule and manage customer vehicle services with real-time availability</Typography>
      </Box>

      <Tabs
        value={tabValue}
        onChange={(e, v) => setTabValue(v)}
        sx={{
          mb: 4,
          '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          '& .MuiTab-root': { fontWeight: 700, fontSize: '0.95rem', textTransform: 'none' }
        }}
      >
        <Tab label="Booking Entry" />
        <Tab label="Appointment List" />
        <Tab label="Calendar View" />
        <Tab label="Service Reminders" />
      </Tabs>

      {tabValue === 0 && (
        <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.02)' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: 'primary.main' }}>Create Reservation</Typography>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Customer Name" name="customer_name" value={formData.customer_name} onChange={handleInputChange} fullWidth required variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Phone Number" name="phone_number" value={formData.phone_number} onChange={handleInputChange} fullWidth required variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} fullWidth required variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Requested Service</InputLabel>
                    <Select name="service" value={formData.service} onChange={handleInputChange} sx={{ borderRadius: 3 }}>
                      {services_list.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker label="Appointment Date" value={formData.appointment_date} onChange={d => setFormData({ ...formData, appointment_date: d })} renderInput={ps => <TextField {...ps} fullWidth required variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />} />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <TimePicker label="Requested Time" value={formData.appointment_time} onChange={t => setFormData({ ...formData, appointment_time: t })} renderInput={ps => <TextField {...ps} fullWidth required variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />} />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Additional Notes" name="notes" value={formData.notes} onChange={handleInputChange} fullWidth multiline rows={3} variant="outlined" InputProps={{ sx: { borderRadius: 3 } }} />
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 2, borderRadius: 3, fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 4px 14px 0 rgba(26, 35, 126, 0.39)' }}>
                    {editingId ? "COMMIT CHANGES" : "REGISTER APPOINTMENT"}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      )}

      {
        tabValue === 1 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Filter Status</InputLabel>
                <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} label="Filter Status" sx={{ borderRadius: 3 }}>
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="Updated">Updated</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" size="large" onClick={exportToPDF} startIcon={<PictureAsPdf />} sx={{ borderRadius: 3, fontWeight: 700, px: 4 }}>EXPORT PDF</Button>
            </Box>
            <Grid container spacing={3}>
              {filteredAppointments.map(app => (
                <Grid item xs={12} sm={6} md={4} key={app.id}>
                  <Card sx={{ borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>{app.customer_name}</Typography>
                        <Chip
                          label={app.status}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: app.status === 'Completed' ? 'success.main' : 'rgba(26,35,126,0.05)',
                            color: app.status === 'Completed' ? '#fff' : 'primary.main',
                            borderRadius: 2
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}><Phone sx={{ fontSize: 16, mr: 1 }} />{app.phone_number}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'secondary.main', mb: 1 }}>{app.service}</Typography>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'text.secondary' }}>
                          <EventNote sx={{ fontSize: 14, mr: 0.5 }} />
                          {app.appointment_date ? new Date(app.appointment_date).toLocaleDateString() : ""} @ {app.appointment_time ? new Date(app.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0, justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton size="small" onClick={() => handleEdit(app)} sx={{ bgcolor: 'rgba(26,35,126,0.05)', color: 'primary.main' }}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleComplete(app.id)} disabled={app.status === 'Completed'} sx={{ bgcolor: 'rgba(76,175,80,0.05)', color: 'success.main' }}><CheckCircle fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(app.id)} sx={{ bgcolor: 'rgba(244,67,54,0.05)', color: 'error.main' }}><Delete fontSize="small" /></IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )
      }

      {
        tabValue === 2 && (
          <Card sx={{ borderRadius: 4, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ p: 3, height: 700 }}>
              <Calendar localizer={localizer} events={calendarEvents} startAccessor="start" endAccessor="end" style={{ height: "100%" }} />
            </Box>
          </Card>
        )
      }

      {
        tabValue === 3 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: 'primary.main' }}>Upcoming & Overdue Service Reminders</Typography>
            <Grid container spacing={3}>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const nextMonth = new Date(today);
                nextMonth.setDate(today.getDate() + 30);

                let reminders = [];
                vehiclesList.forEach(v => {
                  (v.services || []).forEach(s => {
                    if (s.next_service_date) {
                      const nextDate = new Date(s.next_service_date);
                      if (nextDate <= nextMonth) {
                        reminders.push({
                          plate: v.license_plate,
                          last_service: s.date,
                          next_date: s.next_service_date,
                          work: s.work_done,
                          isOverdue: nextDate < today
                        });
                      }
                    }
                  });
                });

                reminders.sort((a, b) => new Date(a.next_date) - new Date(b.next_date));

                if (reminders.length === 0) {
                  return <Grid item xs={12}><Typography color="text.secondary">No vehicles are due for service in the next 30 days.</Typography></Grid>;
                }

                return reminders.map((rem, idx) => (
                  <Grid item xs={12} sm={6} md={3} key={idx}>
                    <Card sx={{
                      borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      border: '1px solid',
                      borderColor: rem.isOverdue ? 'error.main' : 'warning.main',
                      bgcolor: rem.isOverdue ? 'rgba(244, 67, 54, 0.02)' : 'rgba(255, 152, 0, 0.02)'
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>{rem.plate}</Typography>
                          <Chip
                            label={rem.isOverdue ? "OVERDUE" : "DUE SOON"}
                            size="small"
                            color={rem.isOverdue ? "error" : "warning"}
                            sx={{ fontWeight: 800, borderRadius: 2 }}
                          />
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', mb: 1 }}>Last Service: {new Date(rem.last_service).toLocaleDateString()}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', mb: 2 }}>Due Date: {new Date(rem.next_date).toLocaleDateString()}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">Previous Work: {rem.work}</Typography>
                      </CardContent>
                      <CardActions sx={{ px: 3, pb: 3, pt: 0 }}>
                        <Button variant="contained" fullWidth size="small" onClick={() => setTabValue(0)} sx={{ borderRadius: 2, fontWeight: 700 }}>BOOK APPOINTMENT</Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ));
              })()}
            </Grid>
          </Box>
        )
      }

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box >
  );
};

export default AppointmentSystem;
