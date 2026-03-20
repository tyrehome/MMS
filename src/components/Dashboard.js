import React, { useState, useMemo } from 'react';
import {
  Typography, Grid, Card, Avatar, Modal,
  IconButton, Box, Button, Collapse, Divider, Chip
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon, ShowChart as ShowChartIcon,
  Close as CloseIcon, Inventory as InventoryIcon,
  Category as CategoryIcon,
  Speed as SpeedIcon, TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon, ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

const COLORS = ['#1a237e', '#f50057', '#00c853', '#ff6d00', '#6200ea', '#00b8d4', '#ffd600', '#ff1744'];


function Dashboard({ tires = [], sales = [], tasks = [], businessProfile }) {
  const currency = businessProfile?.currency || 'LKR';
  const [expanded, setExpanded] = useState(false);
  const [dataHealthOpen, setDataHealthOpen] = useState(false);

  const handleExpandClick = () => setExpanded(!expanded);

  // --- LOGIC: DATA HEALTH & PULSE ---
  const insights = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString();

    let todayRev = 0;
    let yesterdayRev = 0;
    let missingDataCount = 0;
    const missingRecords = [];

    // Sales Analysis
    sales.forEach(s => {
      const saleDate = new Date(s.created_at).toLocaleDateString();
      if (saleDate === today) todayRev += Number(s.total) || 0;
      if (saleDate === yesterday) yesterdayRev += Number(s.total) || 0;

      // Check for missing data in sales
      const missingFields = [];
      if (!s.customer_name) missingFields.push('Customer Name');
      if (!s.vehicle_number) missingFields.push('Vehicle Plate');
      if (missingFields.length > 0) {
        missingDataCount++;
        missingRecords.push({ type: 'Sale', id: s.id, label: s.id.slice(0, 8), missing: missingFields });
      }
    });

    // Tires Analysis
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

    const totalFieldsCheck = (tires.length * 4) + (sales.length * 2);
    const healthScore = totalFieldsCheck > 0 ? Math.max(0, 100 - (missingDataCount / totalFieldsCheck * 100)) : 100;
    const revChange = yesterdayRev > 0 ? ((todayRev - yesterdayRev) / yesterdayRev) * 100 : (todayRev > 0 ? 100 : 0);

    return { todayRev, yesterdayRev, revChange, healthScore, missingRecords };
  }, [tires, sales]);

  const statistics = useMemo(() => {
    const totalTires = tires.reduce((sum, tire) => sum + (Number(tire.stock) || 0), 0);
    const totalValue = tires.reduce((sum, tire) => sum + ((Number(tire.price) || 0) * (Number(tire.stock) || 0)), 0);
    const totalSales = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const totalProfit = sales.reduce((sum, sale) => sum + (Number(sale.profit) || 0), 0);
    const uniqueBrands = new Set(tires.map(tire => tire.brand).filter(Boolean)).size;
    const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length;

    return [
      { icon: <AttachMoneyIcon />, label: "Today's Revenue", value: `${insights.todayRev.toLocaleString()} ${currency}`, sub: `${insights.revChange >= 0 ? '+' : ''}${insights.revChange.toFixed(1)}% vs yesterday` },
      { icon: <AnalyticsIcon />, label: "Data Health Score", value: `${insights.healthScore.toFixed(0)}%`, sub: `${insights.missingRecords.length} items need attention`, action: () => setDataHealthOpen(true) },
      { icon: <SpeedIcon />, label: 'Active Workshop', value: `${activeTasks} Tasks`, sub: 'Ready for processing' },
      { icon: <InventoryIcon />, label: 'Total Inventory', value: `${totalTires.toLocaleString()} Units`, sub: `Across ${uniqueBrands} brands` },
      { icon: <TrendingUpIcon />, label: 'Total Revenue', value: `${totalSales.toLocaleString()} ${currency}` },
      { icon: <ShowChartIcon />, label: 'Net Profit', value: `${totalProfit.toLocaleString()} ${currency}` },
      { icon: <CategoryIcon />, label: 'Brand Portfolio', value: uniqueBrands },
      { icon: <TrendingDownIcon />, label: 'Stock Value', value: `${totalValue.toLocaleString()} ${currency}` },
    ];
  }, [tires, sales, tasks, insights, currency]);

  const salesData = useMemo(() =>
    sales.map(sale => ({
      date: new Date(sale.created_at).toLocaleDateString(),
      sales: Number(sale.total) || 0,
      profit: Number(sale.profit) || 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date))
    , [sales]);

  const tireData = useMemo(() =>
    tires.map(tire => ({
      name: tire.brand,
      stock: Number(tire.stock) || 0,
      value: (Number(tire.price) || 0) * (Number(tire.stock) || 0)
    })).sort((a, b) => b.stock - a.stock).slice(0, 10)
    , [tires]);

  const renderChart = (type, height = 300) => {
    if (!type) return null;
    const data = type.startsWith('tire') ? tireData : salesData;

    return (
      <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
        <Box sx={{ minWidth: { xs: 500, md: 'auto' }, height }}>
          {(() => {
            switch (type) {
              case 'line':
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1a237e" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#1a237e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} minTickGap={30} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                      <RechartsTooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="sales" stroke="#1a237e" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                      <Area type="monotone" dataKey="profit" stroke="#f50057" strokeWidth={3} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              case 'tire-pie':
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={tireData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="stock"
                      >
                        {tireData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value) => [value, 'Units']} labelFormatter={(name) => `Brand: ${name}`} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                );
              default: return null;
            }
          })()}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Insights Dashboard</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Global performance tracking & inventory intelligence</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<AnalyticsIcon />} sx={{ borderRadius: 3, border: '1.5px solid rgba(0,0,0,0.1)', color: 'text.secondary' }}>Export Intelligence</Button>
          <Button variant="contained" sx={{ borderRadius: 3, px: 4 }} onClick={() => window.location.reload()}>Refresh Intelligence</Button>
        </Box>
      </Box>

      {/* Primary Stats */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {statistics.slice(0, 4).map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              onClick={stat.action}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 4,
                cursor: stat.action ? 'pointer' : 'default',
                p: 3,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.3s',
                '&:hover': { transform: stat.action ? 'translateY(-4px)' : 'none', boxShadow: stat.action ? '0 10px 30px rgba(0,0,0,0.1)' : 'none' }
              }}
            >
              <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 50, height: 50, borderRadius: 3 }}>
                {stat.icon}
              </Avatar>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{stat.value}</Typography>
                {stat.sub && <Typography variant="caption" sx={{ color: stat.sub.includes('-') ? 'error.main' : 'success.main', fontWeight: 700 }}>{stat.sub}</Typography>}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Collapse in={expanded}>
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {statistics.slice(4).map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index + 4}>
              <Card sx={{ p: 3, borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase' }}>{stat.label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>{stat.value}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Collapse>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 8 }}>
        <Button
          onClick={handleExpandClick}
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ borderRadius: 4, px: 4, bgcolor: 'rgba(0,0,0,0.02)', color: 'text.secondary', fontWeight: 800, fontSize: '0.8rem' }}
        >
          {expanded ? 'Fewer Insights' : 'Advanced Analytics Portfolio'}
        </Button>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 4, borderRadius: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Revenue Momentum</Typography>
                <Typography variant="caption" color="text.secondary">Sales vs Profit trajectory</Typography>
              </Box>
              <Chip label="Live Feed" size="small" color="primary" sx={{ fontWeight: 800 }} />
            </Box>
            {renderChart('line', 380)}
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, height: '100%', borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Inventory Mix</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Top 10 brands by stock volume</Typography>
            <Box sx={{ height: 200, mb: 4 }}>
              {renderChart('tire-pie', 200)}
            </Box>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ maxHeight: 250, overflowY: 'auto', pr: 1 }}>
                {tireData.map((t, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.name}</Typography>
                        <Chip label={`${t.stock} Units`} size="small" variant="outlined" sx={{ fontWeight: 800, height: 24 }} />
                    </Box>
                ))}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Data Health Modal */}
      <Modal open={dataHealthOpen} onClose={() => setDataHealthOpen(false)}>
        <Box sx={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
          width: { xs: '95%', md: 600 }, maxHeight: '80vh', overflowY: 'auto',
          bgcolor: 'background.paper', p: 4, borderRadius: 6, boxShadow: 24 
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Data Intelligence Fix-List</Typography>
            <IconButton onClick={() => setDataHealthOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            The following records have missing or incomplete information. Updating these will improve your business insights and reporting accuracy.
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {insights.missingRecords.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">System Data is 100% Healthy!</Typography>
              </Box>
            ) : (
              insights.missingRecords.map((rec, i) => (
                <Card key={i} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{rec.label}</Typography>
                    <Chip label={rec.type} size="small" color={rec.type === 'Tire' ? 'primary' : 'secondary'} sx={{ height: 20, fontSize: '0.65rem' }} />
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {rec.missing.map((field, fi) => (
                      <Chip key={fi} label={field} size="small" color="error" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
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