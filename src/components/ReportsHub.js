import React, { useState, useMemo, useEffect } from 'react';
import {
    Typography, Box, Tab, Tabs, Grid, Card, CardContent, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, TextField, Button, useMediaQuery
} from '@mui/material';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer
} from 'recharts';
import {
    Search as SearchIcon,
    Print as PrintIcon,
    Analytics as AnalyticsIcon,
    Inventory as InventoryIcon,
    History as HistoryIcon,
    Assignment as AuditIcon,
    CalendarToday as CalendarIcon,
    GetApp as DownloadIcon,
    FlashOn as PulseIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { Snackbar, Alert } from '@mui/material';

const ReportsHub = ({ tires = [], sales = [], accounts = [], invoices = [], parts = [], businessProfile, recordAudit }) => {
    const { isAdmin } = useAuth();
    const isMobile = useMediaQuery('(max-width:600px)');
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

    const currency = businessProfile?.currency || 'LKR';

    // Fetch audit logs
    const fetchAuditLogs = async () => {
        setLoadingAudit(true);
        try {
            const { data: logs, error: logsError } = await supabase
                .from('audit_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (logsError) throw logsError;

            if (logs && logs.length > 0) {
                const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))];
                if (userIds.length > 0) {
                    const { data: profiles, error: pError } = await supabase
                        .from('profiles')
                        .select('id, name, email')
                        .in('id', userIds);

                    if (!pError && profiles) {
                        const profilesMap = profiles.reduce((acc, p) => {
                            acc[p.id] = p;
                            return acc;
                        }, {});
                        const enrichedData = logs.map(log => ({
                            ...log,
                            profiles: profilesMap[log.user_id] || null
                        }));
                        setAuditLogs(enrichedData);
                    } else {
                        setAuditLogs(logs);
                    }
                } else {
                    setAuditLogs(logs);
                }
            }
        } catch (error) {
            console.error('Audit fetch error:', error);
        } finally {
            setLoadingAudit(false);
        }
    };

    useEffect(() => {
        if (tabValue === 3) fetchAuditLogs();
    }, [tabValue]);

    // Analytics Logic
    const pandLData = useMemo(() => {
        let revenue = 0; let cogs = 0;
        sales.forEach(sale => {
            (sale.sale_items || []).forEach(item => {
                revenue += (parseFloat(item.price || 0) * parseInt(item.quantity || 0));
                if (item.tire_id) {
                    const tire = tires.find(t => t.id === item.tire_id);
                    if (tire) cogs += (parseFloat(tire.cost_price || 0) * parseInt(item.quantity || 0));
                } else if (item.part_id) {
                    const part = (parts || []).find(p => p.id === item.part_id);
                    if (part) cogs += (parseFloat(part.cost_price || 0) * parseInt(item.quantity || 0));
                }
            });
        });
        return { revenue, cogs, grossProfit: revenue - cogs };
    }, [sales, tires, parts]);

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

    const filteredSales = useMemo(() => {
        return sales
            .filter(s => {
                const matchSearch = !searchTerm || (s.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.vehicle_number || '').toLowerCase().includes(searchTerm.toLowerCase());
                const matchDate = !filterDate || (s.created_at || '').startsWith(filterDate);
                return matchSearch && matchDate;
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [sales, searchTerm, filterDate]);

    // Performance Pulse Logic
    const pulseData = useMemo(() => {
        const filtered = sales.filter(s => {
            const saleDate = (s.created_at || '').split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        });
        
        let revenue = 0; let profit = 0;
        const payments = {};

        filtered.forEach(s => {
            revenue += parseFloat(s.total || 0);
            profit += parseFloat(s.profit || 0);
            payments[s.payment_method] = (payments[s.payment_method] || 0) + parseFloat(s.total || 0);
        });

        return { 
            revenue, profit, 
            count: filtered.length, 
            payments: Object.entries(payments).map(([name, value]) => ({ name, value })) 
        };
    }, [sales, startDate, endDate]);

    const downloadCSV = (data, filename) => {
        if (!data || !data.length) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => 
            Object.values(row).map(val => `"${val?.toString().replace(/"/g, '""') || ''}"`).join(',')
        ).join('\n');
        
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownload = () => {
        let dataToExport = [];
        let filename = "report";

        if (tabValue === 0) {
            dataToExport = pulseData.payments.map(p => ({ 
                Payment_Method: p.name, 
                Amount: p.value 
            }));
            dataToExport.push({ Payment_Method: 'TOTAL REVENUE', Amount: pulseData.revenue });
            dataToExport.push({ Payment_Method: 'TOTAL PROFIT', Amount: pulseData.profit });
            dataToExport.push({ Payment_Method: 'SALES COUNT', Amount: pulseData.count });
            filename = "performance_pulse";
        } else if (tabValue === 1) {
            dataToExport = tires.map(t => ({ 
                Item: `${t.brand} ${t.size}`, 
                Stock: t.stock, 
                Cost: t.cost_price, 
                Total_Value: (t.stock * t.cost_price) 
            }));
            filename = "inventory_valuation";
        } else if (tabValue === 2) {
            dataToExport = filteredSales.map(s => ({ 
                Date: s.created_at, 
                Customer: s.customer_name, 
                Vehicle: s.vehicle_number, 
                Method: s.payment_method, 
                Total: s.total 
            }));
            filename = "sales_history";
        } else if (tabValue === 3) {
            dataToExport = auditLogs.map(l => ({ 
                Time: l.created_at, 
                User: l.profiles?.name || 'System', 
                Action: l.action, 
                Record: l.record_id, 
                Notes: l.notes 
            }));
            filename = "audit_trail";
        } else {
            setAlert({ open: true, message: "Download not available for this tab", severity: "info" });
            return;
        }
        downloadCSV(dataToExport, filename);
    };

    const handlePrint = () => {
        const tabNames = ["Performance Pulse", 'P&L Analytics', 'Inventory Valuation', 'Sales History', 'Audit Trail'];
        const currentTabTitle = tabNames[tabValue];
        const printContent = document.getElementById('report-content');
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>${currentTabTitle}</title>`);
        printWindow.document.write(`
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                h1 { color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 10px; }
                .meta { margin-bottom: 30px; font-size: 0.9rem; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #e0e0e0; padding: 12px; text-align:left; }
                th { background-color: #f5f5f5; font-weight: bold; }
                .card-container { display: flex; gap: 20px; margin-bottom: 30px; }
                .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; }
                .card-title { font-size: 0.8rem; text-transform: uppercase; color: #666; margin-bottom: 5px; }
                .card-value { font-size: 1.5rem; font-weight: bold; color: #1a237e; }
                @media print {
                    button { display: none; }
                }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<h1>${currentTabTitle}</h1>`);
        printWindow.document.write(`
            <div class="meta">
                <strong>Business:</strong> ${businessProfile?.name || 'TyreShops'}<br>
                <strong>Date Range:</strong> ${startDate} to ${endDate}<br>
                <strong>Generated:</strong> ${new Date().toLocaleString()}<br>
            </div>
        `);
        
        // Custom logic to convert MUI cards to simple printable cards
        if (tabValue === 0) {
            printWindow.document.write(`
                <div class="card-container">
                    <div class="card"><div class="card-title">Total Revenue</div><div class="card-value">${pulseData.revenue.toLocaleString()} ${currency}</div></div>
                    <div class="card"><div class="card-title">Total Profit</div><div class="card-value">${pulseData.profit.toLocaleString()} ${currency}</div></div>
                    <div class="card"><div class="card-title">Sales Count</div><div class="card-value">${pulseData.count}</div></div>
                </div>
            `);
        } else if (tabValue === 1) {
            printWindow.document.write(`
                <div class="card-container">
                    <div class="card"><div class="card-title">Total Revenue</div><div class="card-value">${pandLData.revenue.toLocaleString()} ${currency}</div></div>
                    <div class="card"><div class="card-title">Total COGS</div><div class="card-value">${pandLData.cogs.toLocaleString()} ${currency}</div></div>
                    <div class="card"><div class="card-title">Gross Profit</div><div class="card-value">${pandLData.grossProfit.toLocaleString()} ${currency}</div></div>
                </div>
            `);
        }

        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        // Wait for images/charts if any (though charts are SVG)
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    if (!isAdmin) return <Box sx={{ p: 5, textAlign: 'center' }}><Typography variant="h5" color="error">UNAUTHORIZED</Typography></Box>;

    return (
        <Box sx={{ p: isMobile ? 0 : 2 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>360 Reports</Typography>
                    <Typography variant="body1" color="text.secondary">Comprehensive business performance & audit trails</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" color="secondary" startIcon={<DownloadIcon />} onClick={handleDownload} sx={{ borderRadius: 3 }}>Export CSV</Button>
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ borderRadius: 3 }}>Print Page</Button>
                </Box>
            </Box>

            <Tabs 
                value={tabValue} 
                onChange={(_, v) => setTabValue(v)} 
                variant={isMobile ? "scrollable" : "standard"}
                sx={{ mb: 4, borderBottom: '1px solid rgba(0,0,0,0.05)' }}
            >
                <Tab icon={<PulseIcon />} iconPosition="start" label="Performance Pulse" />
                <Tab icon={<AnalyticsIcon />} iconPosition="start" label="P&L Analytics" />
                <Tab icon={<InventoryIcon />} iconPosition="start" label="Inventory Valuation" />
                <Tab icon={<HistoryIcon />} iconPosition="start" label="Sales History" />
                <Tab icon={<AuditIcon />} iconPosition="start" label="Audit Trail" />
            </Tabs>

            <Box id="report-content">
                {tabValue === 0 && (
                    <Box>
                        <Box sx={{ mb: 4, p: 3, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 4, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarIcon color="action" />
                                <Typography sx={{ fontWeight: 800 }}>Timeframe:</Typography>
                            </Box>
                            <TextField 
                                size="small" type="date" label="From" 
                                value={startDate} onChange={e => setStartDate(e.target.value)} 
                                InputLabelProps={{ shrink: true }} sx={{ width: 150 }}
                            />
                            <TextField 
                                size="small" type="date" label="To" 
                                value={endDate} onChange={e => setEndDate(e.target.value)} 
                                InputLabelProps={{ shrink: true }} sx={{ width: 150 }}
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" variant="outlined" onClick={() => {
                                    const d = new Date().toISOString().split('T')[0];
                                    setStartDate(d); setEndDate(d);
                                }} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Today</Button>
                                <Button size="small" variant="outlined" onClick={() => {
                                    const d = new Date(); d.setDate(d.getDate() - 1);
                                    const ds = d.toISOString().split('T')[0];
                                    setStartDate(ds); setEndDate(ds);
                                }} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Yesterday</Button>
                                <Button size="small" variant="outlined" onClick={() => {
                                    const d = new Date();
                                    setEndDate(d.toISOString().split('T')[0]);
                                    d.setDate(d.getDate() - 7);
                                    setStartDate(d.toISOString().split('T')[0]);
                                }} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Last 7 Days</Button>
                            </Box>
                        </Box>

                        <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Performance Breakdown</Typography>
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            {[
                                { label: 'Total Revenue', value: pulseData.revenue, color: 'success.main' },
                                { label: 'Total Profit', value: pulseData.profit, color: 'primary.main' },
                                { label: 'Sales Count', value: pulseData.count, color: 'secondary.main', isCount: true }
                            ].map((s, i) => (
                                <Grid item xs={12} md={4} key={i}>
                                    <Card variant="outlined" sx={{ borderRadius: 4, p: 1 }}>
                                        <CardContent>
                                            <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.6 }}>{s.label}</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900, color: s.color }}>
                                                {s.isCount ? s.value : s.value.toLocaleString()} {!s.isCount && currency}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Card sx={{ borderRadius: 4, p: 3, border: '1px solid rgba(0,0,0,0.05)' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 3 }}>Payment Method Split</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {pulseData.payments.map(p => (
                                            <Box key={p.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography sx={{ fontWeight: 700 }}>{p.name}</Typography>
                                                <Typography sx={{ fontWeight: 900 }}>{p.value.toLocaleString()} {currency}</Typography>
                                            </Box>
                                        ))}
                                        {pulseData.payments.length === 0 && <Typography color="text.secondary">No sales recorded for this period.</Typography>}
                                    </Box>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Card sx={{ borderRadius: 4, p: 3, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'primary.main', color: '#fff' }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>Pro-Tip</Typography>
                                    <Typography variant="body2">Analyzing performance across custom dates helps identify seasonal trends and the impact of promotional activities on your bottom line.</Typography>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {tabValue === 1 && (
                    <Box>
                        <Grid container spacing={3} sx={{ mb: 4 }}>
                            {[
                                { label: 'Revenue', value: pandLData.revenue, color: 'success.main' },
                                { label: 'COGS', value: pandLData.cogs, color: 'text.secondary' },
                                { label: 'Gross Profit', value: pandLData.grossProfit, color: 'primary.main' }
                            ].map((s, i) => (
                                <Grid item xs={12} md={4} key={i}>
                                    <Card sx={{ borderRadius: 4, bgcolor: i === 2 ? 'primary.main' : '#fff', color: i === 2 ? '#fff' : 'inherit' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.8 }}>{s.label}</Typography>
                                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{s.value.toLocaleString()} {currency}</Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                        
                        <Card sx={{ p: 4, borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)' }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, mb: 4 }}>Top Selling Products (Sales Velocity)</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={movingData.slice(0, 10)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis />
                                    <ChartTooltip />
                                    <Bar dataKey="qty" fill="#1a237e" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </Box>
                )}

                {tabValue === 1 && (
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
                                    <TableRow key={t.id}>
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

                {tabValue === 2 && (
                    <Box>
                        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                            <TextField 
                                size="small" placeholder="Search sales..." 
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                                sx={{ flexGrow: 1 }}
                            />
                            <TextField 
                                size="small" type="date" 
                                value={filterDate} onChange={e => setFilterDate(e.target.value)}
                            />
                        </Box>
                        <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                            <Table>
                                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>CUSTOMER</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>VEHICLE</TableCell>
                                        <TableCell sx={{ fontWeight: 900 }}>PAYMENT</TableCell>
                                        <TableCell sx={{ fontWeight: 900, textAlign: 'right' }}>TOTAL</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredSales.map(sale => (
                                        <TableRow key={sale.id}>
                                            <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>{sale.customer_name || 'Walk-in'}</TableCell>
                                            <TableCell>{sale.vehicle_number || '—'}</TableCell>
                                            <TableCell><Chip label={sale.payment_method} size="small" /></TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 900 }}>{parseFloat(sale.total || 0).toLocaleString()} {currency}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {tabValue === 3 && (
                    <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none' }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 900 }}>TIME</TableCell>
                                    <TableCell sx={{ fontWeight: 900 }}>USER</TableCell>
                                    <TableCell sx={{ fontWeight: 900 }}>ACTION</TableCell>
                                    <TableCell sx={{ fontWeight: 900 }}>AFFECTED RECORD</TableCell>
                                    <TableCell sx={{ fontWeight: 900 }}>NOTES</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {auditLogs.length === 0 && !loadingAudit && (
                                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No audit logs found.</TableCell></TableRow>
                                )}
                                {auditLogs.map((log, i) => (
                                    <TableRow key={i}>
                                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{log.profiles?.name || log.user_id?.slice(0,8) || 'System'}</TableCell>
                                        <TableCell><Chip label={log.action} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.7rem' }} /></TableCell>
                                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{log.record_id || '—'}</TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem', maxWidth: 400 }}>{log.notes}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            <Snackbar 
                open={alert.open} 
                autoHideDuration={4000} 
                onClose={() => setAlert({ ...alert, open: false })}
            >
                <Alert severity={alert.severity} sx={{ width: '100%', borderRadius: 3, fontWeight: 700 }}>
                    {alert.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ReportsHub;
