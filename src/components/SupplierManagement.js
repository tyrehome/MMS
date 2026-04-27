import React, { useState, useMemo } from 'react';
import {
  Typography, Box, Grid, Card, CardContent, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, TextField, InputAdornment, Button, IconButton,
  Avatar, 
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  ToggleButton, ToggleButtonGroup, useMediaQuery
} from '@mui/material';
import {
  LocalShipping as SupplierIcon,
  Search as SearchIcon,
  AttachMoney as CashIcon,
  History as HistoryIcon,
  Payments as PaymentsIcon,
  AccountBalance as BankIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const SupplierManagement = ({ suppliers = [], businessProfile, recordAudit, updateSupplier, deleteSupplier }) => {
  useAuth();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openLedgerDialog, setOpenLedgerDialog] = useState(false);
  const [openVendorDialog, setOpenVendorDialog] = useState(false);

  // Transaction details state
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [detailsData, setDetailsData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'Cash',
    checkNumber: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // New Vendor Form State
  const [newVendor, setNewVendor] = useState({
    name: '',
    phone: '',
    email: '',
    opening_balance: 0
  });

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [isEditing, setIsEditing] = useState(false);

  const currency = businessProfile?.currency || 'LKR';

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm))
    );
  }, [suppliers, searchTerm]);

  const fetchTransactionDetails = async (transaction) => {
    setLoadingDetails(true);
    setOpenDetailsDialog(true);
    try {
      if (transaction.type === 'Bulk GRN') {
        let grnRef = transaction.description.split('Ref: ')[1]?.trim();
        let actualGrnId = grnRef;

        if (!actualGrnId) {
          const { data: fallback } = await supabase
            .from('grns')
            .select('id, reference_number')
            .eq('supplier_id', selectedSupplier.id)
            .eq('total_cost', transaction.amount)
            .limit(1)
            .maybeSingle();
          
          if (fallback) {
            actualGrnId = fallback.id;
            grnRef = fallback.reference_number || fallback.id;
          } else {
            throw new Error("No GRN Reference found for this transaction.");
          }
        } else {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actualGrnId);
          if (!isUUID) {
            const { data: grnData } = await supabase
              .from('grns')
              .select('id')
              .eq('reference_number', actualGrnId)
              .limit(1)
              .maybeSingle();
            
            if (grnData) {
              actualGrnId = grnData.id;
            } else {
              throw new Error("Could not find GRN matching reference: " + actualGrnId);
            }
          }
        }
        
        const { data, error } = await supabase
          .from('grn_items')
          .select(`
            quantity, cost_price, subtotal,
            tires(brand, size),
            parts(name)
          `)
          .eq('grn_id', actualGrnId);
        if (error) throw error;
        setDetailsData({ type: 'GRN', items: data, ref: grnRef });
      } else if (transaction.type === 'Stock Return') {
        const returnRef = transaction.description.split('Ref: ')[1];
        if (!returnRef) throw new Error("No Return Reference found.");

        const { data, error } = await supabase
          .from('supplier_returns')
          .select('*')
          .eq('id', returnRef)
          .single();
        if (error) throw error;
        setDetailsData({ type: 'Return', items: data.items, ref: returnRef, reason: data.reason });
      }
    } catch (e) {
      console.error(e);
      setDetailsData({ error: e.message });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch payment history when a supplier is selected
  const fetchPaymentHistory = async (supplierId) => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('payment_date', { ascending: false });
    
    if (!error && data) setPaymentHistory(data);
    setLoadingHistory(false);
  };

  const handleOpenPay = (supplier) => {
    setSelectedSupplier(supplier);
    setPaymentData({
      amount: '',
      method: 'Cash',
      checkNumber: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setOpenPayDialog(true);
  };

  const handleOpenLedger = (supplier) => {
    setSelectedSupplier(supplier);
    fetchPaymentHistory(supplier.id);
    setOpenLedgerDialog(true);
  };

  const handleAddVendor = async () => {
    if (!newVendor.name) {
      setAlert({ open: true, message: 'Vendor name is required', severity: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateSupplier(selectedSupplier.id, {
          name: newVendor.name,
          phone: newVendor.phone,
          email: newVendor.email
        });
        setAlert({ open: true, message: 'Vendor updated successfully', severity: 'success' });
      } else {
        const { error } = await supabase.from('suppliers').insert([{
          name: newVendor.name,
          phone: newVendor.phone,
          email: newVendor.email,
          payable_balance: Number(newVendor.opening_balance || 0),
          transactions: Number(newVendor.opening_balance) > 0 ? [{
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            date: new Date().toISOString().split('T')[0],
            type: 'Opening Balance',
            amount: Number(newVendor.opening_balance),
            description: 'Initial balance'
          }] : []
        }]);
        if (error) throw error;
        setAlert({ open: true, message: 'Vendor added successfully', severity: 'success' });
      }
      setOpenVendorDialog(false);
      setNewVendor({ name: '', phone: '', email: '', opening_balance: 0 });
      setIsEditing(false);
    } catch (e) {
      setAlert({ open: true, message: e.message, severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVendor = async (supplierId) => {
    if (window.confirm('Are you sure you want to delete this vendor? All their history will be lost.')) {
      try {
        await deleteSupplier(supplierId);
        setAlert({ open: true, message: 'Vendor deleted successfully', severity: 'success' });
      } catch (e) {
        setAlert({ open: true, message: 'Error deleting vendor', severity: 'error' });
      }
    }
  };

  const handleEditVendor = (supplier) => {
    setSelectedSupplier(supplier);
    setNewVendor({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      opening_balance: 0 // Cannot edit opening balance once created
    });
    setIsEditing(true);
    setOpenVendorDialog(true);
  };

  const handleSubmitPayment = async () => {
    if (!paymentData.amount || Number(paymentData.amount) <= 0) {
      setAlert({ open: true, message: 'Invalid payment amount', severity: 'error' });
      return;
    }

    try {
      // 1. Insert Payment Record
      const { data: paymentRecord, error: payErr } = await supabase.from('supplier_payments').insert([{
        supplier_id: selectedSupplier.id,
        amount: Number(paymentData.amount),
        payment_method: paymentData.method,
        check_number: paymentData.method === 'Check' ? paymentData.checkNumber : null,
        payment_date: paymentData.date,
        notes: paymentData.notes
      }]).select().single();

      if (payErr) throw payErr;

      // 2. Update Supplier Balance & Ledger
      const newBalance = Number(selectedSupplier.payable_balance || 0) - Number(paymentData.amount);
      const tx = {
        id: paymentRecord.id,
        date: paymentData.date,
        type: 'Payment Made',
        amount: Number(paymentData.amount),
        description: `${paymentData.method} Payment ${paymentData.checkNumber ? '(Chq: ' + paymentData.checkNumber + ')' : ''}`.trim()
      };

      const { error: supErr } = await supabase.from('suppliers').update({
        payable_balance: newBalance,
        transactions: [...(selectedSupplier.transactions || []), tx]
      }).eq('id', selectedSupplier.id);

      if (supErr) throw supErr;

      setAlert({ open: true, message: 'Payment recorded successfully!', severity: 'success' });
      setOpenPayDialog(false);
      recordAudit('Vendor Payment', { 
        supplier: selectedSupplier.name, 
        amount: paymentData.amount, 
        method: paymentData.method,
        check: paymentData.checkNumber 
      });
    } catch (e) {
      setAlert({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleDeleteTransaction = async (txId) => {
    if (!window.confirm("Are you sure you want to delete this transaction? This will revert the balance.")) return;
    
    try {
      const tx = selectedSupplier.transactions.find(t => t.id === txId);
      if (!tx) return;

      const newTransactions = selectedSupplier.transactions.filter(t => t.id !== txId);
      
      // Re-calculate balance
      let newBalance = 0;
      newTransactions.forEach(t => {
        if (t.type.includes('Payment') || t.type === 'Stock Return') {
          newBalance -= Number(t.amount || 0);
        } else {
          newBalance += Number(t.amount || 0);
        }
      });
      
      const { error } = await supabase
        .from('suppliers')
        .update({ 
          transactions: newTransactions,
          payable_balance: newBalance
        })
        .eq('id', selectedSupplier.id);

      if (error) throw error;
      
      recordAudit('Delete Vendor Transaction', { 
        supplier: selectedSupplier.name,
        tx_type: tx.type,
        tx_amount: tx.amount,
        new_balance: newBalance
      }, 'suppliers');

      // Update local state
      setSelectedSupplier({ ...selectedSupplier, transactions: newTransactions, payable_balance: newBalance });
    } catch (err) {
      alert("Failed to delete transaction: " + err.message);
    }
  };

  const handlePrintStatement = () => {
    const printContent = document.getElementById('vendor-ledger-table');
    const win = window.open('', '', 'height=700,width=900');
    win.document.write('<html><head><title>Vendor Statement</title>');
    win.document.write('<style>table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style>');
    win.document.write('</head><body>');
    win.document.write(`<h1>Vendor Statement: ${selectedSupplier.name}</h1>`);
    win.document.write(`<p>Current Balance: ${selectedSupplier.payable_balance.toLocaleString()} ${currency}</p>`);
    win.document.write(printContent.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: isMobile ? 3 : 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Vendor Management</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, display: {xs: 'none', sm: 'block'} }}>Track payables, inventory sourcing, and payment history</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<SupplierIcon />} 
          onClick={() => setOpenVendorDialog(true)}
          sx={{ borderRadius: 3, fontWeight: 900, px: isMobile ? 2 : 4 }}
        >
          {isMobile ? 'ADD' : 'NEW VENDOR'}
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 4, bgcolor: 'rgba(244, 67, 54, 0.05)', border: '1px solid rgba(244, 67, 54, 0.1)' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.7 }}>Total Payables</Typography>
              <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 900, color: 'error.main' }}>
                {suppliers.reduce((s, x) => s + Math.max(0, Number(x.payable_balance || 0)), 0).toLocaleString()} <Typography component="span" variant="h6" sx={{ opacity: 0.5 }}>{currency}</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ borderRadius: 4, bgcolor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.1)' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.7 }}>Advance Paid</Typography>
              <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 900, color: 'success.main' }}>
                {Math.abs(suppliers.reduce((s, x) => s + Math.min(0, Number(x.payable_balance || 0)), 0)).toLocaleString()} <Typography component="span" variant="h6" sx={{ opacity: 0.5 }}>{currency}</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card sx={{ borderRadius: 4, bgcolor: 'rgba(26, 35, 126, 0.05)', border: '1px solid rgba(26, 35, 126, 0.1)' }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="overline" sx={{ fontWeight: 900, opacity: 0.7 }}>Suppliers</Typography>
              <Typography variant={isMobile ? "h4" : "h3"} sx={{ fontWeight: 900, color: 'primary.main' }}>
                {suppliers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Card sx={{ borderRadius: 4, p: 2, mb: 3, border: '1px solid rgba(0,0,0,0.05)' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search vendors by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            sx: { borderRadius: 3 }
          }}
        />
      </Card>

      {/* Suppliers Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none', overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(26, 35, 126, 0.03)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 900, py: 2.5 }}>VENDOR NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CONTACT INFO</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>BALANCE STATUS</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>LAST TRANSACTION</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900 }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" color="text.secondary">No vendors found. Add your first supplier to start tracking.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((sup) => (
                <TableRow key={sup.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', fontWeight: 900 }}>{sup.name[0]}</Avatar>
                      <Typography sx={{ fontWeight: 800 }}>{sup.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{sup.phone || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{sup.email || ''}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 900, color: Number(sup.payable_balance) > 0 ? 'error.main' : (Number(sup.payable_balance) < 0 ? 'success.main' : 'text.secondary') }}>
                      {Number(sup.payable_balance) < 0 ? `Advance: ${Math.abs(sup.payable_balance).toLocaleString()}` : `${Number(sup.payable_balance || 0).toLocaleString()}`} {currency}
                    </Typography>
                    {Number(sup.payable_balance) < 0 && <Chip label="DEBIT BALANCE" size="small" color="success" sx={{ fontSize: '0.6rem', height: 16, fontWeight: 900 }} />}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {sup.transactions?.length > 0 ? sup.transactions[sup.transactions.length - 1].date : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sup.transactions?.length > 0 ? sup.transactions[sup.transactions.length - 1].type : ''}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary" 
                        onClick={() => handleOpenPay(sup)}
                        sx={{ borderRadius: 2, fontWeight: 800 }}
                      >
                        PAY
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => handleOpenLedger(sup)}
                        sx={{ borderRadius: 2, fontWeight: 800 }}
                      >
                        LEDGER
                      </Button>
                      <IconButton size="small" color="primary" onClick={() => handleEditVendor(sup)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteVendor(sup.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Payment Dialog */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.05)', mb: 2 }}>
          Record Payment: {selectedSupplier?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: Number(selectedSupplier?.payable_balance) >= 0 ? 'rgba(244, 67, 54, 0.05)' : 'rgba(76, 175, 80, 0.05)', borderRadius: 2, border: '1px dashed ' + (Number(selectedSupplier?.payable_balance) >= 0 ? 'rgba(244, 67, 54, 0.3)' : 'rgba(76, 175, 80, 0.3)') }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: Number(selectedSupplier?.payable_balance) >= 0 ? 'error.main' : 'success.main', display: 'block' }}>
                {Number(selectedSupplier?.payable_balance) >= 0 ? 'OUTSTANDING BALANCE' : 'ADVANCE BALANCE'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: Number(selectedSupplier?.payable_balance) >= 0 ? 'error.main' : 'success.main' }}>
                {Math.abs(Number(selectedSupplier?.payable_balance || 0)).toLocaleString()} {currency}
              </Typography>
            </Box>

            <TextField
              label="Payment Amount"
              fullWidth
              type="number"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                sx: { borderRadius: 3 }
              }}
            />

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 900, mb: 1, display: 'block', color: 'text.secondary' }}>PAYMENT METHOD</Typography>
              <ToggleButtonGroup
                value={paymentData.method}
                exclusive
                onChange={(_, v) => v && setPaymentData({ ...paymentData, method: v })}
                fullWidth
                size="small"
              >
                <ToggleButton value="Cash" sx={{ fontWeight: 800 }}>CASH</ToggleButton>
                <ToggleButton value="Check" sx={{ fontWeight: 800 }}>CHECK</ToggleButton>
                <ToggleButton value="Bank Transfer" sx={{ fontWeight: 800 }}>BANK</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {paymentData.method === 'Check' && (
              <TextField
                label="Check Number"
                fullWidth
                value={paymentData.checkNumber}
                onChange={(e) => setPaymentData({ ...paymentData, checkNumber: e.target.value })}
                InputProps={{ sx: { borderRadius: 3 } }}
              />
            )}

            <TextField
              label="Payment Date"
              type="date"
              fullWidth
              value={paymentData.date}
              onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              InputProps={{ sx: { borderRadius: 3 } }}
            />

            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              InputProps={{ sx: { borderRadius: 3 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpenPayDialog(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitPayment} sx={{ borderRadius: 3, fontWeight: 900, px: 3 }}>POST PAYMENT</Button>
        </DialogActions>
      </Dialog>

      {/* Ledger Dialog */}
      <Dialog 
        open={openLedgerDialog} 
        onClose={() => setOpenLedgerDialog(false)} 
        maxWidth="md" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 4, minHeight: '80vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', color: '#fff' }}>
          Vendor Ledger: {selectedSupplier?.name}
          <IconButton onClick={() => setOpenLedgerDialog(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, display: 'flex', gap: 2, bgcolor: 'rgba(26, 35, 126, 0.02)' }}>
             <Box sx={{ flex: 1, p: 2, bgcolor: '#fff', borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>{Number(selectedSupplier?.payable_balance) >= 0 ? 'TOTAL PAYABLE' : 'ADVANCE BALANCE'}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: Number(selectedSupplier?.payable_balance) >= 0 ? 'error.main' : 'success.main' }}>{Math.abs(Number(selectedSupplier?.payable_balance || 0)).toLocaleString()} {currency}</Typography>
              </Box>
             <Box sx={{ flex: 1, p: 2, bgcolor: '#fff', borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)' }}>
               <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>TOTAL TRANSACTIONS</Typography>
               <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>{selectedSupplier?.transactions?.length || 0}</Typography>
             </Box>
             <Button 
              variant="outlined" 
              startIcon={<PrintIcon />} 
              onClick={handlePrintStatement}
              sx={{ borderRadius: 3, fontWeight: 700 }}
            >
              PRINT STATEMENT
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<DeleteIcon />} 
              onClick={() => { if(window.confirm("Delete this entire vendor and all history?")) { handleDeleteVendor(selectedSupplier.id); setOpenLedgerDialog(false); } }}
              sx={{ borderRadius: 3, fontWeight: 700 }}
            >
              DELETE VENDOR
            </Button>
          </Box>

          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HistoryIcon color="primary" /> Full Transaction History
            </Typography>
            <TableContainer id="vendor-ledger-table" component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>TYPE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>DESCRIPTION</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>AMOUNT</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>ACTIONS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...(selectedSupplier?.transactions || [])].reverse().map((t, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{t.date}</TableCell>
                      <TableCell>
                        <Chip 
                          label={t.type} 
                          size="small" 
                          variant="outlined" 
                          color={t.type.includes('Payment') ? 'success' : 'primary'}
                          sx={{ fontWeight: 800, fontSize: '0.65rem' }} 
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {t.description}
                        {(t.type === 'Bulk GRN' || t.type === 'Stock Return') && (
                          <Button 
                            size="small" 
                            variant="text" 
                            onClick={() => fetchTransactionDetails(t)}
                            sx={{ ml: 1, p: 0, minWidth: 0, fontSize: '0.7rem', fontWeight: 700 }}
                          >
                            Details
                          </Button>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: (t.type.includes('Payment') || t.type === 'Stock Return') ? 'success.main' : 'error.main' }}>
                        {(t.type.includes('Payment') || t.type === 'Stock Return') ? '-' : '+'}{Number(t.amount || 0).toLocaleString()} {currency}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => handleDeleteTransaction(t.id)}>
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!selectedSupplier?.transactions || selectedSupplier.transactions.length === 0) && (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>No transactions recorded.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h6" sx={{ fontWeight: 900, mt: 4, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PaymentsIcon color="primary" /> Payment Audit Records
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>METHOD</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>REF / CHECK #</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>AMOUNT</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingHistory ? (
                     <TableRow><TableCell colSpan={4} align="center" sx={{ py: 2 }}>Loading history...</TableCell></TableRow>
                  ) : paymentHistory.length > 0 ? (
                    paymentHistory.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                             {p.payment_method === 'Cash' ? <CashIcon fontSize="small" color="success" /> : <BankIcon fontSize="small" color="primary" />}
                             <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.payment_method}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{p.check_number || p.reference_number || '—'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900 }}>{Number(p.amount).toLocaleString()} {currency}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}>No audit records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <Button onClick={() => setOpenLedgerDialog(false)} sx={{ fontWeight: 800 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* New Vendor Dialog */}
      <Dialog open={openVendorDialog} onClose={() => { setOpenVendorDialog(false); setIsEditing(false); }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>{isEditing ? 'Edit Vendor' : 'Register New Vendor'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <TextField
              label="Vendor Name *"
              fullWidth
              value={newVendor.name}
              onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
              InputProps={{ sx: { borderRadius: 3 } }}
            />
            <TextField
              label="Phone Number"
              fullWidth
              value={newVendor.phone}
              onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
              InputProps={{ sx: { borderRadius: 3 } }}
            />
            <TextField
              label="Email Address"
              fullWidth
              value={newVendor.email}
              onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
              InputProps={{ sx: { borderRadius: 3 } }}
            />
            <TextField
              label="Opening Payable Balance"
              type="number"
              fullWidth
              value={newVendor.opening_balance}
              onChange={(e) => setNewVendor({ ...newVendor, opening_balance: e.target.value })}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
                sx: { borderRadius: 3 }
              }}
              helperText="Add any amount you currently owe this vendor"
              disabled={isEditing}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => { setOpenVendorDialog(false); setIsEditing(false); }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddVendor} 
            disabled={isSubmitting}
            sx={{ borderRadius: 3, fontWeight: 900, px: 3 }}
          >
            {isSubmitting ? 'SAVING...' : (isEditing ? 'UPDATE VENDOR' : 'SAVE VENDOR')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog open={openDetailsDialog} onClose={() => setOpenDetailsDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          Transaction Details
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {loadingDetails ? (
            <Typography sx={{ py: 4, textAlign: 'center' }}>Loading details...</Typography>
          ) : detailsData?.error ? (
            <Alert severity="error">{detailsData.error}</Alert>
          ) : detailsData ? (
            <Box>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(26, 35, 126, 0.04)', borderRadius: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Reference</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{detailsData.ref}</Typography>
                {detailsData.reason && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Reason</Typography>
                    <Typography variant="body2">{detailsData.reason}</Typography>
                  </Box>
                )}
              </Box>

              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailsData.type === 'GRN' ? (
                      detailsData.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {item.tires ? `${item.tires.brand} ${item.tires.size}` : item.parts?.name}
                          </TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">{Number(item.cost_price).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      detailsData.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell align="right">{Number(item.unit_cost).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Typography>No details available.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDetailsDialog(false)} sx={{ fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity} sx={{ borderRadius: 3, fontWeight: 800 }}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SupplierManagement;
