import React, { useState, useEffect, useMemo } from "react";
import {
  Grid, Typography, TextField, Divider, IconButton, Dialog, DialogActions,
  DialogContent, DialogTitle, Chip, Box, Card, CardContent, TableContainer, Table, TableHead, TableRow, TableCell,
  TableBody, Menu, MenuItem, Tabs, Tab, FormControl, InputLabel, Select, Snackbar, Alert, Avatar,
  Button, Tooltip, useMediaQuery
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
  Lock as LockIcon,
  Delete as DeleteIcon
} from "@mui/icons-material";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const CurrentAccount = ({ businessProfile, accountsList = [], invoicesList = [], recordAudit, defaultTab = 0 }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const { isAdmin } = useAuth();
  const [accounts, setAccounts] = useState(accountsList);
  const [invoices, setInvoices] = useState(invoicesList);
  const [currentTab, setCurrentTab] = useState(defaultTab);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  
  const [accountDetails, setAccountDetails] = useState({ name: "", receivable: 0, payable: 0, category: 'Customer' });
  const [transactionDetails, setTransactionDetails] = useState({ type: "payment_received", amount: 0, description: "", date: new Date().toISOString().split("T")[0] });
  const [openStatement, setOpenStatement] = useState(false);
  const [selectedAccountForStatement, setSelectedAccountForStatement] = useState(null);

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
      if (recordAudit) {
        recordAudit(accountDetails.id ? 'Update Ledger' : 'Open New Ledger', { 
          name: data.name, 
          phone: data.phone,
          initial_balance: 0 
        }, 'accounts');
      }
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
    if (!acc || !transactionDetails.amount) return;
    
    let updateData = { updated_at: new Date().toISOString() };
    let typeLabel = "";
    
    // Logic for different transaction vectors
    if (transactionDetails.type === 'payment_received') {
      updateData.receivable = Math.max(0, (parseFloat(acc.receivable) || 0) - parseFloat(transactionDetails.amount));
      typeLabel = "Payment Received";
    } else if (transactionDetails.type === 'receivable_add') {
      updateData.receivable = (parseFloat(acc.receivable) || 0) + parseFloat(transactionDetails.amount);
      typeLabel = "Credit Charge";
    } else if (transactionDetails.type === 'payment_made') {
      updateData.payable = Math.max(0, (parseFloat(acc.payable) || 0) - parseFloat(transactionDetails.amount));
      typeLabel = "Payment Made";
    } else if (transactionDetails.type === 'payable_add') {
      updateData.payable = (parseFloat(acc.payable) || 0) + parseFloat(transactionDetails.amount);
      typeLabel = "Credit Purchase";
    }

    const transactionEntry = {
      date: transactionDetails.date,
      type: typeLabel,
      amount: parseFloat(transactionDetails.amount),
      description: transactionDetails.description || 'Manual Entry',
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };

    const newTransactions = [...(acc.transactions || []), transactionEntry];
    updateData.transactions = newTransactions;

    try {
      const { error } = await supabase.from("accounts").update(updateData).eq('id', selectedAccountId);
      if (error) throw error;
      
      if (recordAudit) {
        recordAudit(typeLabel, {
          account: acc.name,
          amount: transactionDetails.amount,
          description: transactionDetails.description,
          new_balance: updateData.receivable ?? updateData.payable
        }, 'accounts');
      }

      setOpenTransactionDialog(false);
      setSnackbar({ open: true, message: "Ledger updated successfully", severity: "success" });
      
      // Local refresh
      const { data: freshAccounts } = await supabase.from('accounts').select('*');
      if (freshAccounts) setAccounts(freshAccounts);
    } catch (err) {
      console.error('Transaction error:', err);
      setSnackbar({ open: true, message: "Failed to post transaction", severity: "error" });
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm("Are you sure you want to permanently close/delete this ledger? All history will be lost.")) return;
    try {
      const { error } = await supabase.from("accounts").delete().eq('id', id);
      if (error) throw error;
      setAccounts(accounts.filter(a => a.id !== id));
      setSnackbar({ open: true, message: "Ledger closed and deleted successfully", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: "error" });
    }
  };

  const handleDeleteTransaction = async (accId, txId) => {
    if (!window.confirm("Delete this transaction? The balance will be reverted.")) return;
    
    try {
      const acc = accounts.find(a => a.id === accId);
      if (!acc) return;

      const tx = acc.transactions.find(t => t.id === txId);
      if (!tx) return;

      const newTransactions = acc.transactions.filter(t => t.id !== txId);
      
      // Re-calculate balances
      let newReceivable = 0;
      let newPayable = 0;
      
      newTransactions.forEach(t => {
        if (t.type === 'Payment Received') {
          newReceivable -= t.amount;
        } else if (t.type === 'Credit Charge') {
          newReceivable += t.amount;
        } else if (t.type === 'Payment Made') {
          newPayable -= t.amount;
        } else if (t.type === 'Credit Purchase') {
          newPayable += t.amount;
        }
      });

      const { error } = await supabase.from("accounts").update({
        transactions: newTransactions,
        receivable: Math.max(0, newReceivable),
        payable: Math.max(0, newPayable)
      }).eq('id', accId);

      if (error) throw error;
      
      // Refresh local state
      const { data: freshAccounts } = await supabase.from('accounts').select('*');
      if (freshAccounts) setAccounts(freshAccounts);
      
      // If statement is open, update the selected account
      if (selectedAccountForStatement?.id === accId) {
        setSelectedAccountForStatement(freshAccounts.find(a => a.id === accId));
      }

      setSnackbar({ open: true, message: "Transaction deleted and balance reverted", severity: "success" });
    } catch (err) {
      setSnackbar({ open: true, message: `Error: ${err.message}`, severity: "error" });
    }
  };

  const handleOpenStatement = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      setSelectedAccountForStatement(acc);
      setOpenStatement(true);
    }
  };

  const downloadStatement = (acc) => {
    if (!acc) return;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.text(`STATEMENT OF ACCOUNT: ${acc.name}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Current Receivable: ${acc.receivable} ${currency}`, 14, 30);
    doc.text(`Current Payable: ${acc.payable} ${currency}`, 14, 35);
    
    const tableData = (acc.transactions || []).map(t => [t.date, t.type, t.description, t.amount.toLocaleString()]);
    doc.autoTable({
      head: [["Date", "Type", "Description", "Amount"]],
      body: tableData,
      startY: 45
    });
    doc.save(`Statement_${acc.name}_${new Date().toISOString().split('T')[0]}.pdf`);
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
        variant={isMobile ? "scrollable" : "standard"}
        scrollButtons={isMobile ? "auto" : false}
        sx={{ 
          mb: 4,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
          '& .MuiTab-root': { fontWeight: 800, fontSize: isMobile ? '0.85rem' : '0.95rem', textTransform: 'none' }
        }}
      >
        <Tab icon={<BankIcon />} iconPosition="start" label={isMobile ? "Overview" : "Balance Overview"} />
        <Tab icon={<HistoryIcon />} iconPosition="start" label={isMobile ? "Ledgers" : "Entity Ledgers"} />
        <Tab icon={<ReceiptIcon />} iconPosition="start" label={isMobile ? "Billing" : "Billing Registry"} />
      </Tabs>

      {currentTab === 0 && (
        <Grid container spacing={isMobile ? 2 : 3}>
          {[
            { label: 'RECEIVABLES', value: totals.receivable, icon: <TrendingUpIcon />, color: 'success.main', bg: 'rgba(76, 175, 80, 0.05)' },
            { label: 'PAYABLES', value: totals.payable, icon: <TrendingDownIcon />, color: 'error.main', bg: 'rgba(244, 67, 54, 0.05)' },
            { label: 'NET POSITION', value: totals.net, icon: <WalletIcon />, color: '#fff', bg: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)', dark: true }
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Card sx={{ borderRadius: 4, background: stat.bg, color: stat.dark ? '#fff' : 'inherit', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <CardContent sx={{ p: isMobile ? 2.5 : 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: isMobile ? 1 : 1.5 }}>
                    <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.8, fontSize: '0.6rem', letterSpacing: 1 }}>{stat.label}</Typography>
                    <Avatar sx={{ bgcolor: stat.dark ? 'rgba(255,255,255,0.1)' : stat.bg, color: stat.dark ? '#fff' : stat.color, width: 28, height: 28 }}>{React.cloneElement(stat.icon, { sx: { fontSize: 16 } })}</Avatar>
                  </Box>
                  <Typography variant={isMobile ? "h5" : "h3"} sx={{ fontWeight: 900 }}>
                    {stat.value.toLocaleString()} 
                    <Typography component="span" variant={isMobile ? "body2" : "h6"} sx={{ opacity: 0.6, fontWeight: 700, ml: 1 }}>{currency}</Typography>
                  </Typography>
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
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {accounts.map(a => (
                <Card key={a.id} variant="outlined" sx={{ borderRadius: 3, p: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.95rem' }}>{a.name}</Typography>
                    <IconButton onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedAccountId(a.id); }} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', display: 'block', letterSpacing: 0.5 }}>RECEIVABLE</Typography>
                      <Typography sx={{ fontWeight: 800, color: 'success.main', fontSize: '0.9rem' }}>{a.receivable.toLocaleString()} <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem' }}>{currency}</Typography></Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary', display: 'block', letterSpacing: 0.5 }}>PAYABLE</Typography>
                      <Typography sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.9rem' }}>{a.payable.toLocaleString()} <Typography component="span" variant="caption" sx={{ fontSize: '0.6rem' }}>{currency}</Typography></Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ mt: 1, p: 1.2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: (a.receivable - a.payable) >= 0 ? 'rgba(76,175,80,0.08)' : 'rgba(244,67,54,0.08)' }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 1 }}>NET POSITION</Typography>
                        <Typography sx={{ fontWeight: 900, color: (a.receivable - a.payable) >= 0 ? 'success.dark' : 'error.dark' }}>{(a.receivable - a.payable).toLocaleString()} {currency}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Box>
          ) : (
            <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <TableContainer sx={{ overflowX: 'auto' }}>
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
          )}
        </Box>
      )}

      {currentTab === 2 && (
        <Box>
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {invoices.map(inv => (
                <Card key={inv.id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>{inv.number}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>{inv.date}</Typography>
                    </Box>
                    <Chip label={inv.status} size="small" sx={{ fontWeight: 900, height: 20 }} color={inv.status === 'Paid' ? 'success' : 'warning'} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>{inv.customer_name}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{(inv.total + (inv.tax || 0)).toLocaleString()} {currency}</Typography>
                    <IconButton onClick={() => handleDownloadInvoice(inv)} color="primary" size="small" sx={{ bgcolor: 'rgba(26,35,126,0.05)' }}>
                      <PictureAsPdfIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>
              ))}
            </Box>
          ) : (
            <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <TableContainer sx={{ overflowX: 'auto' }}>
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
          )}
        </Box>
      )}

      {/* Dialogs and Menus remain largely similar but with refined styling */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth 
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1, borderBottom: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>New Credit Account</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: isMobile ? 3 : 2 }}>
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

      <Dialog 
        open={openTransactionDialog} 
        onClose={() => setOpenTransactionDialog(false)} 
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, p: isMobile ? 1 : 2, minWidth: isMobile ? '100%' : 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, borderBottom: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>Journal Entry: {accounts.find(a => a.id === selectedAccountId)?.name}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: isMobile ? 3 : 2 }}>
          <FormControl fullWidth>
            <InputLabel>Transaction Type</InputLabel>
            <Select 
              value={transactionDetails.type} 
              label="Transaction Type" 
              onChange={(e) => setTransactionDetails({ ...transactionDetails, type: e.target.value })}
            >
                <MenuItem value="payment_received">Payment Received (Reduce Receivable)</MenuItem>
                <MenuItem value="receivable_add">Additional Credit (Increase Receivable)</MenuItem>
                <Divider />
                <MenuItem value="payment_made">Payment Made (Reduce Payable)</MenuItem>
                <MenuItem value="payable_add">Credit Purchase (Increase Payable)</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Transaction Date" type="date" fullWidth value={transactionDetails.date} onChange={e => setTransactionDetails({ ...transactionDetails, date: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Amount" type="number" fullWidth variant="outlined" value={transactionDetails.amount} onChange={e => setTransactionDetails({ ...transactionDetails, amount: e.target.value })} />
          <TextField label="Notes / Memo" fullWidth variant="outlined" multiline rows={2} value={transactionDetails.description} onChange={e => setTransactionDetails({ ...transactionDetails, description: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenTransactionDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveTransaction} variant="contained" sx={{ borderRadius: 3, fontWeight: 900, px: 4 }}>POST TO LEDGER</Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={openStatement} 
        onClose={() => setOpenStatement(false)} 
        maxWidth="md" 
        fullWidth 
        fullScreen={isMobile}
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isMobile ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
          Account Statement: {selectedAccountForStatement?.name}
          {!isMobile && <Button startIcon={<PictureAsPdfIcon />} onClick={() => downloadStatement(selectedAccountForStatement)} size="small">Export PDF</Button>}
          {isMobile && <IconButton onClick={() => downloadStatement(selectedAccountForStatement)} color="primary"><PictureAsPdfIcon /></IconButton>}
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 1 : 3 }}>
          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              {(!selectedAccountForStatement?.transactions || selectedAccountForStatement.transactions.length === 0) ? (
                <Box sx={{ py: 6, textAlign: 'center', opacity: 0.6 }}>No transaction history found</Box>
              ) : (
                [...selectedAccountForStatement.transactions].reverse().map((t, i) => (
                  <Card key={i} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>{t.date}</Typography>
                        <Chip label={t.type} size="small" variant="outlined" sx={{ fontWeight: 800, height: 20, mt: 0.5 }} />
                      </Box>
                      <IconButton size="small" color="error" onClick={() => handleDeleteTransaction(selectedAccountForStatement.id, t.id)} sx={{ bgcolor: 'rgba(244,67,54,0.05)' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>{t.description || 'No description'}</Typography>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>AMOUNT</Typography>
                      <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{t.amount?.toLocaleString()} {currency}</Typography>
                    </Box>
                  </Card>
                ))
              )}
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>TYPE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>DESCRIPTION</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>AMOUNT</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!selectedAccountForStatement?.transactions || selectedAccountForStatement.transactions.length === 0) ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, opacity: 0.6 }}>No transaction history found</TableCell></TableRow>
                  ) : (
                    [...selectedAccountForStatement.transactions].reverse().map((t, i) => (
                      <TableRow key={i} hover>
                        <TableCell>{t.date}</TableCell>
                        <TableCell><Chip label={t.type} size="small" variant="outlined" sx={{ fontWeight: 700 }} /></TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>{t.amount?.toLocaleString()} {currency}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => handleDeleteTransaction(selectedAccountForStatement.id, t.id)}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenStatement(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {isAdmin && <MenuItem onClick={() => { setOpenTransactionDialog(true); setAnchorEl(null); }}>Record Payment / Adjustment</MenuItem>}
        <MenuItem onClick={() => { handleOpenStatement(selectedAccountId); setAnchorEl(null); }}>View Statement</MenuItem>
        {isAdmin && <Divider />}
        {isAdmin && <MenuItem onClick={() => { handleDeleteAccount(selectedAccountId); setAnchorEl(null); }} sx={{ color: 'error.main' }}>Close & Delete Ledger</MenuItem>}
      </Menu>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 3, fontWeight: 800 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CurrentAccount;
