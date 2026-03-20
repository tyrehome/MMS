import React, { useState, useMemo, useEffect } from 'react';
import {
    Typography, Box, Tab, Tabs, Grid, Card, CardContent, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, TextField, InputAdornment, Button, IconButton,
    Collapse, Avatar, MenuItem, Select, FormControl, InputLabel, Tooltip
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from './AuthContext';
import CurrentAccount from './CurrentAccount';
import { supabase } from '../supabaseClient';
import {
    AccountBalance as BankIcon,
    Timeline as AnalyticsIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    AttachMoney as CashIcon,
    CreditCard as CreditIcon,
    ShoppingCart as CartIcon,
    Security as AuditIcon,
    CalendarToday as CalendarIcon,
    Receipt as ReceiptIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';

const Reports = ({ tires = [], sales = [], accounts = [], invoices = [], businessProfile }) => {
    const { isAdmin } = useAuth();
    const [hubTab, setHubTab] = useState(0);
    const [reportTab, setReportTab] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterPayment, setFilterPayment] = useState('All');
    const [expandedSale, setExpandedSale] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const currency = businessProfile?.currency || 'LKR';

    // Fetch audit logs when on audit tab
    const fetchAuditLogs = async () => {
        setLoadingAudit(true);
        const { data, error } = await supabase
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (!error && data) setAuditLogs(data);
        setLoadingAudit(false);
    };

    useEffect(() => {
        if (hubTab === 3) fetchAuditLogs();
    }, [hubTab]);

    // Analytics Logic
    const pandLData = useMemo(() => {
        let revenue = 0; let cogs = 0;
        sales.forEach(sale => {
            (sale.sale_items || []).forEach(item => {
                revenue += (parseFloat(item.price || 0) * parseInt(item.quantity || 0));
                if (item.tire_id) {
                    const tire = tires.find(t => t.id === item.tire_id);
                    if (tire) cogs += (parseFloat(tire.cost_price || 0) * parseInt(item.quantity || 0));
                }
            });
        });
        return { revenue, cogs, grossProfit: revenue - cogs };
    }, [sales, tires]);

    const movingData = useMemo(() => {
        const counts = {};
        sales.forEach(sale => {
            (sale.sale_items || []).forEach(item => {
                if (item.tire_id) {
                    const tire = tires.find(t => t.id === item.tire_id);
                    if (tire) {
                        const key = `${tire.brand} ${tire.size}`;
                        counts[key] = (counts[key] || 0) + parseInt(item.quantity || 0);
                    }
                }
            });
        });
        return Object.entries(counts).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
    }, [sales, tires]);

    // Sales History Logic
    const filteredSales = useMemo(() => {
        return sales
            .filter(s => {
                const matchSearch =
                    !searchTerm ||
                    (s.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (s.vehicle_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (s.id || '').toLowerCase().includes(searchTerm.toLowerCase());
                const matchDate = !filterDate || (s.created_at || '').startsWith(filterDate);
                const matchPayment = filterPayment === 'All' || s.payment_method === filterPayment;
                return matchSearch && matchDate && matchPayment;
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [sales, searchTerm, filterDate, filterPayment]);

    // Daily Summary & Payment Breakdown
    const dailySummary = useMemo(() => {
        const byDate = {};
        filteredSales.forEach(s => {
            const day = (s.created_at || '').split('T')[0];
            if (!byDate[day]) byDate[day] = { date: day, total: 0, cash: 0, credit: 0, count: 0 };
            byDate[day].total += parseFloat(s.total || 0);
            byDate[day].count += 1;
            if (s.payment_method === 'Cash') byDate[day].cash += parseFloat(s.total || 0);
            else if (s.payment_method === 'Credit Card') byDate[day].cash += parseFloat(s.total || 0);
            else if (s.payment_method === 'Customer Credit') byDate[day].credit += parseFloat(s.total || 0);
        });
        return Object.values(byDate).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [filteredSales]);

    const totals = useMemo(() => {
        const cashTotal = filteredSales.filter(s => s.payment_method !== 'Customer Credit').reduce((s, x) => s + parseFloat(x.total || 0), 0);
        const creditTotal = filteredSales.filter(s => s.payment_method === 'Customer Credit').reduce((s, x) => s + parseFloat(x.total || 0), 0);
        return {
            cash: cashTotal,
            credit: creditTotal,
            total: cashTotal + creditTotal,
            count: filteredSales.length
        };
    }, [filteredSales]);

    const paymentColor = (method) => {
        if (method === 'Cash') return 'success';
        if (method === 'Credit Card') return 'primary';
        if (method === 'Customer Credit') return 'warning';
        return 'default';
    };

    if (!isAdmin) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h5" color="error" sx={{ fontWeight: 900 }}>SECURITY CLEARANCE REQUIRED</Typography>
                <Typography variant="body1">This module is restricted to system administrators.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Finance & Ledger Hub</Typography>
                <Typography variant="body1" color="text.secondary">Administrative control over business performance, sales history, and audit trail</Typography>
            </Box>

            <Tabs
                value={hubTab}
                onChange={(e, v) => setHubTab(v)}
                sx={{
                    mb: 4,
                    '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
                    '& .MuiTab-root': { fontWeight: 800, fontSize: '0.9rem', textTransform: 'none', minHeight: 48 }
                }}
                variant="scrollable"
                scrollButtons="auto"
            >
                <Tab icon={<AnalyticsIcon />} iconPosition="start" label="Performance" />
                <Tab icon={<HistoryIcon />} iconPosition="start" label="Sales History" />
                <Tab icon={<BankIcon />} iconPosition="start" label="Ledger Accounts" />
                <Tab icon={<AuditIcon />} iconPosition="start" label="Audit Log" />
            </Tabs>

            {/* TAB 0: Performance Analytics */}
            {hubTab === 0 && (
                <Box>
                    <Tabs value={reportTab} onChange={(e, v) => setReportTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, fontSize: '0.85rem' } }}>
                        <Tab label="Profit & Loss" />
                        <Tab label="Stock Evaluation" />
                        <Tab label="Velocity" />
                    </Tabs>

                    {reportTab === 0 && (
                        <Grid container spacing={3}>
                            {[
                                { label: 'Total Revenue', value: pandLData.revenue, color: 'success.main', bg: 'rgba(76,175,80,0.05)' },
                                { label: 'Cost of Goods (COGS)', value: pandLData.cogs, color: 'text.secondary', bg: '#fff' },
                                { label: 'Gross Profit', value: pandLData.grossProfit, color: '#fff', bg: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)', dark: true }
                            ].map((s, i) => (
                                <Grid item xs={12} md={4} key={i}>
                                    <Card sx={{ borderRadius: 4, background: s.bg, color: s.dark ? '#fff' : 'inherit', border: '1px solid rgba(0,0,0,0.05)' }}>
                                        <CardContent sx={{ p: 4 }}>
                                            <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.8 }}>{s.label}</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900, color: s.color, mt: 1 }}>{s.value.toLocaleString()} <Typography component="span" variant="h6" sx={{ opacity: 0.6 }}>{currency}</Typography></Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {reportTab === 1 && (
                        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 900 }}>ITEM</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>QTY</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>COST BASIS</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>TOTAL VALUATION</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tires.map(t => (
                                        <TableRow key={t.id} hover>
                                            <TableCell sx={{ fontWeight: 700 }}>{t.brand} {t.size}</TableCell>
                                            <TableCell>{t.stock}</TableCell>
                                            <TableCell>{(t.cost_price || 0).toLocaleString()} {currency}</TableCell>
                                            <TableCell sx={{ fontWeight: 900, color: 'primary.main' }}>{((t.stock || 0) * (t.cost_price || 0)).toLocaleString()} {currency}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {reportTab === 2 && (
                        <Card sx={{ p: 4, borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>Top Selling Products</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={movingData.slice(0, 10)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <ChartTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="qty" fill="#1a237e" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    )}
                </Box>
            )}

            {/* TAB 1: Sales History */}
            {hubTab === 1 && (
                <Box>
                    <Tabs 
                        value={reportTab} 
                        onChange={(e, v) => setReportTab(v)} 
                        sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700 } }}
                    >
                        <Tab label="Sales Summary" />
                        <Tab label="Daily Summary" />
                        <Tab label="All Transactions" />
                    </Tabs>

                    {reportTab === 0 && (
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            {[
                                { label: 'Total Sales', value: totals.count + ' Transactions', icon: <CartIcon />, bg: 'rgba(26,35,126,0.04)', color: 'primary.main' },
                                { label: 'Cash & Card Revenue', value: totals.cash.toLocaleString() + ' ' + currency, icon: <CashIcon />, bg: 'rgba(76,175,80,0.05)', color: 'success.main' },
                                { label: 'Customer Credit (Deferred)', value: totals.credit.toLocaleString() + ' ' + currency, icon: <CreditIcon />, bg: 'rgba(255,152,0,0.05)', color: 'warning.main' },
                                { label: 'Grand Total', value: totals.total.toLocaleString() + ' ' + currency, icon: <ReceiptIcon />, bg: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)', color: '#fff', dark: true },
                            ].map((s, i) => (
                                <Grid item xs={12} sm={6} md={3} key={i}>
                                    <Card sx={{ borderRadius: 4, background: s.bg, border: '1px solid rgba(0,0,0,0.05)' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 900, color: s.dark ? 'rgba(255,255,255,0.7)' : 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</Typography>
                                                <Avatar sx={{ bgcolor: s.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)', color: s.color, width: 36, height: 36 }}>{s.icon}</Avatar>
                                            </Box>
                                            <Typography variant="h6" sx={{ fontWeight: 900, color: s.dark ? '#fff' : s.color }}>{s.value}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {/* Shared Filters for Tabs 1 & 2 */}
                    {reportTab > 0 && (
                        <Card sx={{ borderRadius: 4, mb: 3, p: 2.5, border: '1px solid rgba(0,0,0,0.05)' }}>
                             <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={5}>
                                    <TextField
                                        fullWidth size="small"
                                        placeholder="Search by customer, vehicle, or invoice ID..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                                            sx: { borderRadius: 3 }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <TextField
                                        fullWidth size="small" type="date" label="Filter by Date"
                                        value={filterDate}
                                        onChange={e => setFilterDate(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        InputProps={{ sx: { borderRadius: 3 } }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Payment Type</InputLabel>
                                        <Select value={filterPayment} label="Payment Type" onChange={e => setFilterPayment(e.target.value)} sx={{ borderRadius: 3 }}>
                                            <MenuItem value="All">All Payments</MenuItem>
                                            <MenuItem value="Cash">Cash</MenuItem>
                                            <MenuItem value="Credit Card">Credit Card</MenuItem>
                                            <MenuItem value="Customer Credit">Customer Credit</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={1}>
                                    <Button variant="outlined" onClick={() => { setSearchTerm(''); setFilterDate(''); setFilterPayment('All'); }} sx={{ borderRadius: 3, minWidth: 0, px: 2 }} size="small">Clear</Button>
                                </Grid>
                            </Grid>
                        </Card>
                    )}

                    {reportTab === 1 && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>Daily Summary</Typography>
                            <Card sx={{ borderRadius: 4, mb: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <TableContainer>
                                    <Table>
                                        <TableHead sx={{ bgcolor: 'rgba(26,35,126,0.03)' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 900, py: 2.5 }}>DATE</TableCell>
                                                <TableCell sx={{ fontWeight: 900 }}>TRANSACTIONS</TableCell>
                                                <TableCell sx={{ fontWeight: 900, color: 'success.main' }}>CASH / CARD</TableCell>
                                                <TableCell sx={{ fontWeight: 900, color: 'warning.main' }}>CREDIT</TableCell>
                                                <TableCell sx={{ fontWeight: 900 }}>DAY TOTAL</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {dailySummary.length === 0 && (
                                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 700 }}>No sales found for the selected filter.</TableCell></TableRow>
                                            )}
                                            {dailySummary.map((day, i) => (
                                                <TableRow key={i} hover>
                                                    <TableCell sx={{ fontWeight: 800 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                            {day.date}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell><Chip label={`${day.count} sales`} size="small" sx={{ fontWeight: 800 }} /></TableCell>
                                                    <TableCell sx={{ fontWeight: 800, color: 'success.main' }}>{day.cash.toLocaleString()} {currency}</TableCell>
                                                    <TableCell sx={{ fontWeight: 800, color: 'warning.main' }}>{day.credit.toLocaleString()} {currency}</TableCell>
                                                    <TableCell sx={{ fontWeight: 900, fontSize: '1rem' }}>{day.total.toLocaleString()} {currency}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Card>
                        </Box>
                    )}

                    {reportTab === 2 && (
                        <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>All Transactions ({filteredSales.length})</Typography>
                            <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                                <TableContainer>
                                    <Table>
                                        <TableHead sx={{ bgcolor: 'rgba(26,35,126,0.03)' }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 900, py: 2.5, width: 40 }} />
                                                <TableCell sx={{ fontWeight: 900 }}>DATE & TIME</TableCell>
                                                <TableCell sx={{ fontWeight: 900 }}>CUSTOMER</TableCell>
                                                <TableCell sx={{ fontWeight: 900 }}>VEHICLE</TableCell>
                                                <TableCell sx={{ fontWeight: 900 }}>PAYMENT</TableCell>
                                                <TableCell sx={{ fontWeight: 900, textAlign: 'right' }}>TOTAL</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredSales.length === 0 && (
                                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 700 }}>No transactions found.</TableCell></TableRow>
                                            )}
                                            {filteredSales.map(sale => (
                                                <React.Fragment key={sale.id}>
                                                    <TableRow
                                                        hover
                                                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(26,35,126,0.02)' } }}
                                                        onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                                                    >
                                                        <TableCell>
                                                            <IconButton size="small">
                                                                {expandedSale === sale.id ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                                                            </IconButton>
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                                                            {sale.created_at ? new Date(sale.created_at).toLocaleString() : '—'}
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 800 }}>{sale.customer_name || '—'}</TableCell>
                                                        <TableCell sx={{ color: 'text.secondary' }}>{sale.vehicle_number || '—'}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={sale.payment_method}
                                                                size="small"
                                                                color={paymentColor(sale.payment_method)}
                                                                sx={{ fontWeight: 800, borderRadius: 2 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 900, fontSize: '1rem', color: 'primary.main' }}>
                                                            {parseFloat(sale.total || 0).toLocaleString()} {currency}
                                                        </TableCell>
                                                    </TableRow>
                                                    {/* Expandable Item Details */}
                                                    <TableRow>
                                                        <TableCell colSpan={6} sx={{ py: 0, borderBottom: expandedSale === sale.id ? undefined : 'none' }}>
                                                            <Collapse in={expandedSale === sale.id} timeout="auto" unmountOnExit>
                                                                <Box sx={{ p: 3, bgcolor: 'rgba(26,35,126,0.02)', borderRadius: 3, m: 1 }}>
                                                                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                                        Invoice Items — Ref: {sale.id?.slice(0, 8).toUpperCase()}
                                                                    </Typography>
                                                                    <Table size="small" sx={{ mt: 1.5 }}>
                                                                        <TableHead>
                                                                            <TableRow>
                                                                                <TableCell sx={{ fontWeight: 900, py: 1, fontSize: '0.75rem' }}>ITEM</TableCell>
                                                                                <TableCell sx={{ fontWeight: 900, py: 1, fontSize: '0.75rem' }}>QTY</TableCell>
                                                                                <TableCell sx={{ fontWeight: 900, py: 1, fontSize: '0.75rem' }}>UNIT PRICE</TableCell>
                                                                                <TableCell sx={{ fontWeight: 900, py: 1, fontSize: '0.75rem', textAlign: 'right' }}>SUBTOTAL</TableCell>
                                                                            </TableRow>
                                                                        </TableHead>
                                                                        <TableBody>
                                                                            {(sale.sale_items || []).map(item => {
                                                                                const tire = item.tire_id ? tires.find(t => t.id === item.tire_id) : null;
                                                                                return (
                                                                                    <TableRow key={item.id}>
                                                                                        <TableCell sx={{ fontWeight: 700, py: 0.75 }}>{tire ? `${tire.brand} ${tire.size}` : (item.service_name || 'Service')}</TableCell>
                                                                                        <TableCell sx={{ py: 0.75 }}>{item.quantity}</TableCell>
                                                                                        <TableCell sx={{ py: 0.75 }}>{parseFloat(item.price || 0).toLocaleString()} {currency}</TableCell>
                                                                                        <TableCell align="right" sx={{ fontWeight: 800, py: 0.75 }}>{parseFloat(item.subtotal || 0).toLocaleString()} {currency}</TableCell>
                                                                                    </TableRow>
                                                                                );
                                                                            })}
                                                                        </TableBody>
                                                                    </Table>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 4 }}>
                                                                        <Typography variant="body2" sx={{ fontWeight: 800 }}>Total: <strong style={{ color: '#1a237e' }}>{parseFloat(sale.total || 0).toLocaleString()} {currency}</strong></Typography>
                                                                    </Box>
                                                                </Box>
                                                            </Collapse>
                                                        </TableCell>
                                                    </TableRow>
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Card>
                        </Box>
                    )}
                </Box>
            )}

            {/* TAB 2: Ledger Accounts */}
            {hubTab === 2 && (
                <CurrentAccount
                    businessProfile={businessProfile}
                    accountsList={accounts}
                    invoicesList={invoices}
                />
            )}

            {/* TAB 3: Audit Log */}
            {hubTab === 3 && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>System Audit Trail</Typography>
                        <Button startIcon={<RefreshIcon />} onClick={fetchAuditLogs} variant="outlined" sx={{ borderRadius: 3 }}>
                            {loadingAudit ? 'Loading...' : 'Refresh'}
                        </Button>
                    </Box>
                    <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <TableContainer>
                            <Table>
                                <TableHead sx={{ bgcolor: 'rgba(26,35,126,0.03)' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 900, py: 2.5 }}>DATE & TIME</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>ACTION</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>TABLE</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>RECORD ID</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>NOTES</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {auditLogs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary', fontWeight: 700 }}>
                                                {loadingAudit ? 'Loading audit logs...' : 'No audit events yet. Complete a sale to generate the first entry.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {auditLogs.map(log => (
                                        <TableRow key={log.id} hover>
                                            <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary' }}>
                                                {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.action}
                                                    size="small"
                                                    color={log.action === 'sale_processed' ? 'primary' : 'default'}
                                                    sx={{ fontWeight: 800, borderRadius: 2, textTransform: 'uppercase', fontSize: '0.7rem' }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.85rem' }}>{log.table_name || '—'}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                                                {log.record_id ? log.record_id.slice(0, 12) + '...' : '—'}
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 320 }}>
                                                <Tooltip title={log.notes || ''} placement="top">
                                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {log.notes || '—'}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Box>
            )}
        </Box>
    );
};

export default Reports;
