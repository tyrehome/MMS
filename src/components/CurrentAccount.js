import React, { useState, useEffect, useMemo } from "react";
import {
  Grid, Typography, TextField, Divider, IconButton, Dialog, DialogActions,
  DialogContent, DialogTitle, Chip, Box, Card, CardContent, TableContainer, Table, TableHead, TableRow, TableCell,
  TableBody, Menu, MenuItem, Tabs, Tab, FormControl, InputLabel, Select, Snackbar, Alert, Avatar,
  Button, Tooltip
} from "@mui/material";
import {
  Add as AddIcon, 
  MoreVert as MoreVertIcon, 
  Receipt as ReceiptIcon,
  AccountBalanceWallet as WalletIcon, 
  TrendingUp as TrendingUpIcon, 
  TrendingDown as TrendingDownIcon,
  PictureAsPdf as PictureAsPdfIcon,
  AccountBalance as BankIcon,
  History as HistoryIcon,
  Lock as LockIcon
} from "@mui/icons-material";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const CurrentAccount = ({ businessProfile, accountsList = [], invoicesList = [] }) => {
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState(accountsList);
  const [invoices, setInvoices] = useState(invoicesList);
  const [currentTab, setCurrentTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  const [accountDetails, setAccountDetails] = useState({ name: "", receivable: 0, payable: 0, category: 'Customer' });
  const [transactionDetails, setTransactionDetails] = useState({ type: "receivable", amount: 0, description: "", date: new Date().toISOString().split("T")[0] });

  const currency = businessProfile?.currency || 'LKR';

  useEffect(() => setAccounts(accountsList), [accountsList]);
  useEffect(() => setInvoices(invoicesList), [invoicesList]);

  const totals = useMemo(() => {
    const rec = accounts.reduce((s, a) => s + (parseFloat(a.receivable) || 0), 0);
    const pay = accounts.reduce((s, a) => s + (parseFloat(a.payable) || 0), 0);
    return { receivable: rec, payable: pay, net: rec - pay };
  }, [accounts]);

  const handleSaveAccount = async () => {
    if (!accountDetails.name || accountDetails.name.trim() === '') {
      setSnackbar({ open: true, message: "Account name is required.", severity: "error" });
      return;
    }
    try {
      // Note: 'category' excluded here — Supabase schema cache may not have refreshed yet.
      // It has a default value of 'Customer' in the DB.
      const data = { 
        name: accountDetails.name.trim(),
        phone: accountDetails.phone || '',
        email: accountDetails.email || '',
        receivable: 0,
        payable: 0,
        updated_at: new Date().toISOString()
      };
      let error;
      if (accountDetails.id) {
        ({ error } = await supabase.from("accounts").update(data).eq('id', accountDetails.id));
      } else {
        ({ error } = await supabase.from("accounts").insert([{ ...data, created_at: new Date().toISOString() }]));
      }
      if (error) throw error;
      // Refresh accounts list immediately
      const { data: freshAccounts } = await supabase.from('accounts').select('*');
      if (freshAccounts) setAccounts(freshAccounts);
      setOpenDialog(false);
      setSnackbar({ open: true, message: "Account created successfully!", severity: "success" });
    } catch (err) {
      console.error('Save account error:', err);
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: "error" });
    }
  };

  const handleSaveTransaction = async () => {
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) return;
    const updateData = {
      [transactionDetails.type]: (parseFloat(acc[transactionDetails.type]) || 0) + parseFloat(transactionDetails.amount),
      updated_at: new Date().toISOString()
    };
    await supabase.from("accounts").update(updateData).eq('id', selectedAccountId);
    setOpenTransactionDialog(false);
    setSnackbar({ open: true, message: "Transaction journaled", severity: "success" });
  };

  const handleDownloadInvoice = (inv) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text(`FINANCIAL RECORD: ${inv.number}`, 14, 20);
    doc.autoTable({ head: [["Entity", "Amount"]], body: [[inv.customer_name, `${inv.total} ${currency}`]], startY: 30 });
    doc.save(`FIN_${inv.number}.pdf`);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Finance & Ledger</Typography>
        <Typography variant="body1" color="text.secondary">Comprehensive financial control and liquidity management</Typography>
      </Box>

      <Tabs 
        value={currentTab} 
        onChange={(e, v) => setCurrentTab(v)} 
        sx={{ 
          mb: 4,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
          '& .MuiTab-root': { fontWeight: 800, fontSize: '0.95rem', textTransform: 'none' }
        }}
      >
        <Tab icon={<BankIcon />} iconPosition="start" label="Balance Overview" />
        <Tab icon={<HistoryIcon />} iconPosition="start" label="Entity Ledgers" />
        <Tab icon={<ReceiptIcon />} iconPosition="start" label="Billing Registry" />
      </Tabs>

      {currentTab === 0 && (
        <Grid container spacing={3}>
          {[
            { label: 'Total Receivables (Debtors)', value: totals.receivable, icon: <TrendingUpIcon />, color: 'success.main', bg: 'rgba(76, 175, 80, 0.05)' },
            { label: 'Total Payables (Creditors)', value: totals.payable, icon: <TrendingDownIcon />, color: 'error.main', bg: 'rgba(244, 67, 54, 0.05)' },
            { label: 'Net Business Position', value: totals.net, icon: <WalletIcon />, color: '#fff', bg: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)', dark: true }
          ].map((stat, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Card sx={{ borderRadius: 4, background: stat.bg, color: stat.dark ? '#fff' : 'inherit', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.8 }}>{stat.label}</Typography>
                    <Avatar sx={{ bgcolor: stat.dark ? 'rgba(255,255,255,0.1)' : stat.bg, color: stat.dark ? '#fff' : stat.color }}>{stat.icon}</Avatar>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 900 }}>{stat.value.toLocaleString()} <Typography component="span" variant="h6" sx={{ opacity: 0.6 }}>{currency}</Typography></Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {currentTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            {isAdmin ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setAccountDetails({ name: "", receivable: 0, payable: 0, category: 'Customer' }); setOpenDialog(true); }} sx={{ borderRadius: 3, fontWeight: 900 }}>OPEN NEW LEDGER</Button>
            ) : (
              <Tooltip title="Only administrators can create credit accounts">
                <span>
                  <Button variant="contained" startIcon={<LockIcon />} disabled sx={{ borderRadius: 3, fontWeight: 900 }}>OPEN NEW LEDGER</Button>
                </span>
              </Tooltip>
            )}
          </Box>
          <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(26, 35, 126, 0.03)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, py: 3 }}>ENTITY DESIGNATION</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>RECEIVABLE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>PAYABLE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>NET BALANCE</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.map(a => (
                    <TableRow key={a.id} hover>
                      <TableCell sx={{ fontWeight: 900 }}>{a.name}</TableCell>
                      <TableCell sx={{ color: 'success.main', fontWeight: 700 }}>{a.receivable.toLocaleString()} {currency}</TableCell>
                      <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>{a.payable.toLocaleString()} {currency}</TableCell>
                      <TableCell sx={{ fontWeight: 900, bgcolor: (a.receivable - a.payable) >= 0 ? 'rgba(76,175,80,0.05)' : 'rgba(244,67,54,0.05)' }}>
                        {(a.receivable - a.payable).toLocaleString()} {currency}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedAccountId(a.id); }}><MoreVertIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {currentTab === 2 && (
        <Box>
          <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(26, 35, 126, 0.03)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, py: 3 }}>REFERENCE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>TRANSACTION DATE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>ENTITY</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>TOTAL VALUE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>EXPORT</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id} hover>
                      <TableCell sx={{ fontWeight: 800 }}>{inv.number}</TableCell>
                      <TableCell>{inv.date}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{inv.customer_name}</TableCell>
                      <TableCell sx={{ fontWeight: 900 }}>{(inv.total + (inv.tax || 0)).toLocaleString()} {currency}</TableCell>
                      <TableCell><Chip label={inv.status} size="small" sx={{ fontWeight: 900, borderRadius: 2 }} color={inv.status === 'Paid' ? 'success' : 'warning'} /></TableCell>
                      <TableCell align="center">
                        <IconButton onClick={() => handleDownloadInvoice(inv)} color="primary"><PictureAsPdfIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* Dialogs and Menus remain largely similar but with refined styling */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>New Credit Account</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          <TextField
            label="Account / Customer Name *"
            fullWidth variant="outlined"
            value={accountDetails.name}
            onChange={e => setAccountDetails({ ...accountDetails, name: e.target.value })}
            placeholder="e.g. Alishan Transport Co."
            autoFocus
          />
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={accountDetails.category || 'Customer'}
              label="Category"
              onChange={e => setAccountDetails({ ...accountDetails, category: e.target.value })}
            >
              <MenuItem value="Customer">Customer</MenuItem>
              <MenuItem value="Supplier">Supplier</MenuItem>
              <MenuItem value="Corporate">Corporate</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField label="Phone" fullWidth variant="outlined" value={accountDetails.phone || ''} onChange={e => setAccountDetails({ ...accountDetails, phone: e.target.value })} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Email" fullWidth variant="outlined" value={accountDetails.email || ''} onChange={e => setAccountDetails({ ...accountDetails, email: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ borderRadius: 3 }}>Cancel</Button>
          <Button onClick={handleSaveAccount} variant="contained" sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}>SAVE ACCOUNT</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openTransactionDialog} onClose={() => setOpenTransactionDialog(false)} PaperProps={{ sx: { borderRadius: 4, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Manual Journal Entry</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Transaction Vector</InputLabel>
            <Select value={transactionDetails.type} label="Transaction Vector" onChange={(e) => setTransactionDetails({ ...transactionDetails, type: e.target.value })}>
                <MenuItem value="receivable">Add to Receivable (+)</MenuItem>
                <MenuItem value="payable">Add to Payable (+)</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Quantum / Amount" type="number" fullWidth variant="outlined" value={transactionDetails.amount} onChange={e => setTransactionDetails({ ...transactionDetails, amount: parseFloat(e.target.value) || 0 })} />
          <TextField label="Description / Memo" fullWidth variant="outlined" multiline rows={2} value={transactionDetails.description} onChange={e => setTransactionDetails({ ...transactionDetails, description: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenTransactionDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveTransaction} variant="contained" sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}>POST TO LEDGER</Button>
        </DialogActions>
      </Dialog>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {isAdmin && <MenuItem onClick={() => { setOpenTransactionDialog(true); setAnchorEl(null); }}>Post Manual Transaction</MenuItem>}
        <MenuItem onClick={() => { setAnchorEl(null); }}>View Statement</MenuItem>
        {isAdmin && <Divider />}
        {isAdmin && <MenuItem onClick={() => { setAnchorEl(null); }} sx={{ color: 'error.main' }}>Close Ledger</MenuItem>}
      </Menu>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 800 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CurrentAccount;
