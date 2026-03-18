import React, { useState, useMemo } from 'react';
import {
  Typography, Grid, Card, CardContent, Avatar, Modal,
  IconButton, Box, Button, Collapse, Divider, Chip
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon, ShowChart as ShowChartIcon,
  Close as CloseIcon, Inventory as InventoryIcon,
  Category as CategoryIcon, LocalShipping as LocalShippingIcon,
  Speed as SpeedIcon, TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon, ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

const COLORS = ['#1a237e', '#f50057', '#00c853', '#ff6d00', '#6200ea', '#00b8d4', '#ffd600', '#ff1744'];

const StatCard = ({ stat }) => (
  <Card
    sx={{
      bgcolor: 'background.paper',
      color: 'text.primary',
      borderRadius: 4,
      boxShadow: '0 4px 25px rgba(0,0,0,0.03)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
        '& .stat-icon': {
          transform: 'scale(1.1) rotate(5deg)',
          bgcolor: 'primary.main',
          color: '#fff'
        }
      },
      position: 'relative',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.04)',
    }}
  >
    <CardContent sx={{ p: 4, flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Avatar 
          className="stat-icon"
          sx={{
            bgcolor: 'primary.light',
            color: 'primary.main',
            width: 56,
            height: 56,
            borderRadius: 4,
            transition: 'all 0.3s ease'
          }}
        >
          {stat.icon}
        </Avatar>
        <TrendingUpIcon sx={{ color: 'success.main', opacity: 0.5, fontSize: 20 }} />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{
          fontWeight: 800,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '1.2px',
          fontSize: '0.65rem',
          mb: 0.5
        }}>
          {stat.label}
        </Typography>
        <Typography variant="h4" sx={{
          fontWeight: 900,
          color: 'text.primary',
          letterSpacing: '-1px'
        }}>
          {stat.value}
        </Typography>
      </Box>
    </CardContent>
    <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.01)', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Updated just now
        </Typography>
    </Box>
  </Card>
);

function Dashboard({ tires = [], sales = [], businessProfile }) {
  const currency = businessProfile?.currency || 'LKR';
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChart] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => setExpanded(!expanded);

  const statistics = useMemo(() => {
    const totalTires = tires.reduce((sum, tire) => sum + (Number(tire.stock) || 0), 0);
    const totalValue = tires.reduce((sum, tire) => sum + ((Number(tire.price) || 0) * (Number(tire.stock) || 0)), 0);
    const totalSales = sales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const totalProfit = sales.reduce((sum, sale) => sum + (Number(sale.profit) || 0), 0);
    const uniqueBrands = new Set(tires.map(tire => tire.brand).filter(Boolean)).size;
    const averagePrice = totalTires > 0 ? totalValue / totalTires : 0;

    const tireSales = {};
    sales.forEach(sale => {
      (sale.sale_items || []).forEach(item => {
        if (item.tire_id) {
          tireSales[item.tire_id] = (tireSales[item.tire_id] || 0) + (Number(item.quantity) || 0);
        }
      });
    });

    let topSellingTire = { brand: 'N/A' };
    if (Object.keys(tireSales).length > 0) {
      const topId = Object.keys(tireSales).reduce((a, b) => tireSales[a] > tireSales[b] ? a : b);
      const found = tires.find(t => t.id === topId);
      if (found) topSellingTire = found;
    }

    const inventoryTurnover = totalValue > 0 ? totalSales / totalValue : 0;
    const lowestStockTire = tires.length > 0 ? tires.reduce((min, t) => (Number(t.stock) < Number(min.stock) ? t : min)) : { brand: 'N/A' };
    const avgProfitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

    return [
      { icon: <InventoryIcon />, label: 'Stock Volume', value: `${totalTires.toLocaleString()} Units` },
      { icon: <AttachMoneyIcon />, label: 'Capital Value', value: `${totalValue.toLocaleString()} ${currency}` },
      { icon: <TrendingUpIcon />, label: 'Gross Revenue', value: `${totalSales.toLocaleString()} ${currency}` },
      { icon: <ShowChartIcon />, label: 'Net Profit', value: `${totalProfit.toLocaleString()} ${currency}` },
      { icon: <CategoryIcon />, label: 'Brand Portfolio', value: uniqueBrands },
      { icon: <AttachMoneyIcon />, label: 'Avg Unit Price', value: `${averagePrice.toLocaleString()} ${currency}` },
      { icon: <LocalShippingIcon />, label: 'Top Performer', value: `${topSellingTire.brand}` },
      { icon: <SpeedIcon />, label: 'Inv. Turnover', value: inventoryTurnover.toFixed(2) },
      { icon: <TrendingDownIcon />, label: 'Critical Stock', value: `${lowestStockTire.brand || 'N/A'}` },
      { icon: <TrendingUpIcon />, label: 'Profit Margin', value: `${avgProfitMargin.toFixed(1)}%` },
    ];
  }, [tires, sales, currency]);

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
    })).slice(0, 10)
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
              case 'pie':
              case 'tire-pie':
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={data} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey={type.startsWith('tire') ? "stock" : "sales"}
                      >
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value, name) => [value, name === 'stock' ? 'Units in Stock' : name]} labelFormatter={(name) => `Brand: ${name}`} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                );
              case 'bar':
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} minTickGap={30} />
                       <YAxis tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={80} />
                      <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: 16, border: 'none' }} />
                      <Bar dataKey="sales" fill="#1a237e" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
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
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Insights Dashboard</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>Global performance tracking & inventory intelligence</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<AnalyticsIcon />} sx={{ borderRadius: 3, border: '1.5px solid rgba(0,0,0,0.1)', color: 'text.secondary' }}>Export Report</Button>
          <Button variant="contained" sx={{ borderRadius: 3, px: 4 }}>Refresh Intelligence</Button>
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ mb: 4 }}>
        {statistics.slice(0, 4).map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard stat={stat} />
          </Grid>
        ))}
      </Grid>

      <Collapse in={expanded}>
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {statistics.slice(4).map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index + 4}>
              <StatCard stat={stat} />
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
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Revenue & Scaling Momentum</Typography>
              <Chip label="Live Feed" size="small" color="primary" sx={{ fontWeight: 800, px: 1 }} />
            </Box>
            {renderChart('line', 380)}
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Inventory Mix</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Top 10 brands by stock volume</Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
              {renderChart('pie', 300)}
            </Box>
            <Divider sx={{ my: 3 }} />
            <Box>
                {tireData.slice(0, 10).map((t, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>{t.stock} Units</Typography>
                    </Box>
                ))}
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '85%', bgcolor: 'background.paper', p: 6, borderRadius: 8, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Intelligence Drill-Down</Typography>
            <IconButton onClick={() => setModalOpen(false)} sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}><CloseIcon /></IconButton>
          </Box>
          {renderChart(selectedChart, 500)}
        </Box>
      </Modal>
    </Box>
  );
}

export default Dashboard;