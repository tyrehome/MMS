import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Grid, Paper, Typography, Select, MenuItem,
  FormControl, Box, Table, TableBody, TableCell,
  TableRow, IconButton, Divider,
  Checkbox, FormControlLabel, Card, CardContent, Chip, Tooltip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Badge, Avatar, useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  DeleteForever as DeleteForeverIcon,
  Receipt as ReceiptIcon,
  Analytics as AnalyticsIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  Payment as PaymentIcon,
  Lock as LockIcon,
  SwapHoriz as SwapIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Translate as TranslateIcon,
  Description as QuoteIcon
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';
import { supabase } from '../supabaseClient';

const ReceiptStyles = `
  @page { size: 80mm auto; margin: 0; }
  body { 
    width: 72mm; 
    margin: 4mm auto; 
    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    font-size: 11px; 
    line-height: 1.4;
    color: #000;
    -webkit-print-color-adjust: exact;
  }
  .receipt-container { width: 100%; }
  .receipt-container .header { text-align: center; margin-bottom: 12px; }
  .receipt-container .logo { width: 35mm; height: auto; margin-bottom: 4px; display: block; margin: 0 auto; filter: grayscale(100%); }
  .receipt-container .business-name { font-size: 16px; font-weight: 900; display: block; text-align: center; text-transform: uppercase; margin-bottom: 2px; }
  .receipt-container .address { font-size: 9px; line-height: 1.2; opacity: 0.8; }
  
  .receipt-container .info { font-size: 10px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin-bottom: 8px; margin-top: 8px; }
  .receipt-container .total-row { display: flex; justify-content: space-between; }
  
  .receipt-container .table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  .receipt-container .table th { text-align: left; border-bottom: 1.5px solid #000; font-size: 9px; padding: 4px 0; font-weight: 900; text-transform: uppercase; }
  .receipt-container .table td { padding: 5px 0; vertical-align: top; border-bottom: 0.5px dashed #ccc; font-size: 10px; }
  
  .receipt-container .totals { border-top: 1.5px solid #000; padding-top: 4px; margin-top: 4px; }
  .receipt-container .grand-total { font-weight: 900; font-size: 15px; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
  
  .receipt-container .saving-box { background: #000; color: #fff; text-align: center; padding: 4px; margin-top: 10px; font-weight: 900; font-size: 11px; }
  
  .receipt-container .footer { text-align: center; font-size: 9px; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-weight: 900; }
  .receipt-container .dev-credit { font-size: 7px; opacity: 0.6; margin-top: 6px; text-align: center; }
`;

const SaleForm = ({ tires, parts = [], addSale, saveQuotation, masterData, businessProfile, accounts = [], workers = [], billingDraft, setBillingDraft }) => {
  const { t, receiptLang, toggleReceiptLang } = useLanguage();
  const { isAdmin } = useAuth();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [mobileTab, setMobileTab] = useState(0); // 0 for Catalog, 1 for Cart

  /* ── Lot aging data for FIFO badge ── */
  const [lotAging, setLotAging] = React.useState([]);
  useEffect(() => {
    supabase.from('v_stock_aging').select('tire_id,age_status,age_years,dot_code,manufacture_date,current_qty,received_at')
      .then(({ data }) => { if (data) setLotAging(data); });
  }, [tires]);

  const getOldestLot = (tireId) => {
    const lots = lotAging.filter(l => l.tire_id === tireId && l.current_qty > 0);
    if (!lots.length) return null;
    return lots.reduce((oldest, l) => {
      if (!oldest) return l;
      if (!l.manufacture_date) return oldest;
      if (!oldest.manufacture_date) return l;
      return new Date(l.manufacture_date) < new Date(oldest.manufacture_date) ? l : oldest;
    }, null);
  };

  const getExpiredUnitsForTire = (tireId) => {
    return lotAging
      .filter(l => l.tire_id === tireId && l.age_status === 'Expired')
      .reduce((sum, l) => sum + parseInt(l.current_qty || 0), 0);
  };

  const ageBadgeStyle = (status) => {
    if (status === 'Expired')       return { bg: '#ffebee', color: '#c62828', icon: '🔴', label: 'EXPIRED — Do Not Sell' };
    if (status === 'Critical')      return { bg: '#fff3e0', color: '#e65100', icon: '🟠', label: 'Urgent — Sell First!' };
    if (status === 'Expiring Soon') return { bg: '#fffde7', color: '#f57f17', icon: '🟡', label: 'Expiring Soon' };
    return null;
  };

  const [invoice, setInvoice] = useState({
    customer_name: '', vehicle_number: '', date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash', account_id: '', items: [],
    trade_in_active: false, trade_in_description: '', trade_in_value: 0, trade_in_quantity: 1,
    discount_active: false, discount_type: 'Fixed', discount_value: '',
    cash_received: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'tire', tire_id: '', service_name: '', quantity: 1, price: 0, serial_number: '', worker_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('tires');
  const [saveStatus, setSaveStatus] = useState('');
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [lastSavedInvoice, setLastSavedInvoice] = useState(null);

  // Billing Draft Consumption
  useEffect(() => {
    if (billingDraft) {
      setInvoice(prev => ({
        ...prev,
        customer_name: billingDraft.customer_name || prev.customer_name,
        vehicle_number: billingDraft.vehicle_number || prev.vehicle_number,
        items: [
          ...prev.items,
          {
            id: Date.now(),
            type: 'service',
            service_name: billingDraft.service_name,
            details: billingDraft.details,
            quantity: 1,
            price: billingDraft.price || 0,
            worker_id: billingDraft.worker_id
          }
        ]
      }));
      setBillingDraft(null);
    }
  }, [billingDraft, setBillingDraft]);

  // Draft Logic
  const handleSaveDraft = () => {
    localStorage.setItem('pos_draft_invoice', JSON.stringify(invoice));
    setSaveStatus('Draft saved locally.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleLoadDraft = () => {
    const saved = localStorage.getItem('pos_draft_invoice');
    if (saved) {
      setInvoice(JSON.parse(saved));
      setSaveStatus('Draft restored.');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const services = masterData?.services || [];
  const currency = businessProfile?.currency || 'LKR';

  const handleAddItem = () => {
    if (newItem.type === 'tire' && !newItem.tire_id) return;
    if (newItem.type === 'part' && !newItem.part_id) return;
    if (newItem.type === 'service' && !newItem.service_name) return;
    setInvoice({ ...invoice, items: [...invoice.items, { ...newItem, id: `${newItem.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] });
    setNewItem({ type: 'tire', tire_id: '', part_id: '', service_name: '', quantity: 1, price: 0, serial_number: '', worker_id: '' });
  };

  const calculateDiscount = () => {
    if (!invoice.discount_active || !invoice.discount_value) return 0;
    if (invoice.discount_type === 'Percentage') {
      return (calculateSubtotal() * Number(invoice.discount_value)) / 100;
    }
    return Number(invoice.discount_value);
  };

  const calculateSubtotal = () => invoice.items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
  const calculateTradeInDeduction = () => invoice.trade_in_active ? Number(invoice.trade_in_value) * Number(invoice.trade_in_quantity || 1) : 0;
  const calculateTotal = () => Math.max(0, calculateSubtotal() - calculateTradeInDeduction() - calculateDiscount());
  const calculateChange = () => {
    const cash = parseFloat(invoice.cash_received);
    if (!cash || isNaN(cash)) return 0;
    return Math.max(0, cash - calculateTotal());
  };

  const handleSubmit = async (e, shouldPrint = false) => {
    if (e) e.preventDefault();
    if (invoice.items.length === 0) return alert("Empty basket.");
    if (invoice.payment_method === 'Customer Credit' && !invoice.account_id) return alert("Account required for credit payment.");
    if (invoice.trade_in_active && invoice.trade_in_value <= 0) return alert("Enter a valid trade-in value.");
    if (invoice.discount_active && invoice.discount_value < 0) return alert("Enter a valid discount value.");

    setIsSubmitting(true);
    const saleData = { 
      ...invoice, 
      subtotal: calculateSubtotal(), 
      total: calculateTotal(),
      discount_amount: calculateDiscount(),
      currency 
    };
    const result = await addSale(saleData);
    if (result.success) {
      if (shouldPrint) {
        // Use database ID for stable bill numbering
        const vBillNo = result.data?.sale_id ? `INV-${result.data.sale_id.substring(0, 8).toUpperCase()}` : `INV-${Date.now().toString().slice(-4)}`;
        setLastSavedInvoice({ 
          ...saleData, 
          bill_no: vBillNo,
          timestamp: new Date().toLocaleString(),
          cashier: masterData?.profiles?.find(p => p.id === isAdmin)?.full_name || 'Counter Service'
        });
        setIsPrintDialogOpen(true);
      }
      setInvoice({
        customer_name: '', vehicle_number: '', date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash', account_id: '', items: [],
        trade_in_active: false, trade_in_description: '', trade_in_value: 0, trade_in_quantity: 1,
        discount_active: false, discount_type: 'Fixed', discount_value: '',
        cash_received: ''
      });
      if (!shouldPrint) alert("Transaction success.");
    } else { alert(`Operational failure: ${result.error || 'Check stock/credit.'}`); }
    setIsSubmitting(false);
  };

  useEffect(() => {
    let barcodeData = '';
    let timeoutId = null;

    const handleKeyDown = (e) => {
      // Ignore if user is manually typing inside a text box
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (timeoutId) clearTimeout(timeoutId);

      if (e.key === 'Enter') {
        if (barcodeData.length > 2) {
          const code = barcodeData.trim().toLowerCase();
          // Find matching tire or part
          const tireMatch = tires.find(t => t.brand.toLowerCase().includes(code) || t.size.toLowerCase().includes(code) || (t.dot_code || '').toLowerCase() === code);
          const partMatch = parts.find(p => p.name.toLowerCase().includes(code) || (p.sku || '').toLowerCase() === code);
          
          if (tireMatch) {
            const newItem = { id: `tire-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, type: 'tire', tire_id: tireMatch.id, quantity: 1, price: tireMatch.selling_price || 0, subtotal: tireMatch.selling_price || 0 };
            setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
          } else if (partMatch) {
            const newItem = { id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, type: 'part', part_id: partMatch.id, quantity: 1, price: partMatch.selling_price || partMatch.price || 0, subtotal: partMatch.selling_price || partMatch.price || 0 };
            setInvoice(prev => ({ ...prev, items: [...prev.items, newItem] }));
          }
        }
        barcodeData = '';
      } else if (e.key.length === 1) {
        barcodeData += e.key;
        timeoutId = setTimeout(() => { barcodeData = ''; }, 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tires, parts]);

  const handleGenerateQuote = async (e) => {
    if (e) e.preventDefault();
    if (invoice.items.length === 0) return alert("Empty basket.");

    setIsSubmitting(true);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const quoteData = { 
      customer_name: invoice.customer_name || 'Walk-in',
      vehicle_number: invoice.vehicle_number,
      total: calculateTotal(),
      items: invoice.items,
      status: 'draft',
      expires_at: expiresAt.toISOString()
    };

    const success = await saveQuotation(quoteData);
    if (success) {
      setLastSavedInvoice({ 
        ...invoice, 
        subtotal: calculateSubtotal(), 
        total: calculateTotal(), 
        discount_amount: calculateDiscount(), 
        currency, 
        is_quote: true, 
        bill_no: `QT-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        expires_at: expiresAt.toLocaleDateString(),
        cashier: 'System Quote'
      });
      setIsPrintDialogOpen(true);
    } else { alert("Failed to save quotation."); }
    setIsSubmitting(false);
  };

  const handleThermalPrint = () => {
    const printWindow = window.open('', '_blank');
    const receiptHtml = document.getElementById('thermal-receipt-preview').innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <style>${ReceiptStyles}</style>
        </head>
        <body>
          <div class="receipt-container">${receiptHtml}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Box sx={{ p: isMobile ? 0 : 1 }}>
      <Box sx={{ mb: isMobile ? 2 : 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>{t('posTitle')}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, display: {xs: 'none', sm: 'block'} }}>{t('posSubTitle')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {saveStatus && <Alert severity="info" sx={{ py: 0, px: 2, borderRadius: 2, display: {xs: 'none', md: 'flex'} }}>{saveStatus}</Alert>}
          <IconButton color="primary" onClick={() => window.location.reload()} title="Reload Application" size="small"><RefreshIcon /></IconButton>
          <Button variant="outlined" size="small" onClick={handleLoadDraft} disabled={!localStorage.getItem('pos_draft_invoice')} sx={{ borderRadius: 3, px: 2, fontSize: '0.75rem' }}>Restore</Button>
          <Button variant="outlined" size="small" startIcon={<AnalyticsIcon />} sx={{ borderRadius: 3, px: 2, fontSize: '0.75rem' }}>History</Button>
        </Box>
      </Box>

      {isMobile && (
        <Box sx={{ mb: 2, bgcolor: '#fff', borderRadius: 3, p: 0.5, display: 'flex', border: '1px solid rgba(0,0,0,0.05)' }}>
          <Button 
            fullWidth 
            onClick={() => setMobileTab(0)} 
            sx={{ 
              borderRadius: 2.5, 
              bgcolor: mobileTab === 0 ? 'primary.main' : 'transparent', 
              color: mobileTab === 0 ? '#fff' : 'text.secondary',
              py: 1,
              fontWeight: 800,
              '&:hover': { bgcolor: mobileTab === 0 ? 'primary.dark' : 'rgba(0,0,0,0.04)' }
            }}
          >
            Catalog
          </Button>
          <Button 
            fullWidth 
            onClick={() => setMobileTab(1)} 
            sx={{ 
              borderRadius: 2.5, 
              bgcolor: mobileTab === 1 ? 'primary.main' : 'transparent', 
              color: mobileTab === 1 ? '#fff' : 'text.secondary',
              py: 1,
              fontWeight: 800,
              '&:hover': { bgcolor: mobileTab === 1 ? 'primary.dark' : 'rgba(0,0,0,0.04)' }
            }}
          >
            Cart ({invoice.items.length})
          </Button>
        </Box>
      )}

      <Grid container spacing={isMobile ? 2 : 3}>
        {/* Top Panel: Customer & Meta */}
        {(!isMobile || (isMobile && mobileTab === 0)) && (
          <Grid item xs={12}>
          <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: {xs: 2, md: 4} }}>
              <Grid container spacing={{xs: 2, md: 4}}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <PersonIcon color="primary" sx={{ fontSize: 20 }} />
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>{t('customerName')}</Typography>
                  </Box>
                  <TextField fullWidth placeholder={t('customerName')} value={invoice.customer_name} onChange={e => setInvoice({ ...invoice, customer_name: e.target.value })} variant="standard" InputProps={{ sx: { fontWeight: 800, fontSize: {xs: '1rem', md: '1.2rem'} } }} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <CarIcon color="primary" sx={{ fontSize: 20 }} />
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>{t('vehicleNumber')}</Typography>
                  </Box>
                  <TextField fullWidth placeholder="LP Number" value={invoice.vehicle_number} onChange={e => setInvoice({ ...invoice, vehicle_number: e.target.value })} variant="standard" InputProps={{ sx: { fontWeight: 800, fontSize: {xs: '1rem', md: '1.2rem'} } }} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <PaymentIcon color="primary" sx={{ fontSize: 20 }} />
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>{t('paymentMethod')}</Typography>
                  </Box>
                  <FormControl fullWidth variant="standard">
                    <Select value={invoice.payment_method} onChange={e => setInvoice({ ...invoice, payment_method: e.target.value, account_id: '' })} sx={{ fontWeight: 800 }}>
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Credit Card">Credit Card</MenuItem>
                      <MenuItem value="Customer Credit">Customer Credit</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {invoice.payment_method === 'Customer Credit' && (
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <AnalyticsIcon color="secondary" sx={{ fontSize: 20 }} />
                      <Typography variant="caption" sx={{ fontWeight: 900, color: 'secondary.main', textTransform: 'uppercase' }}>Account Intelligence</Typography>
                    </Box>
                    <FormControl fullWidth variant="standard">
                      <Select
                        value={invoice.account_id}
                        onChange={e => setInvoice({ ...invoice, account_id: e.target.value })}
                        sx={{ fontWeight: 800 }}
                        displayEmpty
                      >
                        <MenuItem value="" disabled><em>Select Account...</em></MenuItem>
                        {accounts.length === 0 && (
                          <MenuItem disabled><em>No accounts found — create one in Finance tab</em></MenuItem>
                        )}
                        {accounts.map(acc => (
                          <MenuItem key={acc.id} value={acc.id}>
                            {acc.name} — Balance: {(acc.receivable || 0).toLocaleString()} {currency}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
          </Grid>
        )}

        {/* Selection Area */}
        {(!isMobile || (isMobile && mobileTab === 0)) && (
          <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 4, minHeight: 600, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              p: {xs: 1, md: 3}, 
              borderBottom: '1px solid rgba(0,0,0,0.05)', 
              display: 'flex', 
              gap: {xs: 1, sm: 2}, 
              alignItems: 'center', 
              overflowX: isMobile ? 'auto' : 'visible',
              whiteSpace: isMobile ? 'nowrap' : 'normal',
              pb: isMobile ? 1.5 : undefined,
              '&::-webkit-scrollbar': { display: 'none' }
            }}>
              <Button size="small" variant={selectedCategory === 'all' ? "contained" : "text"} onClick={() => setSelectedCategory('all')} sx={{ fontWeight: 800, borderRadius: 2, background: selectedCategory === 'all' ? 'linear-gradient(135deg,#1a237e,#311b92)' : undefined }}>All</Button>
              <Button size="small" variant={selectedCategory === 'tires' ? "contained" : "text"} onClick={() => setSelectedCategory('tires')} sx={{ fontWeight: 800, borderRadius: 2 }}>Tires</Button>
              <Button size="small" variant={selectedCategory === 'parts' ? "contained" : "text"} onClick={() => setSelectedCategory('parts')} sx={{ fontWeight: 800, borderRadius: 2 }}>Parts</Button>
              <Button size="small" variant={selectedCategory === 'services' ? "contained" : "text"} onClick={() => setSelectedCategory('services')} sx={{ fontWeight: 800, borderRadius: 2 }}>Services</Button>
              
              {!isMobile && <TextField size="small" placeholder="Search catalog..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} sx={{ ml: 'auto', width: 'auto', '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#fcfcfc' } }} />}
            </Box>
            {isMobile && (
              <Box sx={{ px: 2, pb: 2 }}>
                <TextField fullWidth size="small" placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#fcfcfc' } }} />
              </Box>
            )}
            {/* Item Config Bar */}
            <Box sx={{ p: {xs: 2, md: 3}, bgcolor: 'rgba(0,0,0,0.01)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={5}>
                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, display: 'block' }}>SPEC & ASSIGNMENT</Typography>
                  {newItem.type === 'tire' ? (
                    <TextField fullWidth size="small" placeholder="Serial Code" value={newItem.serial_number} onChange={e => setNewItem({ ...newItem, serial_number: e.target.value })} InputProps={{ sx: { borderRadius: 2 } }} />
                  ) : (
                    <Select fullWidth size="small" value={newItem.worker_id} onChange={e => setNewItem({ ...newItem, worker_id: e.target.value })} sx={{ borderRadius: 2 }} displayEmpty>
                      <MenuItem value="" disabled><em>Assign Worker</em></MenuItem>
                      {(workers || []).map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                    </Select>
                  )}
                </Grid>
                <Grid item xs={6} sm={2}>
                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, display: 'block' }}>QUANTITY</Typography>
                  <TextField fullWidth size="small" type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} InputProps={{ sx: { borderRadius: 2 }, inputProps: { min: 1 } }} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>RATE OVERRIDE</Typography>
                    {!isAdmin && <LockIcon sx={{ fontSize: 12, color: 'error.main' }} />}
                  </Box>
                  <Tooltip title={!isAdmin ? "Only admins can override prices" : ""} placement="top">
                    <span>
                      <TextField
                        fullWidth size="small" type="number"
                        value={newItem.price}
                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                        disabled={!isAdmin}
                        InputProps={{ sx: { borderRadius: 2, bgcolor: !isAdmin ? 'rgba(0,0,0,0.04)' : 'inherit' } }}
                      />
                    </span>
                  </Tooltip>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color="primary" 
                    onClick={handleAddItem} 
                    sx={{ p: {xs: 1, sm: 1.5}, borderRadius: 2 }}
                  >
                    <AddIcon />
                  </Button>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ flexGrow: 1, p: {xs: 1.5, md: 3}, overflowY: 'auto', maxHeight: 600 }}>
              <Grid container spacing={isMobile ? 1 : 2}>

                {/* ───────── ALL TAB ───────── */}
                {selectedCategory === 'all' && [
                  ...tires
                    .filter(t => t.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 t.size?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(t => ({ 
                      type: 'tire', 
                      id: t.id, 
                      name: `${t.brand} ${t.model || ''} ${t.size}`.replace(/\s+/g, ' ').trim(), 
                      subtitle: `${t.vehicle_type || ''} ${t.tire_category ? '· ' + t.tire_category : ''}`.trim(), 
                      price: t.price, 
                      stock: t.stock, 
                      image: t.images?.[0] || null, 
                      data: t 
                    })),
                  ...parts
                    .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 p.category?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(p => ({ type: 'part', id: p.id, name: p.name, subtitle: p.category, price: p.price, stock: p.stock, image: null, data: p })),
                  ...services
                    .filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(s => ({ type: 'service', id: s, name: s, subtitle: 'Service', price: 0, stock: null, image: null, data: s })),
                ].map(item => {
                  const isSelected =
                    (item.type === 'tire'    && newItem.tire_id      === item.id) ||
                    (item.type === 'part'    && newItem.part_id      === item.id) ||
                    (item.type === 'service' && newItem.service_name === item.name);

                  const typeColor =
                    item.type === 'tire'    ? { bg: 'rgba(26,35,126,0.10)', fg: '#1a237e' } :
                    item.type === 'part'    ? { bg: 'rgba(245,0,87,0.10)', fg: '#f50057' } :
                                             { bg: 'rgba(76,175,80,0.10)', fg: '#2e7d32' };
                                             
                  const oldestLot = item.type === 'tire' ? getOldestLot(item.id) : null;
                  const expiredUnits = item.type === 'tire' ? getExpiredUnitsForTire(item.id) : 0;
                  const badge = oldestLot ? ageBadgeStyle(oldestLot.age_status) : null;

                  return (
                    <Grid item xs={6} sm={6} md={4} key={`${item.type}-${item.id}`}>
                      <Card
                        onClick={() => {
                          if (item.type === 'tire')    setNewItem({ ...newItem, type: 'tire',    tire_id: item.id,   price: item.price });
                          else if (item.type === 'part') setNewItem({ ...newItem, type: 'part',  part_id: item.id,   price: item.price });
                          else                          setNewItem({ ...newItem, type: 'service', service_name: item.name });
                        }}
                        sx={{
                          cursor: 'pointer', borderRadius: 4,
                          height: '100%', display: 'flex', flexDirection: 'column',
                          border: isSelected ? '2px solid' : '1px solid rgba(0,0,0,0.05)',
                          borderColor: isSelected ? 'primary.main' : undefined,
                          boxShadow: isSelected ? '0 10px 20px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        <CardContent sx={{ p: isMobile ? 1.5 : 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                            <Chip
                              label={item.type.toUpperCase()}
                              size="small"
                              sx={{ fontWeight: 900, height: 18, fontSize: '0.6rem', bgcolor: typeColor.bg, color: typeColor.fg }}
                            />
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {expiredUnits > 0 && (
                                <Tooltip title="Total Expired Units">
                                  <Chip label={`${expiredUnits} Expired`} size="small" sx={{ fontWeight:900, height:18, fontSize:'0.6rem', bgcolor:'#c62828', color:'#fff' }} />
                                </Tooltip>
                              )}
                              {item.stock !== null && (
                                <Chip
                                  label={`Stk: ${item.stock}`}
                                  size="small"
                                  color={item.stock <= 2 ? 'error' : item.stock <= 5 ? 'warning' : 'default'}
                                  sx={{ fontWeight: 900, height: 18, fontSize: '0.6rem' }}
                                />
                              )}
                            </Box>
                          </Box>
                          {item.image ? (
                            <Box sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 2, overflow: 'hidden', mb: 1, position: 'relative' }}>
                              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              {badge && (
                                <Box sx={{ 
                                  position: 'absolute', 
                                  bottom: 0, 
                                  left: 0, 
                                  right: 0, 
                                  p: 1, 
                                  background: `linear-gradient(to top, ${badge.bg}, transparent)`,
                                  backdropFilter: 'blur(4px)',
                                  borderTop: `1px solid ${badge.color}33`
                                }}>
                                  <Typography sx={{ fontWeight: 900, fontSize: '0.65rem', color: badge.color, lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {badge.icon} {badge.label}
                                  </Typography>
                                  {oldestLot && (
                                    <Typography variant="caption" sx={{ color: badge.color, opacity: 0.9, display:'block', mt: 0.2, fontSize: '0.6rem', fontWeight: 700 }}>
                                      Oldest: {oldestLot.age_years} yrs · {oldestLot.current_qty} units {oldestLot.dot_code ? `· DOT ${oldestLot.dot_code}` : ''}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          ) : (
                            badge && (
                              <Box sx={{ mb: 1, p: 1, borderRadius: 2, bgcolor: badge.bg, border: `1px solid ${badge.color}33` }}>
                                <Typography sx={{ fontWeight: 900, fontSize: '0.72rem', color: badge.color, lineHeight: 1.2 }}>
                                  {badge.icon} {badge.label}
                                </Typography>
                                {oldestLot && (
                                  <Typography variant="caption" sx={{ color: badge.color, opacity: 0.85, display:'block', mt:0.2, fontSize: '0.68rem', fontWeight: 700 }}>
                                    Oldest: {oldestLot.age_years} yrs · {oldestLot.current_qty} units {oldestLot.dot_code ? `· DOT ${oldestLot.dot_code}` : ''}
                                  </Typography>
                                )}
                              </Box>
                            )
                          )}
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, mt: 0.5, fontSize: isMobile ? '0.75rem' : '0.875rem', lineHeight: 1.2 }}>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: isMobile ? '0.65rem' : '0.75rem' }}>{item.subtitle}</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, mb: 1, alignItems: 'center' }}>
                            <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.85rem' }}>
                              {item.price > 0 ? `${item.price} ${currency}` : 'Set price'}
                            </Typography>
                          </Box>

                          <Button
                            fullWidth size="small" variant="contained"
                            startIcon={<AddIcon />}
                            sx={{ mt: 'auto', borderRadius: 2, fontSize: '0.65rem', minWidth: 0, px: isMobile ? 1 : 2 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.type === 'tire') {
                                setInvoice({ ...invoice, items: [...invoice.items, { type: 'tire',    tire_id: item.id, price: item.price, quantity: 1, id: `tire-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] });
                              } else if (item.type === 'part') {
                                setInvoice({ ...invoice, items: [...invoice.items, { type: 'part',    part_id: item.id, price: item.price, quantity: 1, id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] });
                              } else {
                                setInvoice({ ...invoice, items: [...invoice.items, { type: 'service', service_name: item.name, price: 0, quantity: 1, id: `service-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] });
                              }
                            }}
                          >
                            QUICK ADD
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}

                {/* ───────── TIRES TAB ───────── */}
                {selectedCategory === 'tires' && tires.filter(t => t.brand?.toLowerCase().includes(searchTerm.toLowerCase())).map(t => {
                  const oldestLot = getOldestLot(t.id);
                  const expiredUnits = getExpiredUnitsForTire(t.id);
                  const badge = oldestLot ? ageBadgeStyle(oldestLot.age_status) : null;
                  return (
                  <Grid item xs={6} sm={6} md={4} key={t.id}>
                    <Card onClick={() => setNewItem({ ...newItem, type: 'tire', tire_id: t.id, price: t.price })} sx={{
                      cursor: 'pointer', borderRadius: 3,
                      border: newItem.tire_id === t.id ? '2px solid' : '1px solid rgba(0,0,0,0.07)',
                      borderColor: newItem.tire_id === t.id ? 'primary.main' : undefined,
                      boxShadow: newItem.tire_id === t.id ? '0 6px 20px rgba(26,35,126,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s',
                      height: '100%', display: 'flex', flexDirection: 'column'
                    }}>
                      <CardContent sx={{ p: isMobile ? 1.2 : 2, flex: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: isMobile ? 1.2 : 2 } }}>
                        {/* Image */}
                        {t.images && t.images.length > 0 ? (
                          <Box sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 2, overflow: 'hidden', mb: 1, position: 'relative' }}>
                            <img src={t.images[0]} alt={t.brand} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {badge && (
                              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 0.5, bgcolor: badge.bg + 'dd' }}>
                                <Typography sx={{ fontWeight: 900, fontSize: '0.6rem', color: badge.color, lineHeight: 1.1 }}>{badge.icon} {badge.label}</Typography>
                              </Box>
                            )}
                          </Box>
                        ) : (
                          badge && (
                            <Box sx={{ mb: 1, p: 0.8, borderRadius: 1.5, bgcolor: badge.bg, border: `1px solid ${badge.color}33` }}>
                              <Typography sx={{ fontWeight: 900, fontSize: '0.6rem', color: badge.color, lineHeight: 1.2 }}>{badge.icon} {badge.label}</Typography>
                            </Box>
                          )
                        )}
                        {/* Name */}
                        <Typography sx={{ fontWeight: 900, fontSize: isMobile ? '0.72rem' : '0.85rem', lineHeight: 1.25, mb: 0.3 }}>{t.brand} {t.model}</Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: isMobile ? '0.62rem' : '0.72rem', color: 'text.secondary', mb: 0.5 }}>{t.size}</Typography>
                        <Typography sx={{ fontWeight: 500, fontSize: isMobile ? '0.58rem' : '0.65rem', color: 'text.disabled' }}>{t.vehicle_type} · {t.tire_category}</Typography>
                        {/* Price + Stock */}
                        <Box sx={{ mt: 'auto', pt: 1 }}>
                          <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: isMobile ? '0.85rem' : '1rem', lineHeight: 1 }}>{Number(t.price).toLocaleString()}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, mb: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.6rem', color: 'text.secondary' }}>{currency}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {expiredUnits > 0 && (
                                <Chip label={`${expiredUnits} Exp!`} size="small" sx={{ fontWeight: 900, height: 16, fontSize: '0.55rem', bgcolor: '#c62828', color: '#fff', '& .MuiChip-label': { px: 0.5 } }} />
                              )}
                              <Chip label={`${t.stock}`} size="small" color={t.stock <= 0 ? 'error' : t.stock <= 3 ? 'warning' : 'default'} sx={{ fontWeight: 900, height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.8 } }} />
                            </Box>
                          </Box>
                          <Button
                            fullWidth size="small" variant="contained"
                            onClick={(e) => { e.stopPropagation(); setInvoice({ ...invoice, items: [...invoice.items, { type: 'tire', tire_id: t.id, price: t.price, quantity: 1, id: `tire-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] }); }}
                            sx={{ borderRadius: 2, fontSize: isMobile ? '0.6rem' : '0.7rem', py: isMobile ? 0.5 : 0.8, minWidth: 0 }}
                          >
                            + Add
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  );
                })}

                {/* ───────── PARTS TAB ───────── */}
                {selectedCategory === 'parts' && parts.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <Grid item xs={6} sm={6} md={4} key={p.id}>
                    <Card onClick={() => setNewItem({ ...newItem, type: 'part', part_id: p.id, price: p.price })} sx={{
                      cursor: 'pointer', borderRadius: 3,
                      border: newItem.part_id === p.id ? '2px solid' : '1px solid rgba(0,0,0,0.07)',
                      borderColor: newItem.part_id === p.id ? 'primary.main' : undefined,
                      boxShadow: newItem.part_id === p.id ? '0 6px 20px rgba(26,35,126,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s',
                      height: '100%', display: 'flex', flexDirection: 'column'
                    }}>
                      <CardContent sx={{ p: isMobile ? 1.2 : 2, flex: 1, display: 'flex', flexDirection: 'column', '&:last-child': { pb: isMobile ? 1.2 : 2 } }}>
                        {/* Category badge */}
                        <Chip
                          label={p.category || 'Part'}
                          size="small"
                          sx={{ fontWeight: 900, height: 18, fontSize: '0.58rem', bgcolor: 'rgba(245,0,87,0.08)', color: 'secondary.main', alignSelf: 'flex-start', mb: 1 }}
                        />
                        {/* Name */}
                        <Typography sx={{ fontWeight: 900, fontSize: isMobile ? '0.72rem' : '0.85rem', lineHeight: 1.25, mb: 0.3, flex: 1 }}>{p.name}</Typography>
                        {/* Price + Stock + Button */}
                        <Box sx={{ mt: 'auto', pt: 1 }}>
                          <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: isMobile ? '0.85rem' : '1rem', lineHeight: 1 }}>{Number(p.price).toLocaleString()}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, mb: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.6rem', color: 'text.secondary' }}>{currency}</Typography>
                            <Chip label={`${p.stock}`} size="small" color={p.stock <= 2 ? 'error' : p.stock <= 5 ? 'warning' : 'default'} sx={{ fontWeight: 900, height: 16, fontSize: '0.6rem', '& .MuiChip-label': { px: 0.8 } }} />
                          </Box>
                          <Button
                            fullWidth size="small" variant="contained" color="secondary"
                            onClick={(e) => { e.stopPropagation(); setInvoice({ ...invoice, items: [...invoice.items, { type: 'part', part_id: p.id, price: p.price, quantity: 1, id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] }); }}
                            sx={{ borderRadius: 2, fontSize: isMobile ? '0.6rem' : '0.7rem', py: isMobile ? 0.5 : 0.8, minWidth: 0 }}
                          >
                            + Add
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {/* ───────── SERVICES TAB ───────── */}
                {selectedCategory === 'services' && services.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <Grid item xs={6} sm={6} md={4} key={s}>
                    <Card onClick={() => setNewItem({ ...newItem, type: 'service', service_name: s })} sx={{
                      cursor: 'pointer', borderRadius: 4, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                      border: newItem.service_name === s ? '2px solid' : '1px solid rgba(0,0,0,0.05)',
                      borderColor: newItem.service_name === s ? 'primary.main' : undefined,
                    }}>
                      <Typography sx={{ fontWeight: 900, fontSize: isMobile ? '0.75rem' : '1rem', textAlign: 'center', px: 1 }}>{s}</Typography>
                      <Button
                        size="small" variant="contained"
                        startIcon={<AddIcon />}
                        sx={{ position: 'absolute', bottom: 4, right: 4, borderRadius: 2, fontSize: '0.6rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvoice({ ...invoice, items: [...invoice.items, { type: 'service', service_name: s, price: 0, quantity: 1, id: `service-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] });
                        }}
                      >
                        ADD
                      </Button>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Card>
          </Grid>
        )}

        {/* Draft Invoice */}
        {(!isMobile || (isMobile && mobileTab === 1)) && (
          <Grid item xs={12} md={5}>
          <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh', borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e293b' }}>{t('draftInvoice')}</Typography>
              <Badge badgeContent={invoice.items.length} color="primary">
                <ShoppingCartIcon sx={{ color: '#64748b', fontSize: 20 }} />
              </Badge>
            </Box>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'auto', p: 0 }}>
              <Table size="small">
                <TableBody>
                  {invoice.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary', border: 'none' }}>Empty Cart</TableCell>
                    </TableRow>
                  )}
                  {invoice.items.map(item => (
                    <TableRow key={item.id} sx={{ '& td': { borderBottom: '1px solid rgba(0,0,0,0.03)' } }}>
                      <TableCell sx={{ py: 1.5, px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {item.type === 'tire' && tires.find(t => t.id === item.tire_id)?.images?.[0] && (
                            <Avatar src={tires.find(t => t.id === item.tire_id).images[0]} variant="rounded" sx={{ width: 32, height: 32 }} />
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e293b', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.type === 'tire' ? (() => {
                                const tire = tires.find(t => t.id === item.tire_id);
                                if (!tire) return 'Unknown Tire';
                                const oldestLot = getOldestLot(tire.id);
                                const expiredUnits = getExpiredUnitsForTire(tire.id);
                                const badge = oldestLot ? ageBadgeStyle(oldestLot.age_status) : null;
                                return (
                                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {tire.brand} {tire.model || ''} {tire.size}
                                    {badge && badge.icon !== '🟢' && (
                                      <Tooltip title={badge.label}>
                                        <Box component="span" sx={{ fontSize: '0.8rem' }}>{badge.icon}</Box>
                                      </Tooltip>
                                    )}
                                  </Box>
                                );
                              })() : item.type === 'part' ? parts.find(p => p.id === item.part_id)?.name : item.service_name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.quantity} × {Number(item.price).toLocaleString()} {currency}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: '0.85rem', color: '#1e293b', px: 2 }}>{(item.quantity * item.price).toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ px: 1, width: 40 }}>
                        <IconButton size="small" color="error" onClick={() => setInvoice({ ...invoice, items: invoice.items.filter(i => i.id !== item.id) })}>
                          <DeleteForeverIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoice.trade_in_active && invoice.trade_in_value > 0 && (
                    <TableRow sx={{ bgcolor: 'rgba(76,175,80,0.04)' }}>
                      <TableCell sx={{ py: 1, px: 2 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'success.main' }}>
                          ↳ Trade-In: {invoice.trade_in_description || 'Exchange'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'success.main', opacity: 0.8 }}>{invoice.trade_in_quantity || 1} unit(s) traded</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: '0.8rem', color: 'success.main', px: 2 }}>
                        -{calculateTradeInDeduction().toLocaleString()}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {invoice.trade_in_active && (
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.03)', bgcolor: 'rgba(76,175,80,0.04)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main', textTransform: 'uppercase', display: 'flex', alignItems: 'center', mb: 1, fontSize: '0.65rem' }}>
                    <SwapIcon sx={{ fontSize: 14, mr: 0.5 }} /> Trade-In Details
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <TextField fullWidth size="small" placeholder="Description (brand/size/condition)" value={invoice.trade_in_description} onChange={e => setInvoice({ ...invoice, trade_in_description: e.target.value })} InputProps={{ sx: { borderRadius: 2, fontSize: '0.8rem', bgcolor: '#fff' } }} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField fullWidth size="small" type="number" placeholder="Trade-In Value" value={invoice.trade_in_value} onChange={e => setInvoice({ ...invoice, trade_in_value: parseFloat(e.target.value) || 0 })} InputProps={{ sx: { borderRadius: 2, fontSize: '0.8rem', bgcolor: '#fff' }, inputProps: { min: 0 } }} />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField fullWidth size="small" type="number" placeholder="Quantity" value={invoice.trade_in_quantity} onChange={e => setInvoice({ ...invoice, trade_in_quantity: parseInt(e.target.value) || 1 })} InputProps={{ sx: { borderRadius: 2, fontSize: '0.8rem', bgcolor: '#fff' }, inputProps: { min: 1 } }} />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {invoice.discount_active && (
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(0,0,0,0.03)', bgcolor: 'rgba(255,152,0,0.04)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'warning.main', textTransform: 'uppercase', display: 'flex', alignItems: 'center', mb: 1, fontSize: '0.65rem' }}>
                    Special Discount
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={5}>
                      <FormControl fullWidth size="small">
                        <Select value={invoice.discount_type} onChange={e => setInvoice({ ...invoice, discount_type: e.target.value })} sx={{ borderRadius: 2, fontSize: '0.8rem', bgcolor: '#fff' }}>
                          <MenuItem value="Fixed" sx={{ fontSize: '0.8rem' }}>Fixed</MenuItem>
                          <MenuItem value="Percentage" sx={{ fontSize: '0.8rem' }}>Percent (%)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={7}>
                      <TextField fullWidth size="small" type="number" placeholder="Discount Value" value={invoice.discount_value} onChange={e => setInvoice({ ...invoice, discount_value: e.target.value })} InputProps={{ sx: { borderRadius: 2, fontSize: '0.8rem', bgcolor: '#fff' }, inputProps: { min: 0 } }} />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              {/* Summary Rows */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b' }}>Subtotal</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>{calculateSubtotal().toLocaleString()} {currency}</Typography>
              </Box>
              {invoice.trade_in_active && calculateTradeInDeduction() > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b' }}>Trade-In</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'success.main' }}>-{calculateTradeInDeduction().toLocaleString()} {currency}</Typography>
                </Box>
              )}
              {invoice.discount_active && calculateDiscount() > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#64748b' }}>Discount</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'warning.main' }}>-{calculateDiscount().toLocaleString()} {currency}</Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 1.5, borderColor: 'rgba(0,0,0,0.05)' }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2, px: 2 }}>
                <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '1.1rem' }}>Total</Typography>
                <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: '1.4rem', lineHeight: 1 }}>
                  {calculateTotal().toLocaleString()} <Typography component="span" sx={{ fontSize: '0.8rem', color: 'text.secondary', fontWeight: 700 }}>{currency}</Typography>
                </Typography>
              </Box>

              {invoice.payment_method === 'Cash' && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 3, bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={7}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mb: 0.5, display: 'block', fontSize: '0.65rem' }}>Amount Received</Typography>
                      <TextField
                        fullWidth size="small" type="number" placeholder="0.00"
                        value={invoice.cash_received} onChange={e => setInvoice({ ...invoice, cash_received: e.target.value })}
                        InputProps={{ sx: { borderRadius: 2, fontWeight: 800, fontSize: '0.9rem', bgcolor: '#f8fafc', '& input': { py: 0.5 } } }}
                      />
                    </Grid>
                    <Grid item xs={5} sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', mb: 0.5, display: 'block', fontSize: '0.65rem' }}>Balance</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: calculateChange() > 0 ? 'success.main' : '#1e293b' }}>
                        {calculateChange().toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Actions & Toggles */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <FormControlLabel control={<Checkbox size="small" checked={invoice.trade_in_active} onChange={e => setInvoice({ ...invoice, trade_in_active: e.target.checked, trade_in_value: 0, trade_in_description: '', trade_in_quantity: 1 })} sx={{ p: 0.5 }} />} label={<Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Trade-In</Typography>} sx={{ m: 0 }} />
                <FormControlLabel control={<Checkbox size="small" checked={invoice.discount_active} onChange={e => setInvoice({ ...invoice, discount_active: e.target.checked, discount_value: '', discount_type: 'Fixed' })} sx={{ p: 0.5 }} />} label={<Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>Discount</Typography>} sx={{ m: 0, ml: 1 }} />
              </Box>

              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Button variant="contained" color="secondary" fullWidth onClick={(e) => handleSubmit(e, true)} disabled={isSubmitting} sx={{ py: 1.2, borderRadius: 3, fontWeight: 900, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(245, 0, 87, 0.2)' }} startIcon={<ReceiptIcon />}>
                    {isSubmitting ? 'Processing...' : t('payAndPrint')}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth onClick={handleSaveDraft} sx={{ py: 1, borderRadius: 3, fontWeight: 800, fontSize: '0.75rem', color: '#64748b', borderColor: '#cbd5e1' }}>
                    {t('draftInvoice')}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" fullWidth onClick={handleGenerateQuote} disabled={isSubmitting} sx={{ py: 1, borderRadius: 3, fontWeight: 800, fontSize: '0.75rem', color: '#64748b', borderColor: '#cbd5e1' }} startIcon={<QuoteIcon sx={{ fontSize: 16 }} />}>
                    Quote
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      )}
    </Grid>

    {/* Receipt Preview Dialog */}
      <Dialog 
        open={isPrintDialogOpen} 
        onClose={() => setIsPrintDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth 
        fullScreen={isMobile}
        scroll="paper" 
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 4, m: isMobile ? 0 : 2, maxHeight: isMobile ? '100vh' : '90vh' } }}
        sx={{
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(248, 250, 253, 0.95)',
            backdropFilter: 'blur(8px)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
          <Typography sx={{ fontWeight: 900 }}>{t('receiptPreview')}</Typography>
          <Box>
            <Button size="small" onClick={toggleReceiptLang} startIcon={<TranslateIcon />} sx={{ mr: 1 }}>{receiptLang === 'en' ? 'EN' : 'සිංහල'}</Button>
            <IconButton onClick={() => setIsPrintDialogOpen(false)} size="small"><CloseIcon /></IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#f5f5f5', p: {xs: 1, md: 4}, overflowX: 'hidden' }}>
          <Box id="thermal-receipt-preview" className="receipt-container" sx={{
            bgcolor: '#fff', p: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            width: '72mm', mx: 'auto',
            fontFamily: 'Inter, sans-serif',
            color: '#000',
            lineHeight: 1.4
          }}>
            <style>{ReceiptStyles}</style>
            
            <div className="header">
              {businessProfile?.logo_url && <img src={businessProfile.logo_url} className="logo" alt="Logo" />}
              <span className="business-name">{businessProfile?.name}</span>
              <div className="address">{businessProfile?.address}</div>
              {lastSavedInvoice?.is_quote && (
                <div style={{ marginTop: '8px', padding: '4px', borderTop: '2px solid #000', borderBottom: '2px solid #000', fontWeight: 900, fontSize: '14px', letterSpacing: '1px', textAlign: 'center' }}>
                  {t('quotation', 'receipt')}
                </div>
              )}
            </div>

            <div className="info">
              <div className="total-row">
                <span>{t('billNo', 'receipt')} : {lastSavedInvoice?.bill_no}</span>
                <span>{t('cashier', 'receipt')} : {lastSavedInvoice?.cashier}</span>
              </div>
              <div className="total-row">
                <span>{t('date', 'receipt')} : {lastSavedInvoice?.timestamp}</span>
              </div>
              <div className="total-row" style={{ marginTop: '4px', borderTop: '0.5px dashed #ccc', paddingTop: '4px' }}>
                <span>{t('customer', 'receipt')} : {lastSavedInvoice?.customer_name || t('walkIn', 'receipt')}</span>
                {lastSavedInvoice?.vehicle_number && <span> - {lastSavedInvoice?.vehicle_number}</span>}
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>{t('item', 'receipt')}</th>
                  <th align="center">{t('qty', 'receipt')}</th>
                  <th align="right">{t('total', 'receipt')}</th>
                </tr>
              </thead>
              <tbody>
                {(lastSavedInvoice?.items || []).map(i => (
                  <tr key={i.id}>
                    <td>
                      <div style={{ fontWeight: 900, textTransform: 'uppercase' }}>
                        {i.type === 'tire' ? (() => {
                          const tire = (tires || []).find(t => t.id === i.tire_id);
                          return tire ? `${tire.brand} ${tire.model || ''} ${tire.size}` : 'Unknown Tire';
                        })() : i.type === 'part' ? (parts || []).find(p => p.id === i.part_id)?.name : i.service_name}
                      </div>
                      <div style={{ fontSize: '8px', opacity: 0.7 }}>
                        {i.quantity} x {Number(i.price).toLocaleString()}
                        {i.serial_number && <span> | SN: {i.serial_number}</span>}
                      </div>
                    </td>
                    <td align="center" style={{ fontWeight: 800 }}>{i.quantity}</td>
                    <td align="right" style={{ fontWeight: 900 }}>{(i.price * i.quantity).toLocaleString()}</td>
                  </tr>
                ))}
                {lastSavedInvoice?.trade_in_active && (
                  <tr style={{ fontStyle: 'italic', background: '#f9f9f9' }}>
                    <td>{t('tradeIn', 'receipt')} ({lastSavedInvoice.trade_in_description || 'Exchange'})</td>
                    <td align="center">{lastSavedInvoice.trade_in_quantity}</td>
                    <td align="right">-{(Number(lastSavedInvoice.trade_in_value || 0) * Number(lastSavedInvoice.trade_in_quantity || 1)).toLocaleString()}</td>
                  </tr>
                )}
                {lastSavedInvoice?.discount_amount > 0 && (
                  <tr style={{ fontStyle: 'italic', background: '#f9f9f9' }}>
                    <td colSpan="2">{t('discount', 'receipt')} {lastSavedInvoice.discount_type === 'Percentage' ? `(${lastSavedInvoice.discount_value}%)` : ''}</td>
                    <td align="right">-{(lastSavedInvoice.discount_amount || 0).toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="totals">
              <div className="total-row" style={{ opacity: 0.8 }}>
                 <span>{t('subtotal', 'receipt')}</span> 
                 <span>{lastSavedInvoice?.subtotal?.toLocaleString()}</span>
              </div>
              <div className="total-row grand-total">
                <span>{t('totalStr', 'receipt')} ({currency})</span> 
                <span>{lastSavedInvoice?.total?.toLocaleString()}</span>
              </div>
              
              {lastSavedInvoice?.payment_method === 'Cash' && lastSavedInvoice?.cash_received && (
                <div style={{ marginTop: '8px', borderTop: '0.5px dashed #000', paddingTop: '4px' }}>
                  <div className="total-row"><span>{t('cashGiven', 'receipt')}</span> <span>{parseFloat(lastSavedInvoice.cash_received).toLocaleString()}</span></div>
                  <div className="total-row" style={{ opacity: 0.8 }}><span>{t('balance', 'receipt')}</span> <span>{(parseFloat(lastSavedInvoice.cash_received) - lastSavedInvoice.total).toLocaleString()}</span></div>
                </div>
              )}
            </div>

            {(lastSavedInvoice?.discount_amount > 0 || lastSavedInvoice?.trade_in_active) && (
                <div className="saving-box">
                    {t('savings', 'receipt')} {((lastSavedInvoice?.discount_amount || 0) + (Number(lastSavedInvoice?.trade_in_value || 0) * Number(lastSavedInvoice?.trade_in_quantity || 1))).toLocaleString()} {currency}
                </div>
            )}

            <div className="footer">
              {!lastSavedInvoice?.is_quote && <div style={{ fontSize: '11px', marginBottom: '4px' }}>{t('thankYou', 'receipt')}</div>}
              {!lastSavedInvoice?.is_quote && <div style={{ fontSize: '8px', fontWeight: 500 }}>{t('warranty', 'receipt')}</div>}
              <div className="dev-credit">{t('poweredBy', 'receipt')}</div>
            </div>
          </Box>
        </DialogContent>


        <DialogActions sx={{ p: {xs: 2, md: 3}, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setIsPrintDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Close</Button>
          <Button onClick={handleThermalPrint} variant="contained" startIcon={<PrintIcon />} sx={{ borderRadius: 2, px: 4 }}>Print Receipt</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SaleForm;
