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
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from './AuthContext';

const SaleForm = ({ tires, parts = [], addSale, masterData, businessProfile, accounts = [], workers = [], billingDraft, setBillingDraft }) => {
  console.log('SaleForm Accounts:', accounts);
  const { isAdmin } = useAuth();
  const [invoice, setInvoice] = useState({
    customer_name: '', vehicle_number: '', date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash', account_id: '', items: [],
    trade_in_active: false, trade_in_description: '', trade_in_value: 0, trade_in_quantity: 1
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
            price: 0,
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
    setInvoice({ ...invoice, items: [...invoice.items, { ...newItem, id: Date.now() }] });
    setNewItem({ type: 'tire', tire_id: '', part_id: '', service_name: '', quantity: 1, price: 0, serial_number: '', worker_id: '' });
  };

  const calculateSubtotal = () => invoice.items.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
  const calculateTradeInDeduction = () => invoice.trade_in_active ? Number(invoice.trade_in_value) * Number(invoice.trade_in_quantity || 1) : 0;
  const calculateTotal = () => calculateSubtotal() - calculateTradeInDeduction();

  const handleSubmit = async (e, shouldPrint = false) => {
    if (e) e.preventDefault();
    if (invoice.items.length === 0) return alert("Empty basket.");
    if (invoice.payment_method === 'Customer Credit' && !invoice.account_id) return alert("Account required for credit payment.");
    if (invoice.trade_in_active && invoice.trade_in_value <= 0) return alert("Enter a valid trade-in value.");

    setIsSubmitting(true);
    const saleData = { ...invoice, subtotal: calculateSubtotal(), total: calculateTotal(), currency };
    const success = await addSale(saleData);
    if (success) {
      if (shouldPrint) {
        setLastSavedInvoice(saleData);
        setIsPrintDialogOpen(true);
      }
      setInvoice({
        customer_name: '', vehicle_number: '', date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash', account_id: '', items: [],
        trade_in_active: false, trade_in_description: '', trade_in_value: 0, trade_in_quantity: 1
      });
      if (!shouldPrint) alert("Transaction success.");
    } else { alert("Operational failure. Check stock/credit."); }
    setIsSubmitting(false);
  };

  const handleThermalPrint = () => {
    const printWindow = window.open('', '_blank');
    const receiptHtml = document.getElementById('thermal-receipt-preview').innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              width: 72mm; 
              margin: 4mm auto; 
              font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              font-size: 11px; 
              line-height: 1.4;
              color: #000;
            }
            .header { text-align: center; margin-bottom: 15px; }
            .logo { width: 50mm; height: auto; margin-bottom: 8px; filter: grayscale(100%); }
            .business-name { font-size: 16px; font-weight: 900; display: block; }
            .info { font-size: 10px; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 5px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .table th { text-align: left; border-bottom: 1px solid #000; padding: 4px 0; font-size: 10px; }
            .table td { padding: 6px 0; vertical-align: top; border-bottom: 0.5px dashed #eee; }
            .totals { border-top: 1.5px solid #000; margin-top: 5px; padding-top: 8px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .grand-total { font-size: 15px; font-weight: 900; margin-top: 8px; padding-top: 8px; border-top: 1px solid #000; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
            .dev-credit { font-size: 9px; opacity: 0.6; margin-top: 10px; font-weight: bold; }
            .qr-placeholder { margin-top: 10px; font-size: 8px; color: #666; }
          </style>
        </head>
        <body>
          ${receiptHtml}
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
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>POS & Billing Engine</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>High-frequency transaction terminal with intelligent stock routing</Typography>
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
              <Grid container spacing={4}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <PersonIcon color="primary" sx={{ fontSize: 20 }} />
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>Customer Name</Typography>
                  </Box>
                  <TextField fullWidth placeholder="Customer Name" value={invoice.customer_name} onChange={e => setInvoice({ ...invoice, customer_name: e.target.value })} variant="standard" InputProps={{ sx: { fontWeight: 800, fontSize: '1.2rem' } }} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <CarIcon color="primary" sx={{ fontSize: 20 }} />
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>Vehicle Number</Typography>
                  </Box>
                  <TextField fullWidth placeholder="LP Number" value={invoice.vehicle_number} onChange={e => setInvoice({ ...invoice, vehicle_number: e.target.value })} variant="standard" InputProps={{ sx: { fontWeight: 800, fontSize: '1.2rem' } }} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <PaymentIcon color="primary" sx={{ fontSize: 20 }} />
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main', textTransform: 'uppercase' }}>Payment Method</Typography>
                  </Box>
                  <FormControl fullWidth variant="standard">
                    <Select value={invoice.payment_method} onChange={e => setInvoice({ ...invoice, payment_method: e.target.value, account_id: '' })} sx={{ fontWeight: 800 }}>
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Credit Card">Credit Card</MenuItem>
                      <MenuItem value="Customer Credit">Customer Credit (Account)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {invoice.payment_method === 'Customer Credit' && (
                  <Grid item xs={12} md={3}>
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
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button variant={selectedCategory === 'tires' ? "contained" : "text"} onClick={() => setSelectedCategory('tires')} sx={{ fontWeight: 800, borderRadius: 2 }}>Tires</Button>
              <Button variant={selectedCategory === 'parts' ? "contained" : "text"} onClick={() => setSelectedCategory('parts')} sx={{ fontWeight: 800, borderRadius: 2 }}>Parts</Button>
              <Button variant={selectedCategory === 'services' ? "contained" : "text"} onClick={() => setSelectedCategory('services')} sx={{ fontWeight: 800, borderRadius: 2 }}>Services</Button>
              <TextField size="small" placeholder="Search catalog..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} sx={{ ml: 'auto', '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#fcfcfc' } }} />
            </Box>
            {/* Item Config Bar */}
            <Box sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.01)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={5}>
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
                <Grid item xs={2}>
                  <Typography variant="caption" sx={{ fontWeight: 800, mb: 1, display: 'block' }}>QUANTITY</Typography>
                  <TextField fullWidth size="small" type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} InputProps={{ sx: { borderRadius: 2 }, inputProps: { min: 1 } }} />
                </Grid>
                <Grid item xs={3}>
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
                <Grid item xs={2}>
                  <IconButton color="primary" onClick={handleAddItem} sx={{ bgcolor: 'primary.light', p: 1.5, borderRadius: 2 }}><AddIcon /></IconButton>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto', maxHeight: 600 }}>
              <Grid container spacing={2}>
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
                            setInvoice({ ...invoice, items: [...invoice.items, { type: 'tire', tire_id: t.id, price: t.price, quantity: 1, id: Date.now() }] });
                          }}
                        >
                          QUICK ADD
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                
                {selectedCategory === 'parts' && parts.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <Grid item xs={12} sm={6} md={4} key={p.id}>
                    <Card onClick={() => setNewItem({ ...newItem, type: 'part', part_id: p.id, price: p.price })} sx={{
                      cursor: 'pointer', borderRadius: 4,
                      border: newItem.part_id === p.id ? '2px solid' : '1px solid rgba(0,0,0,0.05)',
                      borderColor: newItem.part_id === p.id ? 'primary.main' : undefined,
                      boxShadow: newItem.part_id === p.id ? '0 10px 20px rgba(0,0,0,0.05)' : 'none'
                    }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{p.category}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{p.price} {currency}</Typography>
                          <Chip label={`Stock: ${p.stock}`} size="small" sx={{ fontWeight: 900, height: 20 }} />
                        </Box>
                        <Button 
                          fullWidth size="small" variant="contained" 
                          startIcon={<AddIcon />} 
                          sx={{ mt: 1, borderRadius: 2, fontSize: '0.7rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInvoice({ ...invoice, items: [...invoice.items, { type: 'part', part_id: p.id, price: p.price, quantity: 1, id: Date.now() }] });
                          }}
                        >
                          QUICK ADD
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

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
                          setInvoice({ ...invoice, items: [...invoice.items, { type: 'service', service_name: s, price: 0, quantity: 1, id: Date.now() }] });
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
          <Paper sx={{ p: 4, borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Draft Invoice</Typography>
              <ShoppingCartIcon />
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'auto' }}>
              <Table sx={{ minWidth: { xs: 400, md: 'auto' } }}>
                <TableBody>
                  {invoice.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {item.type === 'tire' && tires.find(t => t.id === item.tire_id)?.images?.[0] && (
                            <img src={tires.find(t => t.id === item.tire_id).images[0]} alt="tire" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover', aspectRatio: '1/1' }} />
                          )}
                          <Box>
                            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                              {item.type === 'tire' ? tires.find(t => t.id === item.tire_id)?.brand : item.type === 'part' ? parts.find(p => p.id === item.part_id)?.name : item.service_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">{item.quantity} x {Number(item.price).toLocaleString()}</Typography>
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
            </Box>

            {/* Trade-in fields */}
            {invoice.trade_in_active && (
              <Box sx={{ px: 3, pb: 2 }}>
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
                      fullWidth size="small" type="number" label="Trade-In Value (per unit)"
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

            <Box sx={{ p: 4, bgcolor: 'primary.main', color: '#fff' }}>
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
              <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.1)' }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'flex-end' }}>
                <Typography variant="h5" sx={{ fontWeight: 500 }}>Total</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900 }}>{calculateTotal().toLocaleString()} {currency}</Typography>
              </Box>
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
                    {isSubmitting ? 'Processing...' : 'PAY & PRINT'}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button variant="outlined" color="inherit" fullWidth onClick={handleSaveDraft} sx={{ py: 1.5, borderRadius: 3, fontWeight: 800, border: '1.5px solid rgba(255,255,255,0.4)' }}>
                    SAVE DRAFT
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={<Checkbox checked={invoice.trade_in_active} onChange={e => setInvoice({ ...invoice, trade_in_active: e.target.checked, trade_in_value: 0, trade_in_description: '', trade_in_quantity: 1 })} sx={{ color: '#fff' }} />}
                    label={<Typography variant="caption" sx={{ fontWeight: 800 }}>Trade-In</Typography>}
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Hidden Receipt */}
      {/* Receipt Preview Dialog */}
      <Dialog open={isPrintDialogOpen} onClose={() => setIsPrintDialogOpen(false)} maxWidth="xs" fullWidth scroll="paper" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
          <Typography sx={{ fontWeight: 900 }}>Receipt Preview</Typography>
          <IconButton onClick={() => setIsPrintDialogOpen(false)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#f5f5f5', p: 4 }}>
          <Box id="thermal-receipt-preview" sx={{
            bgcolor: '#fff', p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            width: '72mm', mx: 'auto',
            fontFamily: 'Courier New',
            fontSize: '11px',
            color: '#000'
          }}>
            <style>
              {`
                .receipt-container .header { text-align: center; margin-bottom: 15px; }
                .receipt-container .logo { width: 40mm; height: auto; margin-bottom: 8px; display: block; margin: 0 auto; }
                .receipt-container .business-name { font-size: 14px; font-weight: 900; display: block; text-align: center; }
                .receipt-container .info { font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
                .receipt-container .total-row { display: flex; justify-content: space-between; }
                .receipt-container .table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                .receipt-container .table th { text-align: left; border-bottom: 1px solid #000; font-size: 10px; padding: 4px 0; }
                .receipt-container .table td { padding: 4px 0; vertical-align: top; border-bottom: 0.5px dashed #eee; }
                .receipt-container .totals { border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                .receipt-container .grand-total { font-weight: 900; font-size: 13px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                .receipt-container .footer { text-align: center; font-size: 9px; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; }
                .receipt-container .dev-credit { font-size: 8px; opacity: 0.8; margin-top: 8px; font-style: italic; }
              `}
            </style>
            <div className="receipt-container">
              <div className="header">
                {businessProfile?.logo_url && <img src={businessProfile.logo_url} className="logo" alt="Logo" />}
                <span className="business-name">{businessProfile?.name}</span>
                <div style={{ fontSize: '10px' }}>{businessProfile?.address}</div>
              </div>

              <div className="info">
                <div className="total-row"><span>DATE:</span> <span>{lastSavedInvoice?.date}</span></div>
                <div className="total-row"><span>CUSTOMER:</span> <span>{lastSavedInvoice?.customer_name || 'Walk-in'}</span></div>
                {lastSavedInvoice?.vehicle_number && <div className="total-row"><span>VEHICLE:</span> <span>{lastSavedInvoice?.vehicle_number}</span></div>}
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th align="right">QTY</th>
                    <th align="right">SUB</th>
                  </tr>
                </thead>
                <tbody>
                  {(lastSavedInvoice?.items || []).map(i => (
                    <tr key={i.id}>
                      <td>
                        <strong>{i.type === 'tire' ? (tires || []).find(t => t.id === i.tire_id)?.brand : i.type === 'part' ? (parts || []).find(p => p.id === i.part_id)?.name : i.service_name}</strong>
                        {i.serial_number && <div style={{ fontSize: '8px' }}>SN: {i.serial_number}</div>}
                      </td>
                      <td align="right">{i.quantity}</td>
                      <td align="right">{(i.price * i.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                  {lastSavedInvoice?.trade_in_active && (
                    <tr style={{ fontStyle: 'italic' }}>
                      <td>Trade-In: {lastSavedInvoice.trade_in_description}</td>
                      <td align="right">{lastSavedInvoice.trade_in_quantity}</td>
                      <td align="right">-{((lastSavedInvoice.trade_in_value || 0) * (lastSavedInvoice.trade_in_quantity || 1)).toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="totals">
                <div className="total-row"><span>Subtotal</span> <span>{lastSavedInvoice?.subtotal?.toLocaleString()}</span></div>
                <div className="total-row grand-total"><span>TOTAL ({currency})</span> <span>{lastSavedInvoice?.total?.toLocaleString()}</span></div>
              </div>

              <div className="footer">
                <div>THANK YOU FOR YOUR BUSINESS!</div>
                <div>Warranty Claims valid with this receipt.</div>
                <div className="dev-credit">Powered by amsome.com</div>
              </div>
            </div>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #eee' }}>
          <Button onClick={() => setIsPrintDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Close</Button>
          <Button onClick={handleThermalPrint} variant="contained" startIcon={<PrintIcon />} sx={{ borderRadius: 2, px: 4 }}>Print Receipt</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SaleForm;
