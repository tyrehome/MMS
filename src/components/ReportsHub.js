import React, { useState, useMemo, useEffect } from 'react';
import {
    Typography, Box, Tab, Tabs, Grid, Card, CardContent, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, TextField, Button, useMediaQuery, LinearProgress,
    Collapse, IconButton, Divider
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
    FlashOn as PulseIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import { Snackbar, Alert } from '@mui/material';

const ReportsHub = ({ complaints = [], tires = [], sales = [], accounts = [], invoices = [], parts = [], businessProfile, recordAudit }) => {
    const { isAdmin } = useAuth();
    const isMobile = useMediaQuery('(max-width:768px)');
    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
    const [profitExpanded, setProfitExpanded] = useState(false);

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
            setAlert({ open: true, message: 'Failed to load audit logs: ' + error.message, severity: 'error' });
        } finally {
            setLoadingAudit(false);
        }
    };

    useEffect(() => {
        if (tabValue === 4) fetchAuditLogs();
    }, [tabValue]);

    // Analytics Logic
    const pandLData = useMemo(() => {
        let revenue = 0; let cogs = 0;
        const filteredSales = sales.filter(s => {
            const saleDate = (s.created_at || '').split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        });

        const filteredComplaints = complaints.filter(c => {
            const cDate = (c.created_at || '').split('T')[0];
            return cDate >= startDate && cDate <= endDate;
        });

        filteredSales.forEach(sale => {
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
        const totalClaimLoss = filteredComplaints.reduce((sum, c) => sum + Number(c.shop_contribution || 0), 0);
        return { revenue, cogs, grossProfit: revenue - cogs - totalClaimLoss, totalClaimLoss, filteredComplaints };
    }, [sales, tires, parts, complaints, startDate, endDate]);

    // Profit Breakdown by stream (Tires / Parts / Services) — filtered by date range
    const profitBreakdown = useMemo(() => {
        const streams = {
            tires:    { label: 'Tire Sales',             revenue: 0, cost: 0, icon: '🛞', color: '#1a237e' },
            parts:    { label: 'Parts Sales',             revenue: 0, cost: 0, icon: '🔧', color: '#6a1b9a' },
            services: { label: 'Workspace / Services',   revenue: 0, cost: 0, icon: '⚙️', color: '#00695c' },
        };
        const saleRows = [];

        // Filter to selected date range (same logic as pulseData)
        const filtered = sales.filter(s => {
            const saleDate = (s.created_at || '').split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        });

        filtered.forEach(sale => {
            let saleProfit = 0;
            const breakdown = { tires: 0, parts: 0, services: 0 };
            (sale.sale_items || []).forEach(item => {
                const qty  = parseInt(item.quantity || 0);
                const sell = parseFloat(item.price || 0) * qty;
                if (item.tire_id) {
                    const tire = tires.find(t => t.id === item.tire_id);
                    const cost = parseFloat(tire?.cost_price || 0) * qty;
                    streams.tires.revenue += sell;
                    streams.tires.cost    += cost;
                    breakdown.tires += sell - cost;
                    saleProfit += sell - cost;
                } else if (item.part_id) {
                    const part = (parts || []).find(p => p.id === item.part_id);
                    const cost = parseFloat(part?.cost_price || 0) * qty;
                    streams.parts.revenue += sell;
                    streams.parts.cost    += cost;
                    breakdown.parts += sell - cost;
                    saleProfit += sell - cost;
                } else {
                    // Services: pure revenue = pure profit (no purchase cost)
                    streams.services.revenue += sell;
                    breakdown.services += sell;
                    saleProfit += sell;
                }
            });
            if ((sale.sale_items || []).length > 0) {
                saleRows.push({
                    id: sale.id,
                    date: sale.created_at,
                    customer: sale.customer_name || 'Walk-in',
                    total: parseFloat(sale.total || 0),
                    profit: saleProfit,
                    tireProfit: breakdown.tires,
                    partsProfit: breakdown.parts,
                    serviceProfit: breakdown.services,
                });
            }
        });

        const tireProfit    = streams.tires.revenue - streams.tires.cost;
        const partsProfit   = streams.parts.revenue - streams.parts.cost;
        const serviceProfit = streams.services.revenue; // no COGS for services

        return {
            streams: Object.values(streams).map(s => ({ ...s, profit: s.revenue - s.cost })),
            totalProfit: tireProfit + partsProfit + serviceProfit,
            saleRows: saleRows.sort((a, b) => new Date(b.date) - new Date(a.date)),
        };
    }, [sales, tires, parts, startDate, endDate]);

    const movingData = useMemo(() => {
        const counts = {};
        const filtered = sales.filter(s => {
            const saleDate = (s.created_at || '').split('T')[0];
            return saleDate >= startDate && saleDate <= endDate;
        });

        filtered.forEach(sale => {
            (sale.sale_items || []).forEach(item => {
                if (item.tire_id) {
                    const tire = tires.find(t => t.id === item.tire_id);
                    if (tire) {
                        const key = `${tire.brand} ${tire.size}`;
                        counts[key] = (counts[key] || 0) + parseInt(item.quantity || 0);
                    }
                } else if (item.part_id) {
                    const part = (parts || []).find(p => p.id === item.part_id);
                    if (part) {
                        const key = part.name;
                        counts[key] = (counts[key] || 0) + parseInt(item.quantity || 0);
                    }
                }
            });
        });
        return Object.entries(counts).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
    }, [sales, tires, parts, startDate, endDate]);

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
            dataToExport = [{ Metric: 'Revenue', Value: pandLData.revenue }, { Metric: 'COGS', Value: pandLData.cogs }, { Metric: 'Gross Profit', Value: pandLData.grossProfit }];
            filename = "pl_analytics";
        } else if (tabValue === 2) {
            dataToExport = tires.map(t => ({ 
                Item: `${t.brand} ${t.size}`, 
                Stock: t.stock, 
                Cost: t.cost_price, 
                Total_Value: (t.stock * t.cost_price) 
            }));
            filename = "inventory_valuation";
        } else if (tabValue === 3) {
            dataToExport = filteredSales.map(s => ({ 
                Date: s.created_at, 
                Customer: s.customer_name, 
                Vehicle: s.vehicle_number, 
                Method: s.payment_method, 
                Total: s.total 
            }));
            filename = "sales_history";
        } else if (tabValue === 4) {
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
                svg { width: 24px !important; height: 24px !important; max-width: 24px !important; max-height: 24px !important; display: inline-block !important; vertical-align: middle !important; }
                @media print {
                    button { display: none !important; }
                    svg { width: 24px !important; height: 24px !important; max-width: 24px !important; max-height: 24px !important; }
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
            {/* ── Page Header ── */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                <Box>
                    <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ fontWeight: 900, color: 'primary.main', mb: 0.3 }}>360° Reports</Typography>
                    {!isMobile && <Typography variant="body2" color="text.secondary">Comprehensive business performance & audit trails</Typography>}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    <Button variant="outlined" color="secondary" startIcon={<DownloadIcon />} onClick={handleDownload}
                        size={isMobile ? 'small' : 'medium'}
                        sx={{ borderRadius: 3, minWidth: isMobile ? 0 : undefined, px: isMobile ? 1.5 : 2 }}>
                        {isMobile ? '' : 'Export CSV'}{isMobile && <DownloadIcon />}
                    </Button>
                    <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}
                        size={isMobile ? 'small' : 'medium'}
                        sx={{ borderRadius: 3, minWidth: isMobile ? 0 : undefined, px: isMobile ? 1.5 : 2 }}>
                        {isMobile ? '' : 'Print'}{isMobile && <PrintIcon />}
                    </Button>
                </Box>
            </Box>

            <Tabs
                value={tabValue}
                onChange={(_, v) => setTabValue(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ mb: 3, borderBottom: '1px solid rgba(0,0,0,0.07)',
                    '& .MuiTab-root': { minWidth: isMobile ? 80 : 140, fontSize: isMobile ? '0.7rem' : '0.875rem', px: isMobile ? 1 : 2 }
                }}
            >
                <Tab icon={<PulseIcon />} iconPosition="start" label={isMobile ? 'Pulse' : 'Performance Pulse'} />
                <Tab icon={<AnalyticsIcon />} iconPosition="start" label={isMobile ? 'P&L' : 'P&L Analytics'} />
                <Tab icon={<InventoryIcon />} iconPosition="start" label={isMobile ? 'Stock' : 'Inventory'} />
                <Tab icon={<HistoryIcon />} iconPosition="start" label={isMobile ? 'Sales' : 'Sales History'} />
                <Tab icon={<AuditIcon />} iconPosition="start" label={isMobile ? 'Audit' : 'Audit Trail'} />
            </Tabs>

            <Box id="report-content">
                {/* ── Global Period Filter Bar ── */}
                <Box sx={{ mb: 3, p: isMobile ? 2 : 3, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 3, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon color="action" fontSize="small" />
                        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Period:</Typography>
                    </Box>
                    <TextField size="small" type="date" label="From" value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={{ width: isMobile ? '100%' : 145 }} />
                    <TextField size="small" type="date" label="To" value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }} sx={{ width: isMobile ? '100%' : 145 }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {[['Today', 0], ['Yesterday', 1], ['7 Days', 7], ['30 Days', 30]].map(([lbl, days]) => (
                            <Button key={lbl} size="small" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                                onClick={() => {
                                    const end = new Date(); const start = new Date();
                                    start.setDate(start.getDate() - days);
                                    setEndDate(end.toISOString().split('T')[0]);
                                    setStartDate(start.toISOString().split('T')[0]);
                                }}>{lbl}</Button>
                        ))}
                    </Box>
                </Box>
                {tabValue === 0 && (
                    <Box>

                        {/* ── KPI Cards ── */}
                        <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: 3 }}>
                            {[
                                { label: 'Total Revenue', value: pulseData.revenue, color: '#2e7d32', bg: '#f1f8e9' },
                                { label: 'Net Profit',  value: pulseData.profit - pandLData.totalClaimLoss,  color: '#1a237e', bg: '#e8eaf6' },
                                { label: 'Warranty Loss',   value: pandLData.totalClaimLoss,   color: '#d32f2f', bg: '#ffebee' },
                            ].map((s, i) => (
                                <Grid item xs={12} sm={4} key={i}>
                                    <Card sx={{ borderRadius: 3, bgcolor: s.bg, border: `1px solid ${s.color}22`, p: isMobile ? 2 : 1.5, height: '100%' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: s.color, opacity: 0.8, display: 'block', textTransform: 'uppercase', fontSize: isMobile ? '0.55rem' : '0.7rem' }}>{s.label}</Typography>
                                        <Typography sx={{ fontWeight: 900, color: s.color, fontSize: isMobile ? '1.1rem' : '1.6rem', lineHeight: 1.2, mt: 0.5 }}>
                                            {s.value.toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: s.color, opacity: 0.7, fontWeight: 700 }}>{currency}</Typography>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        {/* ── Total Profit Breakdown Card ── */}
                        <Card sx={{ borderRadius: 3, border: '2px solid #1a237e22', mb: 3, overflow: 'hidden' }}>
                            <Box sx={{ p: isMobile ? 2 : 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', color: '#fff' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <TrendingUpIcon />
                                    <Box>
                                        <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700, display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>Total Profit Breakdown</Typography>
                                        <Typography sx={{ fontWeight: 900, fontSize: isMobile ? '1.3rem' : '1.8rem', lineHeight: 1 }}>
                                            {profitBreakdown.totalProfit.toLocaleString()} <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{currency}</span>
                                        </Typography>
                                    </Box>
                                </Box>
                                <IconButton onClick={() => setProfitExpanded(v => !v)} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}>
                                    {profitExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                            </Box>

                            {/* ── 3 Stream Cards ── */}
                            <Box sx={{ p: isMobile ? 1.5 : 2.5 }}>
                                <Grid container spacing={isMobile ? 1 : 2}>
                                    {profitBreakdown.streams.map((stream) => {
                                        const pct = profitBreakdown.totalProfit > 0 ? (stream.profit / profitBreakdown.totalProfit * 100) : 0;
                                        return (
                                            <Grid item xs={12} sm={4} key={stream.label}>
                                                <Box sx={{ p: isMobile ? 1.5 : 2, borderRadius: 2.5, border: `1.5px solid ${stream.color}33`, bgcolor: stream.color + '0d' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                        <Typography sx={{ fontSize: isMobile ? '1rem' : '1.3rem' }}>{stream.icon}</Typography>
                                                        <Chip label={`${pct.toFixed(1)}%`} size="small" sx={{ fontWeight: 900, height: 20, fontSize: '0.65rem', bgcolor: stream.color, color: '#fff' }} />
                                                    </Box>
                                                    <Typography sx={{ fontWeight: 800, fontSize: isMobile ? '0.65rem' : '0.75rem', color: stream.color, textTransform: 'uppercase', mb: 0.3 }}>{stream.label}</Typography>
                                                    <Typography sx={{ fontWeight: 900, color: stream.color, fontSize: isMobile ? '1rem' : '1.25rem' }}>{stream.profit.toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{currency}</span></Typography>
                                                    <Divider sx={{ my: 1 }} />
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Typography variant="caption" color="text.secondary">Revenue</Typography>
                                                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{stream.revenue.toLocaleString()}</Typography>
                                                    </Box>
                                                    {stream.label !== 'Workspace / Services' && (
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="caption" color="text.secondary">Cost (COGS)</Typography>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#c62828' }}>{stream.cost.toLocaleString()}</Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Box>

                            {/* ── Expandable Per-Sale Table ── */}
                            <Collapse in={profitExpanded}>
                                <Divider />
                                <Box sx={{ p: isMobile ? 1.5 : 2.5 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5 }}>Per-Sale Profit Details</Typography>
                                    <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                        <Table size="small" sx={{ minWidth: isMobile ? 500 : 'auto' }}>
                                            <TableHead>
                                                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}>
                                                    {['Date','Customer','Total','🛞 Tires','🔧 Parts','⚙️ Services','Net Profit'].map(h => (
                                                        <TableCell key={h} sx={{ fontWeight: 900, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{h}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {profitBreakdown.saleRows.map((row) => (
                                                    <TableRow key={row.id} hover>
                                                        <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{row.date ? new Date(row.date).toLocaleDateString() : 'N/A'}</TableCell>
                                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{row.customer}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.total.toLocaleString()}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', color: '#1a237e', fontWeight: 700 }}>{row.tireProfit.toLocaleString()}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', color: '#6a1b9a', fontWeight: 700 }}>{row.partsProfit.toLocaleString()}</TableCell>
                                                        <TableCell sx={{ fontSize: '0.75rem', color: '#00695c', fontWeight: 700 }}>{row.serviceProfit.toLocaleString()}</TableCell>
                                                        <TableCell sx={{ fontWeight: 900, fontSize: '0.8rem', color: row.profit >= 0 ? '#2e7d32' : '#c62828' }}>{row.profit.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {profitBreakdown.saleRows.length === 0 && (
                                                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>No sales data found.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </Box>
                            </Collapse>
                        </Card>

                        {/* ── Warranty & Claims Audit ── */}
                        <Card sx={{ borderRadius: 3, p: isMobile ? 2 : 3, border: '1px solid rgba(0,0,0,0.06)', mb: 3, bgcolor: '#fafafa' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Claims & Warranty Audit</Typography>
                                <Chip label={`${pandLData.filteredComplaints.length} in period`} size="small" sx={{ fontWeight: 900 }} />
                            </Box>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>PENDING RESOLUTION</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>
                                            {pandLData.filteredComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>PERIOD SHOP LOSS</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 900, color: 'error.main' }}>
                                            {pandLData.totalClaimLoss.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Card>

                        {/* ── Payment Split ── */}
                        <Card sx={{ borderRadius: 3, p: isMobile ? 2 : 3, border: '1px solid rgba(0,0,0,0.06)' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 2 }}>Payment Method Split</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {pulseData.payments.map(p => (
                                    <Box key={p.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</Typography>
                                        <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{p.value.toLocaleString()} {currency}</Typography>
                                    </Box>
                                ))}
                                {pulseData.payments.length === 0 && <Typography color="text.secondary" fontSize="0.85rem">No sales in this period.</Typography>}
                            </Box>
                        </Card>
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

                {tabValue === 2 && (
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

                {tabValue === 3 && (
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

                {tabValue === 4 && (
                    <Box>
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                                size="small" 
                                startIcon={<RefreshIcon />} 
                                onClick={fetchAuditLogs} 
                                disabled={loadingAudit}
                                sx={{ borderRadius: 2, fontWeight: 700 }}
                            >
                                {loadingAudit ? 'Syncing...' : 'Refresh Logs'}
                            </Button>
                        </Box>
                        {loadingAudit && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}
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
                    </Box>
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
