import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Typography, Grid, Card, Avatar, Modal,
  IconButton, Box, Button, Collapse, Divider, Chip,
  LinearProgress, Stack, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon, ShowChart as ShowChartIcon,
  Close as CloseIcon, Inventory as InventoryIcon,
  Category as CategoryIcon,
  Speed as SpeedIcon, TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon, ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AssignmentTurnedIn as TaskIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  NotificationsActive as AlertIcon,
  DateRange as CalendarIcon,
  AccountBalance as BankIcon
} from '@mui/icons-material';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
  BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['#1a237e', '#f50057', '#00c853', '#ff6d00', '#6200ea', '#00b8d4', '#ffd600', '#ff1744'];

function Dashboard({ 
  tires = [], 
  parts = [], 
  sales = [], 
  tasks = [], 
  workers = [], 
  suppliers = [], 
  accounts = [],
  appointments = [],
  businessProfile,
  inventoryLots = [] 
}) {
  const currency = businessProfile?.currency || 'LKR';
  const [expanded, setExpanded] = useState(false);
  const [dataHealthOpen, setDataHealthOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('daily');

  /* ── Lot Aging Alerts ── */
  const [agingAlerts, setAgingAlerts] = useState({ expired: 0, critical: 0, expiringSoon: 0, items: [] });

  useEffect(() => {
    supabase.from('v_stock_aging')
      .select('tire_id,brand,size,age_status,age_years,current_qty,manufacture_date')
      .in('age_status', ['Expired', 'Critical', 'Expiring Soon'])
      .then(({ data }) => {
        if (!data) return;
        setAgingAlerts({
          expired:      data.filter(l => l.age_status === 'Expired').length,
          critical:     data.filter(l => l.age_status === 'Critical').length,
          expiringSoon: data.filter(l => l.age_status === 'Expiring Soon').length,
          items: data.slice(0, 5)
        });
      });
  }, [tires, inventoryLots]);

  const handleExpandClick = () => setExpanded(!expanded);

  // --- LOGIC: EXTENDED ANALYTICS ---
  const extendedStats = useMemo(() => {
    // 1. Worker Performance (Simplified)
    const workerStats = workers.map(w => {
      const completedTasks = tasks.filter(t => t.worker_id === w.id && t.status === 'Completed').length;
      return { name: w.name, tasks: completedTasks };
    }).sort((a, b) => b.tasks - a.tasks).slice(0, 5);

    // 2. Financial Position
    const totalReceivables = accounts.reduce((sum, acc) => sum + (Number(acc.receivable) || 0), 0);
    const totalPayables = suppliers.reduce((sum, sup) => sum + (Number(sup.payable_balance) || 0), 0);
    const financialHealth = totalPayables > 0 ? (totalReceivables / totalPayables) * 100 : 100;

    // 3. Low Stock Alerts
    const lowStockTires = tires.filter(t => (Number(t.stock) || 0) <= 5);
    const lowStockParts = parts.filter(p => (Number(p.stock) || 0) <= 5);
    const lowStockItems = [...lowStockTires.map(t => ({ name: `${t.brand} ${t.size}`, stock: t.stock, type: 'Tire' })), 
                           ...lowStockParts.map(p => ({ name: p.name, stock: p.stock, type: 'Part' }))];

    // 4. Profitability Breakdown
    let tireProfit = 0;
    let serviceProfit = 0;
    let partsProfit = 0;

    sales.forEach(sale => {
      // Note: This is an estimation logic based on common data structures
      // In a real DB, we would query categories directly
      const profit = Number(sale.profit) || 0;
      if (sale.vehicle_number) { // Assuming workshop sales have vehicle numbers
          serviceProfit += profit * 0.4; // Weighted estimation
          tireProfit += profit * 0.6;
      } else {
          partsProfit += profit;
      }
    });

    const profitData = [
      { name: 'Tires', value: tireProfit },
      { name: 'Parts', value: partsProfit },
      { name: 'Services', value: serviceProfit }
    ];

    // 5. Categorized Stats
    const stats = [
      { icon: <BankIcon />, label: "Total Receivables", value: `${totalReceivables.toLocaleString()} ${currency}`, color: 'success.main' },
      { icon: <TrendingDownIcon />, label: "Total Payables", value: `${totalPayables.toLocaleString()} ${currency}`, color: 'error.main' },
      { icon: <PeopleIcon />, label: "Worker Force", value: `${workers.length} Active`, sub: 'Mechanics & Staff' },
      { icon: <AlertIcon />, label: "Critical Stock", value: `${lowStockItems.length} Items`, sub: 'Stock below 5 units', color: lowStockItems.length > 0 ? 'error.main' : 'success.main' },
    ];

    return { workerStats, totalReceivables, totalPayables, financialHealth, lowStockItems, profitData, stats };
  }, [workers, tasks, accounts, suppliers, tires, parts, sales, currency]);

  const insights = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString();

    let todayRev = 0;
    let yesterdayRev = 0;
    let missingDataCount = 0;
    const missingRecords = [];

    sales.forEach(s => {
      const saleDate = new Date(s.created_at).toLocaleDateString();
      if (saleDate === today) todayRev += Number(s.total) || 0;
      if (saleDate === yesterday) yesterdayRev += Number(s.total) || 0;

      const missingFields = [];
      if (!s.customer_name) missingFields.push('Customer Name');
      if (!s.vehicle_number) missingFields.push('Vehicle Plate');
      if (missingFields.length > 0) {
        missingDataCount++;
        missingRecords.push({ type: 'Sale', id: s.id, label: s.id.slice(0, 8), missing: missingFields });
      }
    });

    tires.forEach(t => {
      const missingFields = [];
      if (!t.dot_code) missingFields.push('DOT Code');
      if (!t.price || t.price === 0) missingFields.push('Selling Price');
      if (!t.cost_price || t.cost_price === 0) missingFields.push('Cost Price');
      if (!t.origin) missingFields.push('Origin');
      if (missingFields.length > 0) {
        missingDataCount++;
        missingRecords.push({ type: 'Tire', id: t.id, label: `${t.brand} ${t.size}`, missing: missingFields });
      }
    });

    parts.forEach(p => {
      const missingFields = [];
      if (!p.category) missingFields.push('Category');
      if (!p.price || p.price === 0) missingFields.push('Selling Price');
      if (missingFields.length > 0) {
        missingDataCount++;
        missingRecords.push({ type: 'Part', id: p.id, label: p.name, missing: missingFields });
      }
    });

    const totalFieldsCheck = (tires.length * 4) + (sales.length * 2) + (parts.length * 2);
    const healthScore = totalFieldsCheck > 0 ? Math.max(0, 100 - (missingDataCount / totalFieldsCheck * 100)) : 100;
    const revChange = yesterdayRev > 0 ? ((todayRev - yesterdayRev) / yesterdayRev) * 100 : (todayRev > 0 ? 100 : 0);

    return { todayRev, yesterdayRev, revChange, healthScore, missingRecords };
  }, [tires, sales, parts]);

  const statistics = useMemo(() => {
    const totalTires = tires.reduce((sum, tire) => sum + (Number(tire.stock) || 0), 0);
    const totalParts = parts.reduce((sum, part) => sum + (Number(part.stock) || 0), 0);
    const totalSalesValue = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const totalProfit = sales.reduce((sum, sale) => sum + (Number(sale.profit) || 0), 0);
    const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length;

    return [
      { icon: <AttachMoneyIcon />, label: "Today's Revenue", value: `${insights.todayRev.toLocaleString()} ${currency}`, sub: `${insights.revChange >= 0 ? '+' : ''}${insights.revChange.toFixed(1)}% vs yesterday` },
      { icon: <AnalyticsIcon />, label: "Data Health Score", value: `${insights.healthScore.toFixed(0)}%`, sub: `${insights.missingRecords.length} items need attention`, action: () => setDataHealthOpen(true) },
      { icon: <SpeedIcon />, label: 'Workshop Pulse', value: `${activeTasks} Active`, sub: 'Incoming & Progress' },
      { icon: <InventoryIcon />, label: 'Stock Valuation', value: `${(totalTires + totalParts).toLocaleString()} Units`, sub: `Tires & Spare Parts` },
      { icon: <TrendingUpIcon />, label: 'Historical Sales', value: `${totalSalesValue.toLocaleString()} ${currency}` },
      { icon: <ShowChartIcon />, label: 'Accumulated Profit', value: `${totalProfit.toLocaleString()} ${currency}` },
      ...extendedStats.stats
    ];
  }, [tires, parts, sales, tasks, insights, extendedStats, currency]);

  const salesData = useMemo(() => {
    const groups = {};
    
    sales.forEach(sale => {
      const d = new Date(sale.created_at);
      let key;
      
      if (timeframe === 'daily') {
        key = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      } else if (timeframe === 'weekly') {
        // Get start of week
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const startOfWeek = new Date(d.setDate(diff));
        key = 'Week ' + startOfWeek.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      } else {
        key = d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      }

      if (!groups[key]) groups[key] = { date: key, sales: 0, profit: 0, rawDate: new Date(sale.created_at) };
      groups[key].sales += Number(sale.total) || 0;
      groups[key].profit += Number(sale.profit) || 0;
    });

    return Object.values(groups).sort((a, b) => a.rawDate - b.rawDate);
  }, [sales, timeframe]);

  const tireData = useMemo(() =>
    tires.map(tire => ({
      name: tire.brand,
      stock: Number(tire.stock) || 0,
    })).sort((a, b) => b.stock - a.stock).slice(0, 10)
    , [tires]);

  return (
    <Box sx={{ py: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Business Intelligence</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Real-time operational overview & financial tracking</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<AnalyticsIcon />} sx={{ borderRadius: 3, fontWeight: 700 }}>Full Report</Button>
          <Button variant="contained" sx={{ borderRadius: 3, px: 4, fontWeight: 800 }} onClick={() => window.location.reload()}>Sync Now</Button>
        </Stack>
      </Box>

      {/* ── Stock Aging Alert Banner ── */}
      {(agingAlerts.expired > 0 || agingAlerts.critical > 0 || agingAlerts.expiringSoon > 0) && (
        <Box sx={{
          mb: 4, p: 3, borderRadius: 4,
          background: agingAlerts.expired > 0
            ? 'linear-gradient(135deg,#ffebee,#fff8e1)'
            : 'linear-gradient(135deg,#fff3e0,#fffde7)',
          border: agingAlerts.expired > 0 ? '1.5px solid #ef9a9a' : '1.5px solid #ffe082',
          display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap'
        }}>
          <Box sx={{ fontSize: 28, lineHeight: 1 }}>
            {agingAlerts.expired > 0 ? '🔴' : '🟠'}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1rem', color: agingAlerts.expired > 0 ? '#c62828' : '#e65100', mb: 0.5 }}>
              {agingAlerts.expired > 0 ? '🚨 Expired Stock Detected — Immediate Action Required' : '⚠️  Old Stock Alert — Sell These Tires First (FIFO)'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
              {agingAlerts.expired > 0 && (
                <Chip label={`🔴 ${agingAlerts.expired} EXPIRED batches`} size="small" sx={{ bgcolor: '#ffcdd2', color: '#c62828', fontWeight: 900 }} />
              )}
              {agingAlerts.critical > 0 && (
                <Chip label={`🟠 ${agingAlerts.critical} Critical (4-5 yrs)`} size="small" sx={{ bgcolor: '#ffe0b2', color: '#e65100', fontWeight: 900 }} />
              )}
              {agingAlerts.expiringSoon > 0 && (
                <Chip label={`🟡 ${agingAlerts.expiringSoon} Expiring Soon (3-4 yrs)`} size="small" sx={{ bgcolor: '#fff9c4', color: '#f57f17', fontWeight: 900 }} />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {agingAlerts.items.filter(l => l.age_status !== 'Healthy').map((lot, i) => (
                <Typography key={i} variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  · {lot.brand} {lot.size} — {lot.age_years} yrs · {lot.current_qty} units
                </Typography>
              ))}
            </Box>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', alignSelf: 'center' }}>
            Go to Inventory Hub → Stock
          </Typography>
        </Box>
      )}

      {/* Primary KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statistics.slice(0, 4).map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              onClick={stat.action}
              sx={{
                p: 3, height: '100%',
                borderRadius: 5,
                bgcolor: 'background.paper',
                border: '1px solid rgba(0,0,0,0.04)',
                cursor: stat.action ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 15px 35px rgba(0,0,0,0.06)' }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(26, 35, 126, 0.05)', color: 'primary.main', borderRadius: 2 }}>{stat.icon}</Avatar>
                {stat.sub && (
                  <Chip 
                    label={stat.sub} 
                    size="small" 
                    variant="outlined" 
                    sx={{ fontWeight: 800, fontSize: '0.65rem', color: stat.color || 'primary.main', borderColor: 'transparent' }} 
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1.2 }}>{stat.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, color: stat.color || 'inherit' }}>{stat.value}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Secondary Stats Collapse */}
      <Collapse in={expanded}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {statistics.slice(4).map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index + 4}>
                <Card sx={{ p: 2, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid rgba(0,0,0,0.03)' }}>
                  <Avatar sx={{ bgcolor: 'rgba(0,0,0,0.02)', color: 'primary.main', width: 40, height: 40, fontSize: '0.9rem' }}>{stat.icon}</Avatar>
                  <Box>
                     <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.65rem' }}>{stat.label}</Typography>
                     <Typography variant="body1" sx={{ fontWeight: 900, color: stat.color || 'inherit' }}>{stat.value}</Typography>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
      </Collapse>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 6 }}>
        <Button 
          size="small"
          onClick={handleExpandClick} 
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ borderRadius: 4, fontWeight: 800, color: 'text.secondary', px: 3, bgcolor: 'rgba(0,0,0,0.02)' }}
        >
          {expanded ? 'Less Data' : 'More Analytics'}
        </Button>
      </Box>

      {/* Main Charts Section */}
      <Grid container spacing={4}>
        {/* Operational Critical Center - Full Width Priority */}
        <Grid item xs={12}>
          <Card sx={{ p: 4, borderRadius: 5, border: '2px solid rgba(244, 67, 54, 0.12)', boxShadow: '0 8px 32px rgba(244, 67, 54, 0.05)' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <WarningIcon color="error" sx={{ fontSize: 32 }} /> Operational Critical Center
            </Typography>
            <Grid container spacing={4}>
              {/* Financial Position */}
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 3, bgcolor: 'rgba(0,184,212,0.04)', borderRadius: 4, border: '1px solid rgba(0,184,212,0.1)', height: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2, color: '#00b8d4' }}>Liquidity Balance</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="h4" sx={{ fontWeight: 900 }}>{extendedStats.financialHealth.toFixed(1)}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, extendedStats.financialHealth)} 
                    sx={{ height: 12, borderRadius: 6, bgcolor: 'rgba(0,0,0,0.05)', '& .MuiLinearProgress-bar': { borderRadius: 6 } }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', fontWeight: 700, fontSize: '0.75rem' }}>
                    Receivables ({extendedStats.totalReceivables.toLocaleString()} {currency}) cover {extendedStats.financialHealth.toFixed(0)}% of payables ({extendedStats.totalPayables.toLocaleString()} {currency}).
                  </Typography>
                </Box>
              </Grid>

              {/* Low Stock Alerts */}
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 3, bgcolor: 'rgba(244, 67, 54, 0.05)', borderRadius: 4, border: '1px solid rgba(244, 67, 54, 0.1)', height: '100%' }}>
                  <Typography variant="subtitle1" sx={{ color: 'error.main', fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InventoryIcon /> Critical Stock Alerts
                  </Typography>
                  <Stack spacing={1.5}>
                    {extendedStats.lowStockItems.length > 0 ? (
                      extendedStats.lowStockItems.slice(0, 5).map((item, i) => (
                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
                           <Chip label={`${item.stock} LEFT`} size="small" color="error" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 900 }} />
                        </Box>
                      ))
                    ) : (
                       <Typography variant="body2" color="success.main" sx={{ fontWeight: 800 }}>All stock levels healthy.</Typography>
                    )}
                  </Stack>
                </Box>
              </Grid>

              {/* Today's Appointments */}
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 3, bgcolor: 'rgba(104, 58, 183, 0.04)', borderRadius: 4, border: '1px solid rgba(104, 58, 183, 0.1)', height: '100%' }}>
                   <Typography variant="subtitle1" sx={{ color: '#683ab7', fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon /> Workshop Schedule
                   </Typography>
                   <Stack spacing={1.5}>
                    {appointments.filter(a => new Date(a.date).toLocaleDateString() === new Date().toLocaleDateString()).length > 0 ? (
                        appointments.filter(a => new Date(a.date).toLocaleDateString() === new Date().toLocaleDateString()).map((app, i) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{app.customer_name}</Typography>
                            <Chip label={new Date(app.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} size="small" sx={{ fontWeight: 900, bgcolor: 'rgba(104, 58, 183, 0.1)', color: '#683ab7' }} />
                          </Box>
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>No appointments for today.</Typography>
                    )}
                   </Stack>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 4, borderRadius: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Revenue Performance</Typography>
                <Typography variant="caption" color="text.secondary">Tracking of sales vs net profit</Typography>
              </Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <ToggleButtonGroup 
                  value={timeframe} 
                  exclusive 
                  onChange={(_, v) => v && setTimeframe(v)} 
                  size="small"
                  sx={{ bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2, '& .MuiToggleButton-root': { border: 'none', px: 2, fontWeight: 700, textTransform: 'none' } }}
                >
                  <ToggleButton value="daily">Daily</ToggleButton>
                  <ToggleButton value="weekly">Weekly</ToggleButton>
                  <ToggleButton value="monthly">Monthly</ToggleButton>
                </ToggleButtonGroup>
                <Chip icon={<TrendingUpIcon />} label="Growing" color="success" size="small" sx={{ fontWeight: 800 }} />
              </Stack>
            </Box>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a237e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1a237e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                  <RechartsTooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="sales" stroke="#1a237e" strokeWidth={4} fill="url(#salesGradient)" />
                  <Area type="monotone" dataKey="profit" stroke="#f50057" strokeWidth={3} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* Profit Mix */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, borderRadius: 5, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>Profit Distribution</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 4 }}>Contribution by category</Typography>
            <Box sx={{ flex: 1, position: 'relative' }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={extendedStats.profitData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                    {extendedStats.profitData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={8} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>{insights.healthScore.toFixed(0)}%</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.5 }}>Health</Typography>
              </Box>
            </Box>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
                {extendedStats.profitData.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS[i % COLORS.length] }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>{item.value.toLocaleString()} {currency}</Typography>
                  </Box>
                ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Data Health Fix Modal */}
      <Modal open={dataHealthOpen} onClose={() => setDataHealthOpen(false)}>
        <Box sx={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
          width: { xs: '95%', md: 600 }, maxHeight: '80vh', overflowY: 'auto',
          bgcolor: 'background.paper', p: 4, borderRadius: 6, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' 
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Data Quality Audit</Typography>
            <IconButton onClick={() => setDataHealthOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {insights.missingRecords.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 800 }}>Clean Data Pulse!</Typography>
                <Typography variant="body2" color="text.secondary">All records are currently up to full standard.</Typography>
              </Box>
            ) : (
              insights.missingRecords.map((rec, i) => (
                <Card key={i} variant="outlined" sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{rec.label}</Typography>
                    <Chip label={rec.type} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 900 }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {rec.missing.map((field, fi) => (
                      <Chip key={fi} label={field} size="small" color="error" variant="outlined" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 800 }} />
                    ))}
                  </Box>
                </Card>
              ))
            )}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

export default Dashboard;
