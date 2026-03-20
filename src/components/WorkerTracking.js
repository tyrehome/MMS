import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Avatar, Button,
  Dialog, DialogTitle, DialogContent, TextField, Select,
  MenuItem, FormControl, InputLabel, Chip, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, Snackbar, Tab, Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';

const WorkerTracking = ({ workersList = [], tasksList = [], setBillingDraft, setSelectedComponent }) => {
  const [workers, setWorkers] = useState(workersList);
  const [tasks, setTasks] = useState(tasksList);
  const [tabValue, setTabValue] = useState(0);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [currentWorker, setCurrentWorker] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const [workerFormData, setWorkerFormData] = useState({ name: '', role: '', phone: '' });
  const [taskFormData, setTaskFormData] = useState({ 
    task: 'Installation', 
    details: '', 
    customer_name: '', 
    vehicle_number: '',
    date: format(new Date(), 'yyyy-MM-dd'), 
    time: format(new Date(), 'HH:mm') 
  });

  useEffect(() => { setWorkers(workersList); }, [workersList]);
  useEffect(() => { setTasks(tasksList); }, [tasksList]);

  const handleWorkerSubmit = async () => {
    if (editingWorker) await supabase.from('workers').update(workerFormData).eq('id', editingWorker.id);
    else await supabase.from('workers').insert([workerFormData]);
    setIsWorkerModalOpen(false);
    setSnackbar({ open: true, message: 'Registry synchronized' });
  };

  const handleTaskSubmit = async () => {
    const newTask = { 
      ...taskFormData, 
      worker_id: currentWorker.id, 
      status: 'In Progress' 
    };
    await supabase.from('tasks').insert([newTask]);
    setIsTaskModalOpen(false);
    setTaskFormData({ 
      task: 'Installation', 
      details: '', 
      customer_name: '', 
      vehicle_number: '',
      date: format(new Date(), 'yyyy-MM-dd'), 
      time: format(new Date(), 'HH:mm') 
    });
    setSnackbar({ open: true, message: 'Deployment authorized' });
  };

  const completeTask = async (id) => {
    await supabase.from('tasks').update({ status: 'Completed' }).eq('id', id);
    setSnackbar({ open: true, message: 'Mission achieved' });
  };

  const handleBillTask = (task) => {
    setBillingDraft({
      customer_name: task.customer_name,
      vehicle_number: task.vehicle_number,
      service_name: task.task,
      details: task.details,
      worker_id: task.worker_id
    });
    setSelectedComponent("SaleForm");
  };

  const getWorkerStats = (workerId) => {
    const wTasks = tasks.filter(t => t.worker_id === workerId);
    const completed = wTasks.filter(t => t.status === 'Completed').length;
    return { total: wTasks.length, completed, rate: wTasks.length > 0 ? (completed / wTasks.length) * 100 : 0 };
  };

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Workshop Hub</Typography>
        <Typography variant="body1" color="text.secondary">Mission-critical technical operations and team coordination</Typography>
      </Box>

      <Tabs 
        value={tabValue} 
        onChange={(e, v) => setTabValue(v)} 
        sx={{ 
          mb: 4,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
          '& .MuiTab-root': { fontWeight: 800, fontSize: '0.95rem', textTransform: 'none' }
        }}
      >
        <Tab icon={<PeopleIcon />} iconPosition="start" label="Personnel & Tasks" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingWorker(null); setWorkerFormData({ name: '', role: '', phone: '' }); setIsWorkerModalOpen(true); }} sx={{ borderRadius: 3, px: 4, fontWeight: 900 }}>ONBOARD PERSONNEL</Button>
          </Box>

          <Grid container spacing={3} sx={{ mb: 6 }}>
            {[{ l: 'Total Operatives', v: workers.length, c: 'primary.main' }, { l: 'Queue Active', v: tasks.filter(t => t.status !== 'Completed').length, c: 'secondary.main' }, { l: 'Efficiency Index', v: `${tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Completed').length / tasks.length) * 100) : 0}%`, c: 'success.main' }].map((s, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{ borderRadius: 4, p: 2, border: '1px solid rgba(0,0,0,0.05)' }}>
                    <CardContent>
                        <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.6 }}>{s.l}</Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: s.c }}>{s.v}</Typography>
                    </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3} sx={{ mb: 6 }}>
            {workers.map(worker => {
              const stats = getWorkerStats(worker.id);
              return (
                <Grid item xs={12} sm={6} lg={4} key={worker.id}>
                  <Card sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontWeight: 900 }}>{worker.name[0]}</Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 900 }}>{worker.name}</Typography>
                          <Chip label={worker.role} size="small" sx={{ fontWeight: 900, borderRadius: 2 }} />
                        </Box>
                      </Box>
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.6 }}>EFFICIENCY</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 900 }}>{Math.round(stats.rate)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={stats.rate} sx={{ height: 8, borderRadius: 4 }} />
                      </Box>
                      <Button fullWidth variant="contained" onClick={() => { setCurrentWorker(worker); setIsTaskModalOpen(true); }} sx={{ borderRadius: 3, fontWeight: 900 }}>DEPLOY TASK</Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(26, 35, 126, 0.03)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, py: 3 }}>OPERATIVE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>CUSTOMER / VEHICLE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>TASK</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.slice(0, 10).map(task => (
                    <TableRow key={task.id} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{workers.find(w => w.id === task.worker_id)?.name}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>{task.customer_name || 'N/A'}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>{task.vehicle_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 900 }}>{task.task}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>{task.details}</Typography>
                      </TableCell>
                      <TableCell><Chip label={task.status} size="small" color={task.status === 'Completed' ? 'success' : 'primary'} sx={{ fontWeight: 900, borderRadius: 2 }} /></TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          {task.status !== 'Completed' && (
                            <IconButton color="success" onClick={() => completeTask(task.id)}>
                              <CheckCircleIcon />
                            </IconButton>
                          )}
                          {task.status === 'Completed' && (
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="secondary" 
                              onClick={() => handleBillTask(task)}
                              sx={{ fontWeight: 900, borderRadius: 2 }}
                            >
                              BILL
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}


      <Dialog open={isWorkerModalOpen} onClose={() => setIsWorkerModalOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Operative Onboarding</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <TextField fullWidth label="Full Name" variant="standard" value={workerFormData.name} onChange={e => setWorkerFormData({...workerFormData, name: e.target.value})} />
          <TextField fullWidth label="Designated Role" variant="standard" value={workerFormData.role} onChange={e => setWorkerFormData({...workerFormData, role: e.target.value})} />
          <Button variant="contained" fullWidth size="large" onClick={handleWorkerSubmit} sx={{ borderRadius: 3, py: 2, fontWeight: 900 }}>SYNC PORTAL</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Technical Task Deployment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <FormControl fullWidth variant="outlined">
                <InputLabel>Task Type</InputLabel>
                <Select label="Task Type" value={taskFormData.task} onChange={e => setTaskFormData({...taskFormData, task: e.target.value})}>
                    <MenuItem value="Installation">Tire Installation</MenuItem>
                    <MenuItem value="Wheel Alignment">Wheel Alignment</MenuItem>
                    <MenuItem value="Wheel Balancing">Wheel Balancing</MenuItem>
                    <MenuItem value="Mechanical">Mechanical Work</MenuItem>
                </Select>
            </FormControl>
            <TextField fullWidth sx={{ mt: 1 }} label="Customer Name" value={taskFormData.customer_name} onChange={e => setTaskFormData({...taskFormData, customer_name: e.target.value})} />
            <TextField fullWidth sx={{ mt: 1 }} label="Vehicle Number" value={taskFormData.vehicle_number} onChange={e => setTaskFormData({...taskFormData, vehicle_number: e.target.value})} />
            <TextField fullWidth sx={{ mt: 1 }} multiline rows={3} label="Technical Details" value={taskFormData.details} onChange={e => setTaskFormData({...taskFormData, details: e.target.value})} />
            <Button variant="contained" fullWidth size="large" onClick={handleTaskSubmit} sx={{ borderRadius: 3, py: 2, fontWeight: 900 }}>AUTHORIZE DEPLOYMENT</Button>
        </DialogContent>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} message={snackbar.message} />
    </Box>
  );
};

export default WorkerTracking;
