import React, { useState } from 'react';
import {
    Box, Typography, Tabs, Tab, Card, CardContent, Grid, useMediaQuery
} from '@mui/material';
import {
    AccountBalanceWallet as WalletIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    People as PeopleIcon,
    LocalShipping as VendorIcon,
    Receipt as ReceiptIcon
} from '@mui/icons-material';
import CurrentAccount from './CurrentAccount';
import { useAuth } from './AuthContext';

const FinanceHub = ({ 
    accounts = [], 
    invoices = [], 
    suppliers = [], 
    businessProfile, 
    recordAudit 
}) => {
    const { isAdmin } = useAuth();
    const isMobile = useMediaQuery('(max-width:600px)');
    const [tabValue, setTabValue] = useState(0);
    const currency = businessProfile?.currency || 'LKR';

    const totals = {
        receivable: accounts.reduce((s, a) => s + (parseFloat(a.receivable) || 0), 0),
        payable: suppliers.reduce((s, a) => s + (parseFloat(a.payable_balance || 0)), 0),
    };

    if (!isAdmin) {
        return (
            <Box sx={{ p: 5, textAlign: 'center' }}>
                <Typography variant="h5" color="error" sx={{ fontWeight: 900 }}>ACCESS RESTRICTED</Typography>
                <Typography variant="body1">Financial records are only accessible to administrators.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: isMobile ? 0 : 2 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Finance & Ledger Hub</Typography>
                <Typography variant="body1" color="text.secondary">Manage accounts, receivables, and vendor payables</Typography>
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    { label: 'TOTAL RECEIVABLES', value: totals.receivable, color: 'success.main', icon: <TrendingUpIcon /> },
                    { label: 'TOTAL PAYABLES', value: totals.payable, color: 'error.main', icon: <TrendingDownIcon /> },
                    { label: 'NET CASH POSITION', value: totals.receivable - totals.payable, color: 'primary.main', icon: <WalletIcon /> }
                ].map((stat, i) => (
                    <Grid item xs={12} md={4} key={i}>
                        <Card sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.7 }}>{stat.label}</Typography>
                                    <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                                </Box>
                                <Typography variant="h5" sx={{ fontWeight: 900, color: stat.color }}>
                                    {stat.value.toLocaleString()} <Typography component="span" variant="body2" sx={{ opacity: 0.6 }}>{currency}</Typography>
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Tabs 
                value={tabValue} 
                onChange={(_, v) => setTabValue(v)}
                variant={isMobile ? "scrollable" : "standard"}
                sx={{ mb: 4, borderBottom: '1px solid rgba(0,0,0,0.05)' }}
            >
                <Tab icon={<PeopleIcon />} iconPosition="start" label="Customer Ledgers" />
                <Tab icon={<VendorIcon />} iconPosition="start" label="Vendor Payables" />
                <Tab icon={<ReceiptIcon />} iconPosition="start" label="Billing Registry" />
            </Tabs>

            {tabValue === 0 && (
                <CurrentAccount 
                    businessProfile={businessProfile}
                    accountsList={accounts}
                    invoicesList={invoices}
                    recordAudit={recordAudit}
                    defaultTab={1} // Direct to Ledgers
                />
            )}

            {tabValue === 1 && (
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, mb: 3 }}>Vendor Financial Status</Typography>
                    <Grid container spacing={2}>
                        {suppliers.map(sup => (
                            <Grid item xs={12} md={6} key={sup.id}>
                                <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{sup.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">{sup.phone || sup.email || 'No contact'}</Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>OUTSTANDING</Typography>
                                            <Typography sx={{ fontWeight: 900, color: 'error.main' }}>
                                                {Number(sup.payable_balance || 0).toLocaleString()} {currency}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {tabValue === 2 && (
                <CurrentAccount 
                    businessProfile={businessProfile}
                    accountsList={accounts}
                    invoicesList={invoices}
                    recordAudit={recordAudit}
                    defaultTab={2} // Direct to Billing
                />
            )}
        </Box>
    );
};

export default FinanceHub;
