import React, { useState, useMemo } from 'react';
import {
  TextField, Typography, Snackbar, Button, Box, Grid, Select,
  MenuItem, FormControl, InputLabel, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Divider, Autocomplete,
  Avatar, Card, Tab, Tabs, Alert, IconButton, ToggleButton,
  ToggleButtonGroup, Checkbox, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip, Badge, LinearProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  LocalShipping as GRNIcon, Inventory2 as StockIcon,
  Build as PartsIcon, Hotel as HotelIcon, Delete as DeleteIcon,
  AddPhotoAlternate as PhotoIcon, TireRepair as TireIcon,
  Category as CategoryIcon, TrendingUp as MarginIcon,
  Assignment as POIcon, Print as PrintIcon, Add as AddIcon,
  Remove as RemoveIcon, FilterList as FilterIcon,
  ContentCopy as CopyIcon, Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';
import PartsInventory from './PartsInventory';
import TireHotel from './TireHotel';

/* ─── Part category presets ─── */
const PART_CATEGORIES = [
  'Consumable','Spare Part','Lubricant','Filter',
  'Battery','Electrical','Brake Parts','Suspension',
  'Body Parts','Tool','Chemical','Other','Custom',
];

/* ─── colour helpers ─── */
const stockColor = (qty, threshold) => {
  if (qty === 0) return 'error';
  if (qty <= threshold) return 'warning';
  return 'success';
};

const TireList = ({
  tires = [], addTire, updateTire, deleteTire,
  parts = [], hotelTires = [],
  masterData, businessProfile
}) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab]       = useState('stock');
  const [grnType,   setGrnType]         = useState('tire');
  const [searchTerm, setSearchTerm]     = useState('');
  const [sortBy, setSortBy]             = useState('brand');
  const [alert, setAlert]               = useState({ open: false, message: '', severity: 'success' });

  /* ── Stock filters ── */
  const [inventoryView,  setInventoryView]  = useState('tires'); // tires|parts|all
  const [stockFilter,    setStockFilter]    = useState('all');   // all|low|out
  const [threshold,      setThreshold]      = useState(10);

  /* ── Order Note ── */
  const [orderItems,     setOrderItems]     = useState([]);      // { id, type, name, currentStock, orderQty }
  const [isPOOpen,       setIsPOOpen]       = useState(false);
  const [poSupplier,     setPoSupplier]     = useState('');
  const [poNotes,        setPoNotes]        = useState('');

  /* ── Tire GRN state ── */
  const [grnData, setGrnData] = useState({
    brand:'',model:'',size:'',tire_category:'New',
    stock:'',cost_price:'',price:'',vehicle_type:'',
    dot_code:'',origin:'',thread_pattern:'',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading,    setUploading]    = useState(false);

  /* ── Parts GRN state ── */
  const [partGrn, setPartGrn] = useState({
    name:'',category:'Consumable',customCategory:'',
    stock:'',cost_price:'',price:'',supplier:'',notes:'',
  });
  const [partSaving, setPartSaving] = useState(false);

  const tireBrands   = masterData?.brands   || [];
  const vehicleTypes = masterData?.vehicles || [];
  const currency     = businessProfile?.currency || 'LKR';

  /* ─── image compression ─── */
  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = ({ target: { result } }) => {
      const img = new Image();
      img.src = result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let { width: w, height: h } = img;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else        { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.72);
      };
    };
  });

  /* ─── Tire GRN ─── */
  const handleGRNSubmit = async (e) => {
    e.preventDefault();
    if (!grnData.brand || !grnData.size || !grnData.stock) {
      setAlert({ open:true, message:'Complete all required fields.', severity:'error' }); return;
    }
    setUploading(true);
    try {
      let imageUrl = null;
      if (selectedFile) {
        const blob = await compressImage(selectedFile);
        const name = `${Date.now()}_${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage.from('tires').upload(name, blob);
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from('tires').getPublicUrl(name).data.publicUrl;
      }
      const existing = tires.find(t =>
        (t.brand||'').toLowerCase()===(grnData.brand||'').toLowerCase() &&
        (t.model||'').toLowerCase()===(grnData.model||'').toLowerCase() &&
        (t.size ||'').toLowerCase()===(grnData.size ||'').toLowerCase() &&
        (t.vehicle_type ||'').toLowerCase()===(grnData.vehicle_type ||'').toLowerCase() &&
        (t.tire_category||'').toLowerCase()===(grnData.tire_category||'').toLowerCase()
      );
      if (existing) {
        await updateTire(existing.id, {
          stock: parseInt(existing.stock||0) + parseInt(grnData.stock),
          cost_price: parseFloat(grnData.cost_price || existing.cost_price || 0),
          price:      parseFloat(grnData.price      || existing.price      || 0),
          ...(grnData.dot_code        && { dot_code:       grnData.dot_code }),
          ...(grnData.origin          && { origin:         grnData.origin }),
          ...(grnData.thread_pattern  && { thread_pattern: grnData.thread_pattern }),
          ...(imageUrl && { images: [...(existing.images||[]), imageUrl] }),
        });
        setAlert({ open:true, message:`✅ Restocked — ${existing.brand} ${existing.size} updated.`, severity:'success' });
      } else {
        await addTire({ ...grnData, images: imageUrl ? [imageUrl] : [],
          stock: parseInt(grnData.stock), cost_price: parseFloat(grnData.cost_price||0), price: parseFloat(grnData.price||0) });
        setAlert({ open:true, message:'✅ New tire added to inventory & POS.', severity:'success' });
      }
      setGrnData({ brand:'',model:'',size:'',tire_category:'New',stock:'',cost_price:'',price:'',vehicle_type:'',dot_code:'',origin:'',thread_pattern:'' });
      setSelectedFile(null); setActiveTab('stock');
    } catch(err) {
      setAlert({ open:true, message:'Failed: '+err.message, severity:'error' });
    } finally { setUploading(false); }
  };

  /* ─── Parts GRN ─── */
  const handlePartGRNSubmit = async (e) => {
    e.preventDefault();
    if (!partGrn.name || !partGrn.stock || !partGrn.price) {
      setAlert({ open:true, message:'Name, Quantity and Sell Price required.', severity:'error' }); return;
    }
    setPartSaving(true);
    try {
      const finalCat = partGrn.category === 'Custom' ? (partGrn.customCategory||'Custom') : partGrn.category;
      const existing = parts.find(p =>
        (p.name||'').toLowerCase()===(partGrn.name||'').toLowerCase() &&
        (p.category||'').toLowerCase()===finalCat.toLowerCase()
      );
      if (existing) {
        await supabase.from('parts').update({
          stock:      parseInt(existing.stock||0)+parseInt(partGrn.stock),
          cost_price: parseFloat(partGrn.cost_price || existing.cost_price || 0),
          price:      parseFloat(partGrn.price),
        }).eq('id', existing.id);
        setAlert({ open:true, message:`✅ Restocked — ${existing.name} updated.`, severity:'success' });
      } else {
        await supabase.from('parts').insert([{
          name: partGrn.name, category: finalCat,
          stock: parseInt(partGrn.stock),
          cost_price: parseFloat(partGrn.cost_price||0),
          price: parseFloat(partGrn.price),
          created_at: new Date().toISOString(),
        }]);
        setAlert({ open:true, message:`✅ "${partGrn.name}" added — visible in POS Parts & All tabs.`, severity:'success' });
      }
      setPartGrn({ name:'',category:'Consumable',customCategory:'',stock:'',cost_price:'',price:'',supplier:'',notes:'' });
      setActiveTab('parts');
    } catch(err) {
      setAlert({ open:true, message:'Failed: '+err.message, severity:'error' });
    } finally { setPartSaving(false); }
  };

  const handleDeleteTire = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try { await deleteTire(id); setAlert({ open:true, message:'Deleted.', severity:'info' }); }
    catch  { setAlert({ open:true, message:'Delete failed.',  severity:'error' }); }
  };

  /* ─── Combined inventory list ─── */
  const allInventory = useMemo(() => {
    const tireRows = tires.map(t => ({
      id: t.id, type: 'tire',
      name:  `${t.brand}${t.model ? ' '+t.model : ''}`,
      label: `${t.size}${t.vehicle_type ? ' · '+t.vehicle_type : ''}`,
      category: t.tire_category || 'New',
      stock: parseInt(t.stock || 0),
      price: parseFloat(t.price || 0),
      cost_price: parseFloat(t.cost_price || 0),
      images: t.images,
      _raw: t,
    }));
    const partRows = parts.map(p => ({
      id: p.id, type: 'part',
      name:  p.name,
      label: p.category,
      category: p.category,
      stock: parseInt(p.stock || 0),
      price: parseFloat(p.price || 0),
      cost_price: parseFloat(p.cost_price || 0),
      images: [],
      _raw: p,
    }));
    return [...tireRows, ...partRows];
  }, [tires, parts]);

  const filteredInventory = useMemo(() => {
    return allInventory
      .filter(item => {
        if (inventoryView === 'tires') return item.type === 'tire';
        if (inventoryView === 'parts') return item.type === 'part';
        return true;
      })
      .filter(item => {
        if (stockFilter === 'low') return item.stock > 0 && item.stock <= threshold;
        if (stockFilter === 'out') return item.stock === 0;
        return true;
      })
      .filter(item => {
        const q = searchTerm.toLowerCase();
        return item.name.toLowerCase().includes(q) ||
               item.label.toLowerCase().includes(q) ||
               item.category.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'stock') return a.stock - b.stock;
        if (sortBy === 'price') return a.price - b.price;
        return a.name.localeCompare(b.name);
      });
  }, [allInventory, inventoryView, stockFilter, threshold, searchTerm, sortBy]);

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    totalTires:  tires.length,
    totalParts:  parts.length,
    lowStock:    allInventory.filter(i => i.stock > 0 && i.stock <= threshold).length,
    outOfStock:  allInventory.filter(i => i.stock === 0).length,
    totalValue:  allInventory.reduce((s,i)=>s+(i.stock*i.price),0),
  }), [allInventory, threshold, tires, parts]);

  /* ─── Order Note helpers ─── */
  const toggleOrderItem = (item) => {
    setOrderItems(prev => {
      const exists = prev.find(o => o.id === item.id && o.type === item.type);
      if (exists) return prev.filter(o => !(o.id === item.id && o.type === item.type));
      return [...prev, { id: item.id, type: item.type, name: item.name, label: item.label, currentStock: item.stock, orderQty: Math.max(threshold - item.stock + 5, 5) }];
    });
  };

  const isInOrder = (item) => orderItems.some(o => o.id === item.id && o.type === item.type);

  const updateOrderQty = (id, type, delta) => {
    setOrderItems(prev => prev.map(o =>
      (o.id === id && o.type === type) ? { ...o, orderQty: Math.max(1, o.orderQty + delta) } : o
    ));
  };

  const addAllLowStock = () => {
    const lowItems = allInventory.filter(i => i.stock <= threshold);
    const newItems = lowItems
      .filter(item => !orderItems.some(o => o.id === item.id && o.type === item.type))
      .map(item => ({ id: item.id, type: item.type, name: item.name, label: item.label,
        currentStock: item.stock, orderQty: Math.max(threshold - item.stock + 5, 5) }));
    setOrderItems(prev => [...prev, ...newItems]);
  };

  /* ─── Purchase Order Print ─── */
  const handlePrintPO = () => {
    const businessName = businessProfile?.name || 'Our Business';
    const businessAddr = businessProfile?.address || '';
    const today = new Date().toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' });
    const poNumber = 'PO-' + Date.now().toString().slice(-8);

    const rows = orderItems.map(item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;">
          <strong>${item.name}</strong><br/>
          <span style="font-size:11px;color:#666;">${item.label} · ${item.type.toUpperCase()}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;">${item.currentStock}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:900;color:#1a237e;">${item.orderQty}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html><html>
      <head>
        <title>Purchase Order — ${poNumber}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { margin:0;padding:0;box-sizing:border-box; }
          body { font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b; }
          .header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #1a237e; }
          .business { font-size:22px;font-weight:900;color:#1a237e; }
          .po-label { font-size:28px;font-weight:900;color:#f50057; }
          .po-number { font-size:13px;color:#666;margin-top:4px; }
          .meta { display:flex;gap:40px;margin-bottom:28px;padding:16px;background:#f8fafd;border-radius:8px; }
          .meta-block label { font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;display:block;margin-bottom:4px; }
          .meta-block span  { font-weight:700;font-size:14px; }
          table { width:100%;border-collapse:collapse;margin-bottom:24px; }
          thead { background:#1a237e;color:#fff; }
          thead th { padding:12px 8px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px; }
          .totals { text-align:right;font-size:14px;margin-bottom:24px; }
          .totals strong { font-size:16px;color:#1a237e; }
          .notes-box { border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:24px; }
          .notes-box label { font-size:11px;font-weight:700;text-transform:uppercase;color:#94a3b8;display:block;margin-bottom:6px; }
          .footer { text-align:center;font-size:11px;color:#94a3b8;border-top:1px dashed #e2e8f0;padding-top:16px; }
          .badge { display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700; }
          .badge-tire { background:#e8eaf6;color:#1a237e; }
          .badge-part { background:#fce4ec;color:#c2185b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="business">${businessName}</div>
            ${businessAddr ? `<div style="color:#666;margin-top:4px;">${businessAddr}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div class="po-label">PURCHASE ORDER</div>
            <div class="po-number">${poNumber}</div>
          </div>
        </div>

        <div class="meta">
          <div class="meta-block"><label>Date</label><span>${today}</span></div>
          <div class="meta-block"><label>Supplier</label><span>${poSupplier || '— Not specified —'}</span></div>
          <div class="meta-block"><label>Total Lines</label><span>${orderItems.length} items</span></div>
          <div class="meta-block"><label>Total Units</label><span>${orderItems.reduce((s,o)=>s+o.orderQty,0)} units</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align:center;">Current Stock</th>
              <th style="text-align:center;">Order Quantity</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="totals">
          Total Units to Order: <strong>${orderItems.reduce((s,o)=>s+o.orderQty,0)}</strong>
        </div>

        ${poNotes ? `
        <div class="notes-box">
          <label>Notes / Instructions</label>
          <div>${poNotes}</div>
        </div>` : ''}

        <div class="footer">
          Generated by ${businessName} · ${today} · Ref: ${poNumber}<br/>
          Please confirm receipt and delivery timeline.
        </div>

        <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800);}</script>
      </body></html>
    `;
    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
  };

  const handleCopyPO = () => {
    const lines = orderItems.map(o => `${o.name} (${o.label}) — Qty: ${o.orderQty} [Stock: ${o.currentStock}]`).join('\n');
    const text = `PURCHASE ORDER — ${new Date().toLocaleDateString()}\nSupplier: ${poSupplier||'—'}\n\n${lines}\n\nTotal Units: ${orderItems.reduce((s,o)=>s+o.orderQty,0)}\n\nNotes: ${poNotes||'—'}`;
    navigator.clipboard.writeText(text).then(() => setAlert({ open:true, message:'Purchase Order copied to clipboard.', severity:'success' }));
  };

  const tireMargin = grnData.price > 0
    ? (((grnData.price - grnData.cost_price) / grnData.price)*100).toFixed(0) : null;
  const partMargin = partGrn.price > 0
    ? (((partGrn.price - partGrn.cost_price) / partGrn.price)*100).toFixed(0) : null;

  const MarginChip = ({ margin }) => {
    if (!margin) return null;
    const m = parseFloat(margin);
    return <Chip label={`+${margin}% margin`} color={m>=40?'success':m>=20?'warning':'error'} size="small" sx={{ fontWeight:900 }} />;
  };

  /* ════════════════════════════════════ RENDER ════════════════════════════════════ */
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight:900, color:'primary.main', mb:0.5 }}>Inventory Hub</Typography>
        <Typography variant="body1" color="text.secondary">
          Stock control · GRN · Low-stock ordering · Parts &amp; Tires
        </Typography>
      </Box>

      <Tabs
        value={activeTab} onChange={(e,v) => setActiveTab(v)}
        sx={{ mb:4, '& .MuiTabs-indicator':{ height:3, borderRadius:1.5 }, '& .MuiTab-root':{ fontWeight:800, fontSize:'0.9rem', textTransform:'none' } }}
      >
        <Tab icon={<StockIcon />} iconPosition="start" label="Stock Management" value="stock" />
        {isAdmin && <Tab icon={<GRNIcon />} iconPosition="start" label="Log GRN" value="grn" />}
        <Tab icon={<PartsIcon />} iconPosition="start" label="Parts &amp; Consumables" value="parts" />
        <Tab icon={<HotelIcon />} iconPosition="start" label="Tire Hotel" value="hotel" />
      </Tabs>

      {/* ════ STOCK MANAGEMENT ════ */}
      {activeTab === 'stock' && (
        <Box>
          {/* Stats Row */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label:'Total Tires',  value: stats.totalTires,  color:'primary.main',   bg:'rgba(26,35,126,0.06)'   },
              { label:'Total Parts',  value: stats.totalParts,  color:'secondary.main', bg:'rgba(245,0,87,0.06)'    },
              { label:'Low Stock',    value: stats.lowStock,    color:'warning.main',   bg:'rgba(255,152,0,0.08)'   },
              { label:'Out of Stock', value: stats.outOfStock,  color:'error.main',     bg:'rgba(244,67,54,0.08)'   },
            ].map(s => (
              <Grid item xs={6} sm={3} key={s.label}>
                <Card sx={{ borderRadius:4, p:2.5, background:s.bg, cursor: s.label==='Low Stock'||s.label==='Out of Stock' ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (s.label === 'Low Stock')    { setStockFilter('low');  setActiveTab('stock'); }
                    if (s.label === 'Out of Stock') { setStockFilter('out');  setActiveTab('stock'); }
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight:800, opacity:0.6, textTransform:'uppercase' }}>{s.label}</Typography>
                  <Typography variant="h3" sx={{ fontWeight:900, color:s.color, lineHeight:1.1 }}>{s.value}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Filter Bar */}
          <Card sx={{ borderRadius:4, p:3, mb:3 }}>
            <Grid container spacing={2} alignItems="center">
              {/* Search */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth size="small" placeholder="Search inventory..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  InputProps={{ startAdornment:<SearchIcon sx={{color:'text.secondary',mr:1,fontSize:20}}/>, sx:{borderRadius:3} }}
                />
              </Grid>

              {/* View: Tires / Parts / All */}
              <Grid item xs={12} md={3}>
                <ToggleButtonGroup value={inventoryView} exclusive onChange={(_,v)=>v&&setInventoryView(v)} size="small" fullWidth>
                  {[['tires','Tires'],['parts','Parts'],['all','All']].map(([val,lbl])=>(
                    <ToggleButton key={val} value={val} sx={{ fontWeight:800, textTransform:'none', fontSize:'0.8rem' }}>{lbl}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              {/* Stock filter */}
              <Grid item xs={12} md={3}>
                <ToggleButtonGroup value={stockFilter} exclusive onChange={(_,v)=>v&&setStockFilter(v)} size="small" fullWidth>
                  {[['all','All'],['low','Low'],['out','Out']].map(([val,lbl])=>(
                    <ToggleButton key={val} value={val}
                      sx={{ fontWeight:800, textTransform:'none', fontSize:'0.8rem',
                        '&.Mui-selected': { bgcolor: val==='low'?'rgba(255,152,0,0.15)':val==='out'?'rgba(244,67,54,0.15)':'rgba(26,35,126,0.10)', color:'inherit' }
                      }}
                    >{lbl}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              {/* Threshold */}
              <Grid item xs={6} md={1.5}>
                <TextField
                  fullWidth size="small" type="number" label="Low ≤"
                  value={threshold} onChange={e=>setThreshold(parseInt(e.target.value)||1)}
                  InputProps={{ sx:{borderRadius:3} }} inputProps={{ min:1 }}
                />
              </Grid>

              {/* Sort */}
              <Grid item xs={6} md={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort</InputLabel>
                  <Select value={sortBy} label="Sort" onChange={e=>setSortBy(e.target.value)} sx={{borderRadius:3}}>
                    <MenuItem value="brand">Name A–Z</MenuItem>
                    <MenuItem value="stock">Stock ↑</MenuItem>
                    <MenuItem value="price">Price ↑</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Order controls */}
            <Box sx={{ mt:2, display:'flex', gap:2, flexWrap:'wrap', alignItems:'center' }}>
              <Button
                variant="outlined" size="small"
                startIcon={<FilterIcon />}
                onClick={addAllLowStock}
                sx={{ borderRadius:3, fontWeight:800, borderColor:'warning.main', color:'warning.main' }}
              >
                Add All Low-Stock to Order ({allInventory.filter(i=>i.stock<=threshold).length})
              </Button>

              {orderItems.length > 0 && (
                <Badge badgeContent={orderItems.length} color="error">
                  <Button
                    variant="contained" size="small" color="secondary"
                    startIcon={<POIcon />}
                    onClick={() => setIsPOOpen(true)}
                    sx={{ borderRadius:3, fontWeight:900 }}
                  >
                    View Purchase Order
                  </Button>
                </Badge>
              )}

              {orderItems.length > 0 && (
                <Button size="small" color="error" onClick={() => setOrderItems([])} sx={{fontWeight:700}}>
                  Clear Order
                </Button>
              )}
            </Box>
          </Card>

          {/* Main Table */}
          <Card sx={{ borderRadius:4, overflow:'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor:'rgba(26,35,126,0.03)' }}>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell sx={{ fontWeight:900, py:2.5 }}>ITEM</TableCell>
                    <TableCell sx={{ fontWeight:900 }}>TYPE / CAT</TableCell>
                    <TableCell sx={{ fontWeight:900 }}>STOCK STATUS</TableCell>
                    {isAdmin && <TableCell align="right" sx={{ fontWeight:900 }}>SELL PRICE</TableCell>}
                    {isAdmin && <TableCell align="right" sx={{ fontWeight:900 }}>MARGIN</TableCell>}
                    <TableCell align="center" sx={{ fontWeight:900 }}>ORDER</TableCell>
                    {isAdmin && inventoryView !== 'parts' && <TableCell align="right" sx={{ fontWeight:900 }}>ACTIONS</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInventory.map(item => {
                    const margin = item.price > 0 ? (((item.price - item.cost_price) / item.price) * 100) : 0;
                    const inOrder = isInOrder(item);
                    const sc = stockColor(item.stock, threshold);

                    return (
                      <TableRow
                        key={`${item.type}-${item.id}`}
                        hover
                        sx={{
                          bgcolor: item.stock === 0 ? 'rgba(244,67,54,0.03)' : item.stock <= threshold ? 'rgba(255,152,0,0.03)' : 'inherit',
                          '&:hover':{ bgcolor: item.stock === 0 ? 'rgba(244,67,54,0.06)' : item.stock <= threshold ? 'rgba(255,152,0,0.06)' : 'rgba(0,0,0,0.02)' }
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={inOrder}
                            onChange={() => toggleOrderItem(item)}
                            color="secondary"
                            size="small"
                          />
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
                            <Avatar
                              src={item.images?.[0]}
                              sx={{ width:36, height:36, bgcolor:'rgba(26,35,126,0.06)', color:'primary.main', fontWeight:900, borderRadius:2, fontSize:'0.85rem' }}
                            >
                              {item.name?.[0]}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontWeight:900, fontSize:'0.9rem' }}>{item.name}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight:600 }}>{item.label}</Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display:'flex', gap:0.5, flexDirection:'column' }}>
                            <Chip
                              label={item.type.toUpperCase()}
                              size="small"
                              sx={{ fontWeight:900, height:18, fontSize:'0.6rem', width:'fit-content',
                                bgcolor: item.type==='tire'?'rgba(26,35,126,0.1)':'rgba(245,0,87,0.1)',
                                color:   item.type==='tire'?'primary.main':'secondary.main',
                              }}
                            />
                            <Typography variant="caption" sx={{ fontWeight:600, opacity:0.7 }}>{item.category}</Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                            <Box>
                              <Chip
                                label={item.stock === 0 ? '✗ Out of Stock' : `${item.stock} units`}
                                size="small"
                                color={sc}
                                sx={{ fontWeight:900 }}
                              />
                              {item.stock > 0 && item.stock <= threshold && (
                                <Box sx={{ mt:0.5, minWidth:80 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min((item.stock/threshold)*100, 100)}
                                    color="warning"
                                    sx={{ height:3, borderRadius:2 }}
                                  />
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </TableCell>

                        {isAdmin && (
                          <TableCell align="right">
                            <Typography sx={{ fontWeight:900 }}>{item.price.toLocaleString()} {currency}</Typography>
                          </TableCell>
                        )}

                        {isAdmin && (
                          <TableCell align="right">
                            {item.cost_price > 0 ? (
                              <Chip
                                label={`${margin.toFixed(0)}%`}
                                size="small"
                                color={margin>=40?'success':margin>=20?'warning':'error'}
                                sx={{ fontWeight:900 }}
                              />
                            ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                        )}

                        <TableCell align="center">
                          <Tooltip title={inOrder ? 'Remove from order' : 'Add to purchase order'}>
                            <Button
                              size="small"
                              variant={inOrder ? 'contained' : 'outlined'}
                              color={inOrder ? 'secondary' : 'primary'}
                              onClick={() => toggleOrderItem(item)}
                              sx={{ minWidth:28, px:1.5, py:0.5, borderRadius:2, fontWeight:900, fontSize:'0.7rem' }}
                            >
                              {inOrder ? '✓ Added' : '+ Order'}
                            </Button>
                          </Tooltip>
                        </TableCell>

                        {isAdmin && inventoryView !== 'parts' && (
                          <TableCell align="right">
                            {item.type === 'tire' && item.name.startsWith('Trade-in') && (
                              <IconButton color="error" size="small" onClick={() => handleDeleteTire(item.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}

                  {filteredInventory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py:8, color:'text.secondary', fontWeight:600 }}>
                        {stockFilter === 'low' ? '🎉 No low-stock items — inventory is healthy!' :
                         stockFilter === 'out' ? '✅ No out-of-stock items!' :
                         'No inventory found. Use Log GRN to add items.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {/* ════ GRN ════ */}
      {activeTab === 'grn' && isAdmin && (
        <Box>
          {/* GRN type toggle */}
          <Box sx={{ mb:4, display:'flex', justifyContent:'center' }}>
            <ToggleButtonGroup value={grnType} exclusive onChange={(_,v)=>v&&setGrnType(v)}
              sx={{ gap:1, '& .MuiToggleButton-root':{ fontWeight:800,px:4,py:1.5,borderRadius:'12px !important',textTransform:'none',fontSize:'0.95rem' }, '& .Mui-selected':{ background:'linear-gradient(135deg,#1a237e,#311b92) !important',color:'#fff !important' } }}
            >
              <ToggleButton value="tire"><TireIcon sx={{mr:1}}/>Tire GRN</ToggleButton>
              <ToggleButton value="parts"><CategoryIcon sx={{mr:1}}/>Spare Parts GRN</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* TIRE GRN */}
          {grnType === 'tire' && (
            <Grid container justifyContent="center">
              <Grid item xs={12} md={9}>
                <Card sx={{ borderRadius:4, p:4 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:2, mb:2 }}>
                    <Avatar sx={{ bgcolor:'primary.main', width:48, height:48 }}><TireIcon /></Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight:900 }}>Tire — Goods Received Note</Typography>
                      <Typography variant="body2" color="text.secondary">Matching stock is auto-restocked; new items go live in POS immediately.</Typography>
                    </Box>
                  </Box>
                  <Alert severity="info" sx={{ mb:3, borderRadius:3, fontWeight:600 }}>
                    Smart restock: same Brand + Size + Model + Vehicle type → stock is added automatically.
                  </Alert>

                  <Box sx={{ mb: 3 }}>
                    <Autocomplete
                      options={tires}
                      getOptionLabel={(option) => `${option.brand || ''} ${option.model || ''} - ${option.size || ''}`.trim()}
                      onChange={(e, v) => {
                        if (v) {
                          setGrnData({
                            ...grnData,
                            brand: v.brand || '',
                            model: v.model || '',
                            size: v.size || '',
                            tire_category: v.tire_category || 'New',
                            vehicle_type: v.vehicle_type || '',
                            dot_code: v.dot_code || '',
                            origin: v.origin || '',
                            thread_pattern: v.thread_pattern || '',
                            cost_price: v.cost_price || '',
                            price: v.price || ''
                          });
                        }
                      }}
                      renderInput={(params) => <TextField {...params} label="⚡ Fast Restock: Select Existing Tire" variant="outlined" helperText="Auto-fills the form below to prevent spelling mistakes and duplicates" />}
                    />
                  </Box>

                  <form onSubmit={handleGRNSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <Autocomplete options={tireBrands} freeSolo
                          renderInput={p=><TextField {...p} label="Brand / Manufacturer *" variant="outlined" required />}
                          value={grnData.brand}
                          onChange={(_,v)=>setGrnData({...grnData,brand:v||''})}
                          onInputChange={(_,v)=>setGrnData({...grnData,brand:v})}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Tire Size (e.g. 195/65 R15) *" value={grnData.size} onChange={e=>setGrnData({...grnData,size:e.target.value})} required />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Model / Pattern" value={grnData.model} onChange={e=>setGrnData({...grnData,model:e.target.value})} placeholder="e.g. Dueler H/T" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Tire Classification</InputLabel>
                          <Select value={grnData.tire_category} label="Tire Classification" onChange={e=>setGrnData({...grnData,tire_category:e.target.value})}>
                            {['New','Reconditioned','Run-Flat','Winter','Off-Road','Commercial'].map(c=><MenuItem key={c} value={c}>{c}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Autocomplete options={vehicleTypes} freeSolo
                          renderInput={p=><TextField {...p} label="Vehicle Type" />}
                          value={grnData.vehicle_type}
                          onChange={(_,v)=>setGrnData({...grnData,vehicle_type:v||''})}
                          onInputChange={(_,v)=>setGrnData({...grnData,vehicle_type:v})}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="Country of Origin" value={grnData.origin} onChange={e=>setGrnData({...grnData,origin:e.target.value})} placeholder="e.g. Japan" />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth label="DOT Code" value={grnData.dot_code} onChange={e=>setGrnData({...grnData,dot_code:e.target.value})} placeholder="e.g. DOT XXXX 4523" />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth type="number" label="Quantity Received *" value={grnData.stock} onChange={e=>setGrnData({...grnData,stock:e.target.value})} required inputProps={{min:1}} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth type="number" label={`Cost Price (${currency})`} value={grnData.cost_price} onChange={e=>setGrnData({...grnData,cost_price:e.target.value})} inputProps={{min:0,step:0.01}} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth type="number" label={`Sell Price (${currency})`} value={grnData.price} onChange={e=>setGrnData({...grnData,price:e.target.value})} inputProps={{min:0,step:0.01}} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Thread / Tread Pattern" value={grnData.thread_pattern} onChange={e=>setGrnData({...grnData,thread_pattern:e.target.value})} placeholder="e.g. Asymmetric, Directional" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ border:'2px dashed rgba(0,0,0,0.12)',borderRadius:2,p:1.5,height:'100%',display:'flex',alignItems:'center',justifyContent:'center',minHeight:56 }}>
                          <input accept="image/*" style={{display:'none'}} id="grn-img" type="file" onChange={e=>setSelectedFile(e.target.files[0])} />
                          <label htmlFor="grn-img" style={{width:'100%'}}>
                            <Button component="span" fullWidth startIcon={<PhotoIcon color={selectedFile?'success':'action'} />} sx={{textTransform:'none',fontWeight:700}}>
                              {selectedFile ? (selectedFile.name.length>22?selectedFile.name.slice(0,22)+'...':selectedFile.name) : 'Attach Product Photo'}
                            </Button>
                          </label>
                        </Box>
                      </Grid>
                      {tireMargin && grnData.cost_price > 0 && (
                        <Grid item xs={12}>
                          <Box sx={{p:2.5,borderRadius:3,bgcolor:'rgba(76,175,80,0.05)',border:'1px solid rgba(76,175,80,0.2)',display:'flex',gap:3,flexWrap:'wrap',alignItems:'center'}}>
                            <MarginIcon sx={{color:'success.main'}}/> 
                            <Box>
                              <Typography variant="caption" sx={{fontWeight:800,color:'success.main',textTransform:'uppercase'}}>Profit Preview</Typography>
                              <Typography variant="body2" sx={{fontWeight:900}}>
                                +{(parseFloat(grnData.price||0)-parseFloat(grnData.cost_price||0)).toLocaleString()} {currency} / unit &nbsp;·&nbsp; <MarginChip margin={tireMargin}/>
                              </Typography>
                            </Box>
                            {grnData.stock > 0 && (
                              <Box>
                                <Typography variant="caption" sx={{fontWeight:800,opacity:0.6,textTransform:'uppercase'}}>Batch</Typography>
                                <Typography variant="body2" sx={{fontWeight:900,color:'success.main'}}>
                                  +{((parseFloat(grnData.price||0)-parseFloat(grnData.cost_price||0))*parseInt(grnData.stock||0)).toLocaleString()} {currency}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Divider sx={{my:1}}/>
                        <Button variant="contained" fullWidth size="large" type="submit" disabled={uploading} sx={{py:2,borderRadius:3,fontWeight:900,mt:1}} startIcon={<GRNIcon/>}>
                          {uploading ? 'Uploading...' : 'COMMIT TIRE GRN — UPDATE STOCK & POS'}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* PARTS GRN */}
          {grnType === 'parts' && (
            <Grid container justifyContent="center">
              <Grid item xs={12} md={9}>
                <Card sx={{ borderRadius:4, p:4 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:2, mb:2 }}>
                    <Avatar sx={{ bgcolor:'secondary.main', width:48, height:48 }}><CategoryIcon /></Avatar>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight:900 }}>Spare Parts — Goods Received Note</Typography>
                      <Typography variant="body2" color="text.secondary">Any part or consumable — appears in POS Parts &amp; All tabs instantly.</Typography>
                    </Box>
                  </Box>
                  <Alert severity="info" sx={{ mb:3, borderRadius:3, fontWeight:600 }}>
                    Same name + category → stock is added. New item → created and live in POS.
                  </Alert>

                  <Box sx={{ mb: 3 }}>
                    <Autocomplete
                      options={parts}
                      getOptionLabel={(option) => `${option.name || ''} (${option.category || ''})`}
                      onChange={(e, v) => {
                        if (v) {
                          setPartGrn({
                            ...partGrn,
                            name: v.name || '',
                            category: v.category || 'Consumable',
                            cost_price: v.cost_price || '',
                            price: v.price || '',
                            supplier: v.supplier || '',
                            notes: v.notes || ''
                          });
                        }
                      }}
                      renderInput={(params) => <TextField {...params} label="⚡ Fast Restock: Select Existing Part" variant="outlined" helperText="Auto-fills the form below to prevent spelling mistakes and duplicates" />}
                    />
                  </Box>

                  <form onSubmit={handlePartGRNSubmit}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Part / Item Name *" value={partGrn.name} onChange={e=>setPartGrn({...partGrn,name:e.target.value})} required placeholder="e.g. Air Filter, Brake Pad" />
                      </Grid>
                      <Grid item xs={12} sm={partGrn.category==='Custom'?3:6}>
                        <FormControl fullWidth>
                          <InputLabel>Category *</InputLabel>
                          <Select value={partGrn.category} label="Category *" onChange={e=>setPartGrn({...partGrn,category:e.target.value,customCategory:''})}>
                            {PART_CATEGORIES.map(c=><MenuItem key={c} value={c}>{c}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>
                      {partGrn.category === 'Custom' && (
                        <Grid item xs={12} sm={3}>
                          <TextField fullWidth label="Custom Category *" value={partGrn.customCategory} onChange={e=>setPartGrn({...partGrn,customCategory:e.target.value})} required placeholder="e.g. Valve Stem" />
                        </Grid>
                      )}
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth type="number" label="Quantity *" value={partGrn.stock} onChange={e=>setPartGrn({...partGrn,stock:e.target.value})} required inputProps={{min:1}} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth type="number" label={`Cost Price (${currency})`} value={partGrn.cost_price} onChange={e=>setPartGrn({...partGrn,cost_price:e.target.value})} helperText="Supplier price" inputProps={{min:0,step:0.01}} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField fullWidth type="number" label={`Sell Price (${currency}) *`} value={partGrn.price} onChange={e=>setPartGrn({...partGrn,price:e.target.value})} required helperText="POS price" inputProps={{min:0,step:0.01}} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Supplier / Source" value={partGrn.supplier} onChange={e=>setPartGrn({...partGrn,supplier:e.target.value})} placeholder="Optional" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth label="Notes / Part Number" value={partGrn.notes} onChange={e=>setPartGrn({...partGrn,notes:e.target.value})} placeholder="OEM ref, serial, etc." />
                      </Grid>
                      {partMargin && partGrn.cost_price > 0 && (
                        <Grid item xs={12}>
                          <Box sx={{p:2.5,borderRadius:3,bgcolor:'rgba(76,175,80,0.05)',border:'1px solid rgba(76,175,80,0.2)',display:'flex',gap:3,flexWrap:'wrap',alignItems:'center'}}>
                            <MarginIcon sx={{color:'success.main'}}/>
                            <Box>
                              <Typography variant="caption" sx={{fontWeight:800,color:'success.main',textTransform:'uppercase'}}>Profit Preview</Typography>
                              <Typography variant="body2" sx={{fontWeight:900}}>
                                +{(parseFloat(partGrn.price||0)-parseFloat(partGrn.cost_price||0)).toLocaleString()} {currency} / unit &nbsp;·&nbsp; <MarginChip margin={partMargin}/>
                              </Typography>
                            </Box>
                            {partGrn.stock > 0 && (
                              <Box>
                                <Typography variant="caption" sx={{fontWeight:800,opacity:0.6,textTransform:'uppercase'}}>Batch</Typography>
                                <Typography variant="body2" sx={{fontWeight:900,color:'success.main'}}>
                                  +{((parseFloat(partGrn.price||0)-parseFloat(partGrn.cost_price||0))*parseInt(partGrn.stock||0)).toLocaleString()} {currency}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Divider sx={{my:1}}/>
                        <Button variant="contained" color="secondary" fullWidth size="large" type="submit" disabled={partSaving} sx={{py:2,borderRadius:3,fontWeight:900,mt:1}} startIcon={<CategoryIcon/>}>
                          {partSaving ? 'Saving...' : 'COMMIT PARTS GRN — ADD TO INVENTORY & POS'}
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 'parts' && <PartsInventory partsProps={parts} businessProfile={businessProfile} />}
      {activeTab === 'hotel' && <TireHotel hotelTiresProps={hotelTires} businessProfile={businessProfile} />}

      {/* ════ PURCHASE ORDER DIALOG ════ */}
      <Dialog open={isPOOpen} onClose={()=>setIsPOOpen(false)} maxWidth="md" fullWidth PaperProps={{sx:{borderRadius:4}}}>
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(0,0,0,0.08)', pb:2 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <POIcon color="primary" />
            <Box>
              <Typography sx={{ fontWeight:900 }}>Purchase Order Builder</Typography>
              <Typography variant="caption" color="text.secondary">{orderItems.length} items · {orderItems.reduce((s,o)=>s+o.orderQty,0)} total units</Typography>
            </Box>
          </Box>
          <IconButton onClick={()=>setIsPOOpen(false)} size="small"><CloseIcon/></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt:3 }}>
          <Grid container spacing={3} sx={{ mb:3 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Supplier / Vendor Name" value={poSupplier} onChange={e=>setPoSupplier(e.target.value)} placeholder="e.g. ABC Tire Wholesale" InputProps={{sx:{borderRadius:2}}} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Notes / Instructions" value={poNotes} onChange={e=>setPoNotes(e.target.value)} placeholder="Delivery deadline, payment terms..." InputProps={{sx:{borderRadius:2}}} />
            </Grid>
          </Grid>

          <Card variant="outlined" sx={{ borderRadius:3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor:'rgba(26,35,126,0.03)' }}>
                  <TableCell sx={{fontWeight:900}}>ITEM</TableCell>
                  <TableCell align="center" sx={{fontWeight:900}}>CURRENT STOCK</TableCell>
                  <TableCell align="center" sx={{fontWeight:900,minWidth:140}}>ORDER QTY</TableCell>
                  <TableCell align="center" sx={{fontWeight:900}}>REMOVE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderItems.map(item=>(
                  <TableRow key={`${item.type}-${item.id}`} hover>
                    <TableCell>
                      <Typography sx={{fontWeight:800,fontSize:'0.9rem'}}>{item.name}</Typography>
                      <Box sx={{display:'flex',gap:0.5,mt:0.3}}>
                        <Chip label={item.type.toUpperCase()} size="small" sx={{height:16,fontSize:'0.6rem',fontWeight:900,
                          bgcolor:item.type==='tire'?'rgba(26,35,126,0.08)':'rgba(245,0,87,0.08)',
                          color:item.type==='tire'?'primary.main':'secondary.main'}} />
                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={item.currentStock===0?'Out of Stock':item.currentStock+' units'} size="small"
                        color={item.currentStock===0?'error':item.currentStock<=threshold?'warning':'success'}
                        sx={{fontWeight:900}} />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{display:'flex',alignItems:'center',justifyContent:'center',gap:1}}>
                        <IconButton size="small" onClick={()=>updateOrderQty(item.id,item.type,-1)} sx={{bgcolor:'rgba(0,0,0,0.04)',borderRadius:1.5}}>
                          <RemoveIcon sx={{fontSize:16}}/>
                        </IconButton>
                        <Typography sx={{fontWeight:900,fontSize:'1.1rem',minWidth:32,textAlign:'center'}}>{item.orderQty}</Typography>
                        <IconButton size="small" onClick={()=>updateOrderQty(item.id,item.type,+1)} sx={{bgcolor:'rgba(0,0,0,0.04)',borderRadius:1.5}}>
                          <AddIcon sx={{fontSize:16}}/>
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={()=>setOrderItems(prev=>prev.filter(o=>!(o.id===item.id&&o.type===item.type)))}>
                        <CloseIcon sx={{fontSize:16}}/>
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Box sx={{ mt:2, p:2, borderRadius:3, bgcolor:'rgba(26,35,126,0.04)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:2 }}>
            <Typography sx={{ fontWeight:700, color:'text.secondary' }}>Total Lines: <strong>{orderItems.length}</strong></Typography>
            <Typography sx={{ fontWeight:700, color:'text.secondary' }}>Total Units to Order: <strong style={{color:'#1a237e',fontSize:'1.1rem'}}>{orderItems.reduce((s,o)=>s+o.orderQty,0)}</strong></Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p:3, borderTop:'1px solid rgba(0,0,0,0.06)', gap:1, flexWrap:'wrap' }}>
          <Button onClick={handleCopyPO} startIcon={<CopyIcon/>} variant="outlined" sx={{borderRadius:2,fontWeight:800}}>
            Copy to Clipboard
          </Button>
          <Box sx={{ flexGrow:1 }} />
          <Button onClick={()=>setIsPOOpen(false)} sx={{fontWeight:700}}>Close</Button>
          <Button onClick={handlePrintPO} variant="contained" startIcon={<PrintIcon/>} sx={{borderRadius:2,fontWeight:900,px:4}}>
            Print / Save PDF
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={6000} onClose={()=>setAlert({...alert,open:false})}>
        <Alert severity={alert.severity} sx={{borderRadius:3,fontWeight:700}}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TireList;
