import React, { useState, useEffect } from 'react';
import {
  TextField, Button, Grid, Paper, Typography, Select, MenuItem,
  FormControl, Box, Table, TableBody, TableCell,
  TableRow, IconButton, Divider,
  Checkbox, FormControlLabel, Card, CardContent, Chip, Tooltip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions
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
  console.log('SaleForm Accounts:', accounts);
  const { isAdmin } = useAuth();
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
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>{t('posTitle')}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>{t('posSubTitle')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {saveStatus && <Alert severity="info" sx={{ py: 0, px: 2, borderRadius: 2 }}>{saveStatus}</Alert>}
          <IconButton color="primary" onClick={() => window.location.reload()} title="Reload Application"><RefreshIcon /></IconButton>
          <Button variant="outlined" onClick={handleLoadDraft} disabled={!localStorage.getItem('pos_draft_invoice')} sx={{ borderRadius: 3, px: 3 }}>Restore Draft</Button>
          <Button variant="outlined" startIcon={<AnalyticsIcon />} sx={{ borderRadius: 3, px: 3 }}>History</Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Top Panel: Customer & Meta */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <CardContent sx={{ p: 4 }}>
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

        {/* Selection Area */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 4, minHeight: 600, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: {xs: 1.5, md: 3}, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: {xs: 1, sm: 2}, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button size="small" variant={selectedCategory === 'all' ? "contained" : "text"} onClick={() => setSelectedCategory('all')} sx={{ fontWeight: 800, borderRadius: 2, background: selectedCategory === 'all' ? 'linear-gradient(135deg,#1a237e,#311b92)' : undefined }}>All</Button>
              <Button size="small" variant={selectedCategory === 'tires' ? "contained" : "text"} onClick={() => setSelectedCategory('tires')} sx={{ fontWeight: 800, borderRadius: 2 }}>Tires</Button>
              <Button size="small" variant={selectedCategory === 'parts' ? "contained" : "text"} onClick={() => setSelectedCategory('parts')} sx={{ fontWeight: 800, borderRadius: 2 }}>Parts</Button>
              <Button size="small" variant={selectedCategory === 'services' ? "contained" : "text"} onClick={() => setSelectedCategory('services')} sx={{ fontWeight: 800, borderRadius: 2 }}>Services</Button>
              <TextField size="small" placeholder="Search catalog..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} sx={{ ml: {sm: 'auto'}, width: {xs: '100%', sm: 'auto'}, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#fcfcfc' } }} />
            </Box>
            {/* Item Config Bar */}
            <Box sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.01)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
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

            <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', maxHeight: 600 }}>
              <Grid container spacing={2}>

                {/* ───────── ALL TAB ───────── */}
                {selectedCategory === 'all' && [
                  ...tires
                    .filter(t => t.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 t.size?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(t => ({ type: 'tire', id: t.id, name: t.brand, subtitle: t.size, price: t.price, stock: t.stock, image: t.images?.[0] || null, data: t })),
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

                  return (
                    <Grid item xs={12} sm={6} md={4} key={`${item.type}-${item.id}`}>
                      <Card
                        onClick={() => {
                          if (item.type === 'tire')    setNewItem({ ...newItem, type: 'tire',    tire_id: item.id,   price: item.price });
                          else if (item.type === 'part') setNewItem({ ...newItem, type: 'part',  part_id: item.id,   price: item.price });
                          else                          setNewItem({ ...newItem, type: 'service', service_name: item.name });
                        }}
                        sx={{
                          cursor: 'pointer', borderRadius: 4,
                          border: isSelected ? '2px solid' : '1px solid rgba(0,0,0,0.05)',
                          borderColor: isSelected ? 'primary.main' : undefined,
                          boxShadow: isSelected ? '0 10px 20px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                            <Chip
                              label={item.type.toUpperCase()}
                              size="small"
                              sx={{ fontWeight: 900, height: 18, fontSize: '0.6rem', bgcolor: typeColor.bg, color: typeColor.fg }}
                            />
                            {item.stock !== null && (
                              <Chip
                                label={`Stk: ${item.stock}`}
                                size="small"
                                color={item.stock <= 2 ? 'error' : item.stock <= 5 ? 'warning' : 'default'}
                                sx={{ fontWeight: 900, height: 18, fontSize: '0.6rem' }}
                              />
                            )}
                          </Box>
                          {item.image && (
                            <Box sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 2, overflow: 'hidden', mb: 1 }}>
                              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                          )}
                          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{item.subtitle}</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, alignItems: 'center' }}>
                            <Typography sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.85rem' }}>
                              {item.price > 0 ? `${item.price} ${currency}` : 'Set price'}
                            </Typography>
                          </Box>
                          <Button
                            fullWidth size="small" variant="contained"
                            startIcon={<AddIcon />}
                            sx={{ mt: 1, borderRadius: 2, fontSize: '0.7rem' }}
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
                {selectedCategory === 'tires' && tires.filter(t => t.brand?.toLowerCase().includes(searchTerm.toLowerCase())).map(t => (
                  <Grid item xs={12} sm={6} md={4} key={t.id}>
                    <Card onClick={() => setNewItem({ ...newItem, type: 'tire', tire_id: t.id, price: t.price })} sx={{
                      cursor: 'pointer', borderRadius: 4,
                      border: newItem.tire_id === t.id ? '2px solid' : '1px solid rgba(0,0,0,0.05)',
                      borderColor: newItem.tire_id === t.id ? 'primary.main' : undefined,
                      boxShadow: newItem.tire_id === t.id ? '0 10px 20px rgba(0,0,0,0.05)' : 'none'
                    }}>
                      <CardContent sx={{ p: 2 }}>
                        {t.images && t.images.length > 0 && (
                          <Box sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 2, overflow: 'hidden', mb: 2 }}>
                            <img src={t.images[0]} alt={t.brand} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </Box>
                        )}
                        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{t.brand}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{t.size}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{t.price} {currency}</Typography>
                          <Chip label={`Stock: ${t.stock}`} size="small" sx={{ fontWeight: 900, height: 20 }} />
                        </Box>
                        <Button
                          fullWidth size="small" variant="contained"
                          startIcon={<AddIcon />}
                          sx={{ mt: 1, borderRadius: 2, fontSize: '0.7rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInvoice({ ...invoice, items: [...invoice.items, { type: 'tire', tire_id: t.id, price: t.price, quantity: 1, id: `tire-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] });
                          }}
                        >
                          QUICK ADD
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {/* ───────── PARTS TAB ───────── */}
                {selectedCategory === 'parts' && parts.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <Grid item xs={12} sm={6} md={4} key={p.id}>
                    <Card onClick={() => setNewItem({ ...newItem, type: 'part', part_id: p.id, price: p.price })} sx={{
                      cursor: 'pointer', borderRadius: 4,
                      border: newItem.part_id === p.id ? '2px solid' : '1px solid rgba(0,0,0,0.05)',
                      borderColor: newItem.part_id === p.id ? 'primary.main' : undefined,
                      boxShadow: newItem.part_id === p.id ? '0 10px 20px rgba(0,0,0,0.05)' : 'none'
                    }}>
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Chip
                            label={p.category || 'Part'}
                            size="small"
                            sx={{ fontWeight: 900, height: 18, fontSize: '0.6rem', bgcolor: 'rgba(245,0,87,0.08)', color: 'secondary.main' }}
                          />
                          <Chip label={`Stk: ${p.stock}`} size="small" color={p.stock <= 2 ? 'error' : p.stock <= 5 ? 'warning' : 'default'} sx={{ fontWeight: 900, height: 18, fontSize: '0.6rem' }} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mt: 0.5 }}>{p.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{p.price} {currency}</Typography>
                        </Box>
                        <Button
                          fullWidth size="small" variant="contained"
                          startIcon={<AddIcon />}
                          sx={{ mt: 1, borderRadius: 2, fontSize: '0.7rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInvoice({ ...invoice, items: [...invoice.items, { type: 'part', part_id: p.id, price: p.price, quantity: 1, id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` }] });
                          }}
                        >
                          QUICK ADD
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {/* ───────── SERVICES TAB ───────── */}
                {selectedCategory === 'services' && services.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                  <Grid item xs={12} sm={6} md={4} key={s}>
                    <Card onClick={() => setNewItem({ ...newItem, type: 'service', service_name: s })} sx={{
                      cursor: 'pointer', borderRadius: 4, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: newItem.service_name === s ? '2px solid' : '1px solid rgba(0,0,0,0.05)',
                      borderColor: newItem.service_name === s ? 'primary.main' : undefined,
                    }}>
                      <Typography sx={{ fontWeight: 900 }}>{s}</Typography>
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

        {/* Draft Invoice */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: {xs: 2, md: 4}, borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>{t('draftInvoice')}</Typography>
              <ShoppingCartIcon />
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'auto' }}>
              <Table sx={{ minWidth: { xs: 400, md: 'auto' } }}>
                <TableBody>
                  {invoice.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.type === 'tire' && tires.find(t => t.id === item.tire_id)?.images?.[0] && (
                            <img src={tires.find(t => t.id === item.tire_id).images[0]} alt="tire" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', aspectRatio: '1/1' }} />
                          )}
                          <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', lineHeight: 1.1 }}>
                              {item.type === 'tire' ? tires.find(t => t.id === item.tire_id)?.brand : item.type === 'part' ? parts.find(p => p.id === item.part_id)?.name : item.service_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{item.quantity} x {Number(item.price).toLocaleString()}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900 }}>{(item.quantity * item.price).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => setInvoice({ ...invoice, items: invoice.items.filter(i => i.id !== item.id) })}>
                          <DeleteForeverIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoice.trade_in_active && invoice.trade_in_value > 0 && (
                    <TableRow sx={{ bgcolor: 'rgba(76,175,80,0.05)' }}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'success.main' }}>
                          ↳ Trade-In: {invoice.trade_in_description || 'Exchange'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{invoice.trade_in_quantity || 1} unit(s) traded</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: 'success.main' }}>
                        -{calculateTradeInDeduction().toLocaleString()}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Trade-in fields moved inside scroll area */}
              {invoice.trade_in_active && (
                <Box sx={{ px: 3, py: 2, mt: 'auto', borderTop: '1px solid rgba(0,0,0,0.05)', bgcolor: 'rgba(76,175,80,0.05)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'success.main', textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                    <SwapIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />Trade-In Details
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth size="small" label="Description (brand/size/condition)"
                        value={invoice.trade_in_description}
                        onChange={e => setInvoice({ ...invoice, trade_in_description: e.target.value })}
                        InputProps={{ sx: { borderRadius: 2 } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small" type="number" label="Trade-In Value"
                        value={invoice.trade_in_value}
                        onChange={e => setInvoice({ ...invoice, trade_in_value: parseFloat(e.target.value) || 0 })}
                        InputProps={{ sx: { borderRadius: 2 }, inputProps: { min: 0 } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small" type="number" label="Quantity"
                        value={invoice.trade_in_quantity}
                        onChange={e => setInvoice({ ...invoice, trade_in_quantity: parseInt(e.target.value) || 1 })}
                        InputProps={{ sx: { borderRadius: 2 }, inputProps: { min: 1 } }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Discount fields moved inside scroll area */}
              {invoice.discount_active && (
                <Box sx={{ px: 3, py: 2, mt: invoice.trade_in_active ? 0 : 'auto', borderTop: invoice.trade_in_active ? 'none' : '1px solid rgba(0,0,0,0.05)', bgcolor: 'rgba(255,152,0,0.05)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'warning.main', textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                    Special Discount
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                        <Select value={invoice.discount_type} onChange={e => setInvoice({ ...invoice, discount_type: e.target.value })} sx={{ borderRadius: 2 }}>
                          <MenuItem value="Fixed">Fixed Amount</MenuItem>
                          <MenuItem value="Percentage">Percentage (%)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth size="small" type="number" label="Discount Value"
                        value={invoice.discount_value}
                        onChange={e => setInvoice({ ...invoice, discount_value: e.target.value })}
                        InputProps={{ sx: { borderRadius: 2 }, inputProps: { min: 0 } }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>

            <Box sx={{ p: {xs: 2, md: 3}, bgcolor: 'primary.main', color: '#fff' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontWeight: 500, opacity: 0.8 }}>Subtotal</Typography>
                <Typography sx={{ fontWeight: 900 }}>{calculateSubtotal().toLocaleString()} {currency}</Typography>
              </Box>
              {invoice.trade_in_active && calculateTradeInDeduction() > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ fontWeight: 500, opacity: 0.8 }}>Trade-In Deduction</Typography>
                  <Typography sx={{ fontWeight: 900, color: '#a5d6a7' }}>-{calculateTradeInDeduction().toLocaleString()} {currency}</Typography>
                </Box>
              )}
              {invoice.discount_active && calculateDiscount() > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ fontWeight: 500, opacity: 0.8 }}>Discount {invoice.discount_type === 'Percentage' ? `(${invoice.discount_value}%)` : ''}</Typography>
                  <Typography sx={{ fontWeight: 900, color: '#ffb74d' }}>-{calculateDiscount().toLocaleString()} {currency}</Typography>
                </Box>
              )}
              <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'flex-end' }}>
                <Typography variant="h5" sx={{ fontWeight: 500 }}>Total</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900 }}>{calculateTotal().toLocaleString()} {currency}</Typography>
              </Box>

              {invoice.payment_method === 'Cash' && (
                <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={7}>
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, display: 'block', mb: 0.5 }}>Amount Received</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        placeholder="0.00"
                        value={invoice.cash_received}
                        onChange={e => setInvoice({ ...invoice, cash_received: e.target.value })}
                        InputProps={{
                          sx: { 
                            bgcolor: 'rgba(255,255,255,0.9)', 
                            borderRadius: 1.5, 
                            fontWeight: 900,
                            '& input': { py: 1 }
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={5} sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', opacity: 0.8, display: 'block', mb: 0.5 }}>Balance</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 500, color: calculateChange() > 0 ? '#a5d6a7' : '#fff' }}>
                        {calculateChange().toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={isSubmitting}
                    sx={{ py: 2, borderRadius: 3, fontWeight: 900, boxShadow: '0 8px 16px rgba(245, 0, 87, 0.3)' }}
                    startIcon={<ReceiptIcon />}
                  >
                    {isSubmitting ? 'Processing...' : t('payAndPrint')}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" color="inherit" fullWidth onClick={handleSaveDraft} sx={{ py: 1.5, borderRadius: 3, fontWeight: 800, border: '1.5px solid rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    {t('draftInvoice')}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    variant="contained" 
                    fullWidth 
                    onClick={handleGenerateQuote} 
                    disabled={isSubmitting} 
                    sx={{ py: 1.5, borderRadius: 3, fontWeight: 900, bgcolor: 'rgba(255,255,255,0.95)', color: 'primary.main', '&:hover': { bgcolor: '#fff' }, fontSize: '0.8rem' }} 
                    startIcon={<QuoteIcon />}
                  >
                    {t('generateQuote')}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={<Checkbox checked={invoice.trade_in_active} onChange={e => setInvoice({ ...invoice, trade_in_active: e.target.checked, trade_in_value: 0, trade_in_description: '', trade_in_quantity: 1 })} sx={{ color: '#fff' }} />}
                    label={<Typography variant="caption" sx={{ fontWeight: 800 }}>Trade-In</Typography>}
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={<Checkbox checked={invoice.discount_active} onChange={e => setInvoice({ ...invoice, discount_active: e.target.checked, discount_value: '', discount_type: 'Fixed' })} sx={{ color: '#fff' }} />}
                    label={<Typography variant="caption" sx={{ fontWeight: 800 }}>Discount</Typography>}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Receipt Preview Dialog */}
      <Dialog open={isPrintDialogOpen} onClose={() => setIsPrintDialogOpen(false)} maxWidth="xs" fullWidth scroll="paper" PaperProps={{ sx: { borderRadius: 4 } }}>
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
                        {i.type === 'tire' ? (tires || []).find(t => t.id === i.tire_id)?.brand : i.type === 'part' ? (parts || []).find(p => p.id === i.part_id)?.name : i.service_name}
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
