import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  TextField, Typography, Snackbar, Button, Box, Grid, Select,
  MenuItem, FormControl, InputLabel, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Divider, Autocomplete,
  Avatar, Card, Tab, Tabs, Alert, IconButton, ToggleButton,
  ToggleButtonGroup, Checkbox, Dialog, DialogTitle, DialogContent,
  DialogActions, Tooltip, Badge, LinearProgress, Paper, useMediaQuery
} from '@mui/material';
import {
  Search as SearchIcon,
  LocalShipping as GRNIcon, Inventory2 as StockIcon,
  Build as PartsIcon, Hotel as HotelIcon, Delete as DeleteIcon,
  AddPhotoAlternate as PhotoIcon, TireRepair as TireIcon,
  Category as CategoryIcon, TrendingUp as MarginIcon,
  Assignment as POIcon, Print as PrintIcon, Add as AddIcon,
  Remove as RemoveIcon, FilterList as FilterIcon,
  ContentCopy as CopyIcon, Close as CloseIcon, AssignmentReturn as ReturnIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import PartsInventory from './PartsInventory';
import TireHotel from './TireHotel';

/* â”€â”€â”€ Part category presets â”€â”€â”€ */
const PART_CATEGORIES = [
  'Consumable','Spare Part','Lubricant','Filter',
  'Battery','Electrical','Brake Parts','Suspension',
  'Body Parts','Tool','Chemical','Other','Custom',
];

/* â”€â”€â”€ colour helpers â”€â”€â”€ */
const stockColor = (qty, threshold) => {
  if (qty === 0) return 'error';
  if (qty <= threshold) return 'warning';
  return 'success';
};

const TireList = ({
  tires = [], parts = [], hotelTires = [],
  addTire, updateTire, deleteTire,
  masterData, businessProfile, suppliers = [], recordAudit,
  addBulkGRN, processStockReturn
}) => {
  const { isAdmin } = useAuth();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [activeTab, setActiveTab]       = useState('stock');
  const [grnType,   setGrnType]         = useState('tire');
  const [searchTerm, setSearchTerm]     = useState('');
  const [sortBy, setSortBy]             = useState('brand');
  const [alert, setAlert]               = useState({ open: false, message: '', severity: 'success' });

  /* â”€â”€ Stock filters â”€â”€ */
  const [inventoryView,  setInventoryView]  = useState('tires'); // tires|parts|all
  const [stockFilter,    setStockFilter]    = useState('all');   // all|low|out
  const [threshold,      setThreshold]      = useState(10);

  /* â”€â”€ Order Note â”€â”€ */
  const [orderItems,     setOrderItems]     = useState([]);      // { id, type, name, currentStock, orderQty }
  const [isPOOpen,       setIsPOOpen]       = useState(false);
  const [poNotes,        setPoNotes]        = useState('');
  const [poSupplier,     setPoSupplier]     = useState('');

  /* â”€â”€ Lot aging data from DB â”€â”€ */
  const [lotAging, setLotAging] = useState([]); // from v_stock_aging view

  useEffect(() => {
    supabase.from('v_stock_aging').select('*').then(({ data }) => {
      if (data) setLotAging(data);
    });
  }, [tires]);

  /* â”€â”€ Tire GRN state â”€â”€ */
  const [grnData, setGrnData] = useState({
    brand:'',model:'',size:'',tire_category:'New',
    stock:'',cost_price:'',price:'',vehicle_type:'',
    dot_code:'',manufacture_date:'',origin:'',thread_pattern:'',
    supplier_id: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading,    setUploading]    = useState(false);

  /* â”€â”€ Parts GRN state â”€â”€ */
  const [partGrn, setPartGrn] = useState({
    name:'',category:'Consumable',customCategory:'',
    stock:'',cost_price:'',price:'',supplier_id:'',notes:'',
  });
  /* â”€â”€ Bulk GRN state â”€â”€ */
  const [grnItems, setGrnItems] = useState([]); // Array of tires/parts for bulk submission
  const [grnReference, setGrnReference] = useState('');
  const [grnNotes, setGrnNotes] = useState('');
  const [isFinalizingGRN, setIsFinalizingGRN] = useState(false);
 
  /* â”€â”€ Returns state â”€â”€ */
  const [returnData, setReturnData] = useState({
    supplier_id: '',
    type: 'tire', // tire|part
    tire_id: '',
    part_id: '',
    quantity: 1,
    reason: ''
  });

  const tireBrands   = masterData?.brands   || [];
  const vehicleTypes = masterData?.vehicles || [];
  const currency     = businessProfile?.currency || 'LKR';

  /* â”€â”€ DOT Code live parser â”€â”€ */
  const parseDotCode = (dot) => {
    if (!dot || dot.trim().length < 4) return null;
    const clean = dot.trim().replace(/[^0-9]/g, '');
    if (clean.length < 4) return null;
    const week = parseInt(clean.substring(0, 2));
    const yr2  = parseInt(clean.substring(2, 4));
    if (week < 1 || week > 53) return null;
    const year = yr2 < 50 ? 2000 + yr2 : 1900 + yr2;
    const d = new Date(year, 0, 1);
    d.setDate(d.getDate() + (week - 1) * 7);
    return d;
  };

  const dotPreview = parseDotCode(grnData.dot_code);
  const dotAgeYears = dotPreview
    ? ((Date.now() - dotPreview.getTime()) / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1)
    : null;

  /* â”€â”€ Age helpers for inventory table â”€â”€ */
  const getOldestLotForTire = (tireId) => {
    const lots = lotAging.filter(l => l.tire_id === tireId);
    if (!lots.length) return null;
    return lots.reduce((oldest, l) => {
      if (!oldest) return l;
      if (!l.manufacture_date) return oldest;
      if (!oldest.manufacture_date) return l;
      return new Date(l.manufacture_date) < new Date(oldest.manufacture_date) ? l : oldest;
    }, null);
  };

  const ageStatusColor = (status) => {
    if (status === 'Expired')      return { bg: '#ffebee', color: '#c62828', icon: 'ðŸ”´' };
    if (status === 'Critical')     return { bg: '#fff3e0', color: '#e65100', icon: 'ðŸŸ ' };
    if (status === 'Expiring Soon') return { bg: '#fffde7', color: '#f57f17', icon: 'ðŸŸ¡' };
    if (status === 'Healthy')      return null;
    return { bg: '#f5f5f5', color: '#757575', icon: 'âšª' };
  };

  /* â”€â”€â”€ image compression â”€â”€â”€ */
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

  /* â”€â”€â”€ Tire GRN â”€â”€â”€ */
  const handleGRNSubmit = async (e) => {
    e.preventDefault();
    if (!grnData.brand || !grnData.size || !grnData.stock) {
      setAlert({ open:true, message:'Complete all required fields.', severity:'error' }); return;
    }

    setUploading(true);
    let imageUrls = grnData.images || [];

    try {
      if (selectedFile) {
        const compressed = await compressImage(selectedFile);
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `grn/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('tires')
          .upload(filePath, compressed);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('tires')
          .getPublicUrl(filePath);
        
        imageUrls = [publicUrl, ...imageUrls];
      }

      // Resolve manufacture date: prefer manual date, else derive from DOT
      let resolvedMfgDate = grnData.manufacture_date || '';
      if (!resolvedMfgDate && grnData.dot_code) {
        const parsed = parseDotCode(grnData.dot_code);
        if (parsed) resolvedMfgDate = parsed.toISOString().split('T')[0];
      }

      const newItem = {
        ...grnData,
        type: 'tire',
        id: `tire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        quantity: parseInt(grnData.stock),
        cost_price: parseFloat(grnData.cost_price || 0),
        price: parseFloat(grnData.price || 0),
        label: `${grnData.brand} ${grnData.size} (${grnData.model || 'No Model'})`,
        images: imageUrls,
        thread_pattern: grnData.thread_pattern || '',
        origin: grnData.origin || '',
        dot_code: grnData.dot_code || '',
        manufacture_date: resolvedMfgDate,
      };

      setGrnItems(prev => [...prev, newItem]);
      setAlert({ open: true, message: `✅ Added to GRN list${resolvedMfgDate ? ` (Mfg: ${resolvedMfgDate})` : ''}`, severity: 'success' });
      
      // Reset form
      setGrnData({
        brand:'', model:'', size:'', tire_category:'New',
        stock:'', cost_price:'', price:'', vehicle_type:'',
        dot_code:'', manufacture_date:'', origin:'', thread_pattern:'',
        supplier_id: grnData.supplier_id
      });
      setSelectedFile(null);
    } catch (err) {
      console.error('Error in GRN submission:', err);
      setAlert({ open: true, message: 'Failed to process item: ' + err.message, severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  /* â”€â”€â”€ Parts GRN â”€â”€â”€ */
  const handlePartGRNSubmit = async (e) => {
    e.preventDefault();
    if (!partGrn.name || !partGrn.stock || !partGrn.price) {
      setAlert({ open:true, message:'Name, Quantity and Sell Price required.', severity:'error' }); return;
    }

    const finalCat = partGrn.category === 'Custom' ? (partGrn.customCategory||'Custom') : partGrn.category;
    
    const newItem = {
      ...partGrn,
      type: 'part',
      category: finalCat,
      id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      quantity: parseInt(partGrn.stock),
      cost_price: parseFloat(partGrn.cost_price || 0),
      price: parseFloat(partGrn.price || 0),
      label: `${partGrn.name} (${finalCat})`
    };

    setGrnItems(prev => [...prev, newItem]);
    setAlert({ open: true, message: 'Added to GRN list', severity: 'success' });
    setPartGrn({ 
      name:'', category:'Consumable', customCategory:'', 
      stock:'', cost_price:'', price:'', 
      supplier_id: partGrn.supplier_id, notes:'' 
    });
  };

  const finalizeBulkGRN = async () => {
    if (grnItems.length === 0) return;
    if (!grnItems[0].supplier_id) {
      setAlert({ open: true, message: 'Please select a supplier for the items', severity: 'error' });
      return;
    }

    setIsFinalizingGRN(true);
    try {
      const result = await addBulkGRN({
        supplier_id: grnItems[0].supplier_id,
        reference_number: grnReference,
        notes: grnNotes,
        items: grnItems
      });

      if (result.success) {
        setAlert({ open: true, message: '✅ Bulk GRN processed successfully!', severity: 'success' });
        setGrnItems([]);
        setGrnReference('');
        setGrnNotes('');
        setActiveTab('stock');
      } else {
        throw new Error(result.error || 'Failed to process GRN');
      }
    } catch (err) {
      setAlert({ open: true, message: 'Error: ' + err.message, severity: 'error' });
    } finally {
      setIsFinalizingGRN(false);
    }
  };

  const handleDeleteTire = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try { await deleteTire(id); setAlert({ open:true, message:'Deleted.', severity:'info' }); }
    catch  { setAlert({ open:true, message:'Delete failed.',  severity:'error' }); }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnData.supplier_id || !returnData.quantity || (!returnData.tire_id && !returnData.part_id)) {
      setAlert({ open:true, message:'Supplier, Item and Quantity are required.', severity:'error' }); return;
    }

    try {
      const result = await processStockReturn({
        supplier_id: returnData.supplier_id,
        type: returnData.type,
        item_id: returnData.type === 'tire' ? returnData.tire_id : returnData.part_id,
        quantity: returnData.quantity,
        reason: returnData.reason
      });

      if (result.success) {
        setAlert({ open:true, message:'✅ Return processed atomically and ledger updated.', severity:'success' });
        setReturnData({ supplier_id:'', type:'tire', tire_id:'', part_id:'', quantity:1, reason:'' });
        setActiveTab('stock');
      } else {
        throw new Error(result.error || 'Failed to process return');
      }
    } catch(err) {
      setAlert({ open:true, message:'Failed: '+err.message, severity:'error' });
    }
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

  /* ─── Combined inventory list ─── */
  const allInventory = useMemo(() => {
    const tireRows = tires.map(t => ({
      id: t.id, type: 'tire',
      name:  `${t.brand} ${t.model || ''} ${t.size}`.replace(/\s+/g, ' ').trim(),
      label: `${t.vehicle_type ? t.vehicle_type : ''}`.trim(),
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
        if (stockFilter === 'expired') {
          const oldest = getOldestLotForTire(item.id);
          return oldest && oldest.age_status === 'Expired';
        }
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

  /* â”€â”€â”€ Stats â”€â”€â”€ */
  const stats = useMemo(() => {
    const expiredLots = lotAging.filter(l => l.age_status === 'Expired');
    const expiredUnits = expiredLots.reduce((sum, l) => sum + parseInt(l.current_qty || 0), 0);

    return {
      totalTires:  tires.length,
      totalParts:  parts.length,
      lowStock:    allInventory.filter(i => i.stock > 0 && i.stock <= threshold).length,
      outOfStock:  allInventory.filter(i => i.stock === 0).length,
      expiredStock: expiredUnits,
      totalValue:  allInventory.reduce((s,i)=>s+(i.stock*i.price),0),
    };
  }, [allInventory, threshold, tires, parts, lotAging]);

  /* â”€â”€â”€ Order Note helpers â”€â”€â”€ */
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

  /* â”€â”€â”€ Purchase Order Print â”€â”€â”€ */
  const handlePrintPO = () => {
    const businessName = businessProfile?.name || 'Our Business';
    const businessAddr = businessProfile?.address || '';
    const today = new Date().toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' });
    const poNumber = 'PO-' + Date.now().toString().slice(-8);

    const rows = orderItems.map(item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;">
          <strong>${item.name}</strong><br/>
          <span style="font-size:11px;color:#666;">${item.label} • ${item.type.toUpperCase()}</span>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;">${item.currentStock}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-weight:900;color:#1a237e;">${item.orderQty}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html><html>
      <head>
        <title>Purchase Order - ${poNumber}</title>
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
          <div class="meta-block"><label>Supplier</label><span>${poSupplier || '- Not specified -'}</span></div>
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
          Generated by ${businessName} • ${today} • Ref: ${poNumber}<br/>
          Please confirm receipt and delivery timeline.
        </div>

        <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),800);}</script>
      </body></html>
    `;
    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
  };


  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• RENDER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      <Box sx={{ mb: isMobile ? 2 : 4 }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight:900, color:'primary.main', mb:0.5 }}>Inventory Hub</Typography>
        {!isMobile && <Typography variant="body1" color="text.secondary">
          Stock control • GRN • Low-stock ordering • Parts &amp; Tires
        </Typography>}
      </Box>

      <Tabs
        value={activeTab} 
        onChange={(e,v) => setActiveTab(v)}
        variant={isMobile ? "scrollable" : "standard"}
        scrollButtons={isMobile ? "auto" : false}
        sx={{ mb:4, '& .MuiTabs-indicator':{ height:3, borderRadius:1.5 }, '& .MuiTab-root':{ fontWeight:800, fontSize: isMobile ? '0.85rem' : '0.9rem', textTransform:'none' } }}
      >
        <Tab icon={<StockIcon />} iconPosition="start" label={isMobile ? "Stock" : "Stock Management"} value="stock" />
        {isAdmin && <Tab icon={<GRNIcon />} iconPosition="start" label={isMobile ? "GRN" : "Log GRN"} value="grn" />}
        <Tab icon={<PartsIcon />} iconPosition="start" label={isMobile ? "Parts" : "Parts & Consumables"} value="parts" />
        <Tab icon={<HotelIcon />} iconPosition="start" label={isMobile ? "Hotel" : "Tire Hotel"} value="hotel" />
        {isAdmin && <Tab icon={<ReturnIcon />} iconPosition="start" label={isMobile ? "Returns" : "Stock Returns"} value="returns" />}
      </Tabs>

      {/* â•â•â•â• STOCK MANAGEMENT â•â•â•â• */}
      {activeTab === 'stock' && (
        <Box>
          {/* Stats Row */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            mb: 3, 
            overflowX: isMobile ? 'auto' : 'visible',
            pb: isMobile ? 1 : 0,
            width: isMobile ? 'calc(100% + 0px)' : '100%',
            '&::-webkit-scrollbar': { display: 'none' }
          }}>
            {[
              { label:'Total Tires',  value: stats.totalTires,  color:'primary.main',   bg:'rgba(26,35,126,0.06)'   },
              { label:'Total Parts',  value: stats.totalParts,  color:'secondary.main', bg:'rgba(245,0,87,0.06)'    },
              { label:'Low Stock',    value: stats.lowStock,    color:'warning.main',   bg:'rgba(255,152,0,0.08)'   },
              { label:'Out of Stock', value: stats.outOfStock,  color:'error.main',     bg:'rgba(244,67,54,0.08)'   },
              { label:'Expired Stock', value: stats.expiredStock, color:'#c62828',       bg:'rgba(198,40,40,0.08)'   },
            ].map(s => (
              <Card key={s.label} sx={{ 
                minWidth: isMobile ? 130 : 'auto', 
                flex: isMobile ? '0 0 auto' : 1,
                borderRadius: 4, 
                p: isMobile ? 2 : 2.5, 
                background: s.bg, 
                cursor: s.label==='Low Stock'||s.label==='Out of Stock'||s.label==='Expired Stock' ? 'pointer' : 'default',
                border: '1px solid rgba(0,0,0,0.03)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
                onClick={() => {
                  if (s.label === 'Low Stock')     { setStockFilter('low');     setActiveTab('stock'); }
                  if (s.label === 'Out of Stock')  { setStockFilter('out');     setActiveTab('stock'); }
                  if (s.label === 'Expired Stock') { setStockFilter('expired'); setActiveTab('stock'); }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', fontSize: '0.6rem', display: 'block', mb: 0.5 }}>{s.label}</Typography>
                <Typography variant={isMobile ? "h5" : "h3"} sx={{ fontWeight: 900, color: s.color, lineHeight: 1.1 }}>{s.value}</Typography>
              </Card>
            ))}
          </Box>

          {/* Filter Bar */}
          <Card sx={{ borderRadius:4, p: isMobile ? 1.5 : 3, mb: 3 }}>
            <Grid container spacing={isMobile ? 1.5 : 2} alignItems="center">
              {/* Search */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth size="small" placeholder="Search inventory..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  InputProps={{ startAdornment:<SearchIcon sx={{color:'text.secondary',mr:1,fontSize:20}}/>, sx:{borderRadius:3} }}
                />
              </Grid>

              {/* View: Tires / Parts / All */}
              <Grid item xs={12} sm={6} md={3}>
                <ToggleButtonGroup value={inventoryView} exclusive onChange={(_,v)=>v&&setInventoryView(v)} size="small" fullWidth sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  {[['tires','Tires'],['parts','Parts'],['all','All']].map(([val,lbl])=>(
                    <ToggleButton key={val} value={val} sx={{ fontWeight:800, textTransform:'none', fontSize: isMobile ? '0.75rem' : '0.8rem', flex: 1 }}>{lbl}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              {/* Stock filter */}
              <Grid item xs={12} sm={6} md={3}>
                <ToggleButtonGroup value={stockFilter} exclusive onChange={(_,v)=>v&&setStockFilter(v)} size="small" fullWidth sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  {[['all','All'],['low','Low'],['out','Out'],['expired','Exp']].map(([val,lbl])=>(
                    <ToggleButton key={val} value={val}
                      sx={{ fontWeight:800, textTransform:'none', fontSize: isMobile ? '0.75rem' : '0.8rem', flex: 1,
                        '&.Mui-selected': { bgcolor: val==='low'?'rgba(255,152,0,0.15)':val==='out'?'rgba(244,67,54,0.15)':val==='expired'?'rgba(198,40,40,0.15)':'rgba(26,35,126,0.10)', color:'inherit' }
                      }}
                    >{lbl}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Grid>

              {/* Threshold & Sort Row */}
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField
                    sx={{ flex: 1 }} size="small" type="number" label="Low Threshold"
                    value={threshold} onChange={e=>setThreshold(parseInt(e.target.value)||1)}
                    InputProps={{ sx:{borderRadius:3} }} inputProps={{ min:1 }}
                  />
                  <FormControl sx={{ flex: 1 }} size="small">
                    <InputLabel>Sort</InputLabel>
                    <Select value={sortBy} label="Sort" onChange={e=>setSortBy(e.target.value)} sx={{borderRadius:3}}>
                      <MenuItem value="brand">A–Z</MenuItem>
                      <MenuItem value="stock">Stock</MenuItem>
                      <MenuItem value="price">Price</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            </Grid>

            {/* Order controls */}
            <Box sx={{ mt:2, display:'flex', gap:1, flexWrap:'wrap', alignItems:'center' }}>
              <Button
                variant="outlined" size="small"
                startIcon={<FilterIcon />}
                onClick={addAllLowStock}
                sx={{ borderRadius:3, fontWeight:800, borderColor:'warning.main', color:'warning.main', fontSize: isMobile ? '0.7rem' : '0.8rem' }}
              >
                {isMobile ? `Low (${allInventory.filter(i=>i.stock<=threshold).length})` : `Add All Low-Stock to Order (${allInventory.filter(i=>i.stock<=threshold).length})`}
              </Button>

              {orderItems.length > 0 && (
                <Badge badgeContent={orderItems.length} color="error">
                  <Button
                    variant="contained" size="small" color="secondary"
                    startIcon={<POIcon />}
                    onClick={() => setIsPOOpen(true)}
                    sx={{ borderRadius:3, fontWeight:900, fontSize: isMobile ? '0.7rem' : '0.8rem' }}
                  >
                    {isMobile ? 'Order' : 'View Purchase Order'}
                  </Button>
                </Badge>
              )}

              {orderItems.length > 0 && (
                <Button size="small" color="error" onClick={() => setOrderItems([])} sx={{fontWeight:700, fontSize: isMobile ? '0.7rem' : '0.8rem'}}>
                  Clear
                </Button>
              )}
            </Box>
          </Card>

          {/* Main Table */}
          {isMobile ? (
            <Grid container spacing={2}>
              {filteredInventory.map((item) => {
                const margin = item.price > 0 ? (((item.price - item.cost_price) / item.price) * 100) : 0;
                const inOrder = isInOrder(item);
                const sc = stockColor(item.stock, threshold);
                
                return (
                  <Grid item xs={12} sm={6} key={`${item.type}-${item.id}`}>
                    <Card sx={{ 
                      borderRadius: 4, 
                      p: 2.5, 
                      border: '1px solid rgba(0,0,0,0.05)', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                      bgcolor: item.stock === 0 ? 'rgba(244,67,54,0.02)' : item.stock <= threshold ? 'rgba(255,152,0,0.02)' : 'inherit'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip 
                              label={item.type === 'tire' ? (item.tire_category || 'Tire') : (item.category || 'Part')} 
                              size="small" 
                              sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900, borderRadius: 1, bgcolor: item.type === 'tire' ? 'primary.main' : 'secondary.main', color: '#fff' }} 
                            />
                            {item.vehicle_type && <Chip label={item.vehicle_type} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, borderRadius: 1 }} />}
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main', lineHeight: 1.1 }}>
                            {item.brand} {item.model}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mt: 0.2 }}>
                            {item.size}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', mb: 0.5, color: item.stock === 0 ? 'error.main' : 'text.secondary' }}>
                            {item.stock === 0 ? 'OUT' : 'STOCK'}
                          </Typography>
                          <Avatar sx={{ 
                            width: 32, height: 32, fontSize: '0.85rem', fontWeight: 900, 
                            bgcolor: item.stock === 0 ? 'error.main' : item.stock <= threshold ? 'warning.main' : 'success.main',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}>
                            {item.stock}
                          </Avatar>
                        </Box>
                      </Box>

                      {/* Expiration warning for mobile */}
                      {item.type === 'tire' && (() => {
                        const expiredUnits = getExpiredUnitsForTireExtern(item.id, lotAging);
                        if (expiredUnits > 0) {
                          return (
                            <Box sx={{ mt: 1, p: 0.8, borderRadius: 2, bgcolor: 'rgba(198,40,40,0.06)', border: '1px solid rgba(198,40,40,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: '#c62828' }}>🔴 {expiredUnits} UNITS EXPIRED</Typography>
                            </Box>
                          );
                        }
                        return null;
                      })()}

                      <Divider sx={{ my: 1.5, opacity: 0.6 }} />

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', color: 'primary.dark' }}>
                            {item.price.toLocaleString()} {currency}
                          </Typography>
                          {isAdmin && (
                            <Typography variant="caption" sx={{ fontWeight: 800, color: margin >= 40 ? 'success.main' : margin >= 20 ? 'warning.main' : 'error.main', display: 'block' }}>
                              Margin: {margin.toFixed(0)}%
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {isAdmin && item.type === 'tire' && item.name?.startsWith('Trade-in') && (
                            <IconButton color="error" size="small" onClick={() => handleDeleteTire(item.id)} sx={{ bgcolor: 'rgba(244,67,54,0.05)' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                          <Button
                            size="small"
                            variant={inOrder ? 'contained' : 'outlined'}
                            color={inOrder ? 'secondary' : 'primary'}
                            onClick={() => toggleOrderItem(item)}
                            sx={{ borderRadius: 2.5, fontWeight: 900, px: 2, py: 0.8 }}
                            startIcon={inOrder ? <CheckIcon /> : <AddIcon />}
                          >
                            {inOrder ? 'Added' : 'Order'}
                          </Button>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
              {filteredInventory.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography sx={{ fontWeight: 700 }}>No items match your search.</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          ) : (
            <Card sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(26,35,126,0.03)' }}>
                  <TableRow sx={{ '& th': { whiteSpace: 'nowrap' } }}>
                    <TableCell padding="checkbox" />
                    <TableCell sx={{ fontWeight: 900, py: 2.5 }}>ITEM</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>TYPE / CAT</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>STOCK STATUS</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>OLDEST BATCH AGE</TableCell>
                    {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>SELL PRICE</TableCell>}
                    {isAdmin && <TableCell align="right" sx={{ fontWeight: 900 }}>MARGIN</TableCell>}
                    <TableCell align="center" sx={{ fontWeight: 900 }}>ORDER</TableCell>
                    {isAdmin && inventoryView !== 'parts' && <TableCell align="right" sx={{ fontWeight: 900 }}>ACTIONS</TableCell>}
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
                          '& td': { whiteSpace: 'nowrap' }
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

                        <TableCell sx={{ py: 1 }}>
                          <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
                            <Avatar
                              src={item.images?.[0]}
                              sx={{ width:32, height:32, bgcolor:'rgba(26,35,126,0.06)', color:'primary.main', fontWeight:900, borderRadius:1.5, fontSize:'0.75rem' }}
                            >
                              {item.name?.[0]}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontWeight:900, fontSize:'0.85rem', lineHeight:1.2 }}>{item.name}</Typography>
                              <Typography variant="caption" sx={{ color:'text.secondary', fontWeight:600, fontSize:'0.7rem' }}>{item.label}</Typography>
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
                                label={item.stock === 0 ? 'âœ— Out of Stock' : `${item.stock} units`}
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

                        {/* â”€â”€ Oldest Batch Age Badge â”€â”€ */}
                        <TableCell>
                          {item.type === 'tire' ? (() => {
                            const lot = getOldestLotForTire(item.id);
                            const expiredUnits = getExpiredUnitsForTireExtern(item.id, lotAging);

                            if (!lot && expiredUnits === 0) return <Typography variant="caption" color="text.disabled">No batches</Typography>;
                            
                            const style = lot ? ageStatusColor(lot.age_status) : null;
                            
                            if (expiredUnits > 0) {
                              return (
                                <Box sx={{ display:'inline-flex', flexDirection:'column', gap:0.3 }}>
                                  <Chip
                                    label={`ðŸ”´ Expired: ${expiredUnits} Units`}
                                    size="small"
                                    sx={{ fontWeight:900, fontSize:'0.7rem', bgcolor: '#ffebee', color: '#c62828', border:'1px solid #c6282822' }}
                                  />
                                  {lot && lot.age_status !== 'Expired' && (
                                    <Typography variant="caption" sx={{ fontSize:'0.65rem', fontWeight:700 }}>
                                      Next: {lot.age_status} ({lot.current_qty}u)
                                    </Typography>
                                  )}
                                </Box>
                              );
                            }

                            if (!style) return (
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                                Fresh Stock ({lot.current_qty})
                              </Typography>
                            );
                            return (
                              <Tooltip title={`DOT: ${lot.dot_code || '-'} • Received: ${lot.received_at ? new Date(lot.received_at).toLocaleDateString() : '-'} • ${lot.current_qty} units`}>
                                <Box sx={{ display:'inline-flex', flexDirection:'column', gap:0.3 }}>
                                  <Chip
                                    label={`${style.icon} ${lot.age_status}`}
                                    size="small"
                                    sx={{ fontWeight:900, fontSize:'0.65rem', bgcolor: style.bg, color: style.color, border:`1px solid ${style.color}22` }}
                                  />
                                  {lot.age_years !== null && (
                                    <Typography variant="caption" sx={{ fontSize:'0.65rem', color: style.color, fontWeight:700 }}>
                                      {lot.age_years} yrs • {lot.current_qty} units
                                    </Typography>
                                  )}
                                  {lot.manufacture_date && (
                                    <Typography variant="caption" sx={{ fontSize:'0.6rem', color:'text.secondary' }}>
                                      Mfg: {new Date(lot.manufacture_date).toLocaleDateString('en-GB', { month:'short', year:'numeric' })}
                                    </Typography>
                                  )}
                                </Box>
                              </Tooltip>
                            );
                          })() : <Typography variant="caption" color="text.disabled">-</Typography>}
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
                            ) : <Typography variant="caption" color="text.disabled">-</Typography>}
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
                              {inOrder ? 'âœ“ Added' : '+ Order'}
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
                        {stockFilter === 'low' ? '🎉 No low-stock items - inventory is healthy!' :
                         stockFilter === 'out' ? '✅ No out-of-stock items!' :
                         'No inventory found. Use Log GRN to add items.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            </Card>
          )}
        </Box>
      )}

      {/* â•â•â•â• GRN â•â•â•â• */}
      {activeTab === 'grn' && isAdmin && (
        <Box>
          {/* GRN type toggle */}
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={grnType}
              exclusive
              onChange={(_, v) => v && setGrnType(v)}
              orientation={isMobile ? 'vertical' : 'horizontal'}
              sx={{
                gap: 1,
                width: isMobile ? '100%' : 'auto',
                '& .MuiToggleButton-root': {
                  fontWeight: 800,
                  px: isMobile ? 2 : 4,
                  py: 1.5,
                  borderRadius: '12px !important',
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  border: isMobile ? '1px solid rgba(0,0,0,0.12) !important' : 'none'
                },
                '& .Mui-selected': { background: 'linear-gradient(135deg,#1a237e,#311b92) !important', color: '#fff !important' }
              }}
            >
              <ToggleButton value="tire"><TireIcon sx={{ mr: 1 }} />Tire GRN</ToggleButton>
              <ToggleButton value="parts"><CategoryIcon sx={{ mr: 1 }} />Spare Parts GRN</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* TIRE GRN */}
          {grnType === 'tire' && (
            <Grid container justifyContent="center">
              <Grid item xs={12} md={9}>
                <Card sx={{ borderRadius:4, p: isMobile ? 2 : 4 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2 }}>
                    {!isMobile && <Avatar sx={{ bgcolor:'primary.main', width:44, height:44 }}><TireIcon /></Avatar>}
                    <Box>
                      <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight:900 }}>Tire GRN</Typography>
                      {!isMobile && <Typography variant="body2" color="text.secondary">Matching stock is auto-restocked; new items go live in POS immediately.</Typography>}
                    </Box>
                  </Box>
                  <Alert severity="info" sx={{ mb:3, borderRadius:3, fontWeight:600 }}>
                    Smart restock: same Brand + Size + Model + Vehicle type â†’ stock is added automatically.
                  </Alert>

                  <Box sx={{ mb: 3 }}>
                    <Autocomplete
                      options={tires}
                      getOptionLabel={(option) => `${option.brand || ''} ${option.model || ''} - ${option.size || ''}`.trim()}
                      getOptionKey={(option) => option.id}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
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
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 1.5 }}>1. Product Specification</Typography>
                      <Divider sx={{ mb: 2, opacity: 0.6 }} />
                      <Grid container spacing={2}>
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
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth>
                            <InputLabel>Classification</InputLabel>
                            <Select value={grnData.tire_category} label="Classification" onChange={e=>setGrnData({...grnData,tire_category:e.target.value})}>
                              {['New','Reconditioned','Run-Flat','Winter','Off-Road','Commercial'].map(c=><MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Autocomplete options={vehicleTypes} freeSolo
                            renderInput={p=><TextField {...p} label="Vehicle Type" />}
                            value={grnData.vehicle_type}
                            onChange={(_,v)=>setGrnData({...grnData,vehicle_type:v||''})}
                            onInputChange={(_,v)=>setGrnData({...grnData,vehicle_type:v})}
                          />
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mb: 4 }}>
                      <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 1.5 }}>2. Procurement & Pricing</Typography>
                      <Divider sx={{ mb: 2, opacity: 0.6 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Supplier / Source *</InputLabel>
                            <Select
                              value={grnData.supplier_id}
                              onChange={e => setGrnData({...grnData, supplier_id: e.target.value})}
                              label="Supplier / Source *"
                              required
                            >
                              <MenuItem value=""><em>None (Independent Stock)</em></MenuItem>
                              {suppliers.map(s => (
                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField fullWidth type="number" label="Quantity *" value={grnData.stock} onChange={e=>setGrnData({...grnData,stock:e.target.value})} required inputProps={{min:1}} />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField fullWidth type="number" label={`Cost (${currency})`} value={grnData.cost_price} onChange={e=>setGrnData({...grnData,cost_price:e.target.value})} inputProps={{min:0,step:0.01}} />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField fullWidth type="number" label={`Sell Price (${currency}) *`} value={grnData.price} onChange={e=>setGrnData({...grnData,price:e.target.value})} required inputProps={{min:0,step:0.01}} />
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mb: 4 }}>
                      <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 1.5 }}>3. Manufacturing & Origins</Typography>
                      <Divider sx={{ mb: 2, opacity: 0.6 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth label="DOT Code (WWYY)" value={grnData.dot_code} onChange={e=>setGrnData({...grnData,dot_code:e.target.value})} placeholder="e.g. 2423"
                            helperText={dotPreview ? `Week ${grnData.dot_code.slice(0,2)}, 20${grnData.dot_code.slice(2,4)}` : ''}
                          />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth type="date" label="Manufacture Date" value={grnData.manufacture_date} onChange={e=>setGrnData({...grnData,manufacture_date:e.target.value})} InputLabelProps={{shrink:true}} />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth label="Origin" value={grnData.origin} onChange={e=>setGrnData({...grnData,origin:e.target.value})} placeholder="e.g. Japan" />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <TextField fullWidth label="Pattern" value={grnData.thread_pattern} onChange={e=>setGrnData({...grnData,thread_pattern:e.target.value})} />
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ border:'2px dashed rgba(0,0,0,0.12)',borderRadius:2,p:1.5,display:'flex',alignItems:'center',justifyContent:'center',minHeight:56 }}>
                            <input accept="image/*" style={{display:'none'}} id="grn-img" type="file" onChange={e=>setSelectedFile(e.target.files[0])} />
                            <label htmlFor="grn-img" style={{width:'100%'}}>
                              <Button component="span" fullWidth startIcon={<PhotoIcon color={selectedFile?'success':'action'} />} sx={{textTransform:'none',fontWeight:700}}>
                                {selectedFile ? (selectedFile.name.length>22?selectedFile.name.slice(0,22)+'...':selectedFile.name) : 'Attach Product Photo'}
                              </Button>
                            </label>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    {tireMargin && grnData.cost_price > 0 && (
                      <Box sx={{p:2.5,borderRadius:3,bgcolor:'rgba(76,175,80,0.05)',border:'1px solid rgba(76,175,80,0.2)',display:'flex',gap:3,flexWrap:'wrap',alignItems:'center',mb:3}}>
                        <MarginIcon sx={{color:'success.main'}}/> 
                        <Box>
                          <Typography variant="caption" sx={{fontWeight:800,color:'success.main',textTransform:'uppercase'}}>Profit Preview</Typography>
                          <Typography variant="body2" component="div" sx={{fontWeight:900, display: 'flex', alignItems: 'center', gap: 1}}>
                            +{(parseFloat(grnData.price||0)-parseFloat(grnData.cost_price||0)).toLocaleString()} {currency} / unit &nbsp;•&nbsp; <MarginChip margin={tireMargin}/>
                          </Typography>
                        </Box>
                        {grnData.stock > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{fontWeight:800,opacity:0.6,textTransform:'uppercase'}}>Batch Profit</Typography>
                            <Typography variant="body2" sx={{fontWeight:900,color:'success.main'}}>
                              +{((parseFloat(grnData.price||0)-parseFloat(grnData.cost_price||0))*parseInt(grnData.stock||0)).toLocaleString()} {currency}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    <Button variant="contained" fullWidth size="large" type="submit" disabled={uploading} sx={{py:2,borderRadius:4,fontWeight:900,fontSize:'1.1rem'}} startIcon={<AddIcon/>}>
                      {uploading ? 'UPLOADING IMAGE...' : 'ADD TO GRN LIST'}
                    </Button>
                  </form>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* PARTS GRN */}
          {grnType === 'parts' && (
            <Grid container justifyContent="center">
              <Grid item xs={12} md={9}>
                <Card sx={{ borderRadius:4, p: isMobile ? 2 : 4 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2 }}>
                    {!isMobile && <Avatar sx={{ bgcolor:'secondary.main', width:44, height:44 }}><CategoryIcon /></Avatar>}
                    <Box>
                      <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight:900 }}>Spare Parts GRN</Typography>
                      {!isMobile && <Typography variant="body2" color="text.secondary">Any part or consumable — appears in POS Parts & All tabs instantly.</Typography>}
                    </Box>
                  </Box>
                  <Alert severity="info" sx={{ mb:3, borderRadius:3, fontWeight:600 }}>
                    Same name + category → stock is added. New item → created and live in POS.
                  </Alert>

                  <Box sx={{ mb: 3 }}>
                    <Autocomplete
                      options={parts}
                      getOptionLabel={(option) => `${option.name || ''} (${option.category || ''})`}
                      getOptionKey={(option) => option.id}
                      isOptionEqualToValue={(option, value) => option.id === value?.id}
                      onChange={(e, v) => {
                        if (v) {
                          setPartGrn({
                            ...partGrn,
                            name: v.name || '',
                            category: v.category || 'Consumable',
                            cost_price: v.cost_price || '',
                            price: v.price || '',
                            supplier_id: v.supplier_id || '',
                            notes: v.notes || ''
                          });
                        }
                      }}
                      renderInput={(params) => <TextField {...params} label="âš¡ Fast Restock: Select Existing Part" variant="outlined" helperText="Auto-fills the form below to prevent spelling mistakes and duplicates" />}
                    />
                  </Box>

                  <form onSubmit={handlePartGRNSubmit}>
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 1.5 }}>1. Part Identity</Typography>
                      <Divider sx={{ mb: 2, opacity: 0.6 }} />
                      <Grid container spacing={2}>
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
                        <Grid item xs={12}>
                          <TextField fullWidth label="Notes / Part Number" value={partGrn.notes} onChange={e=>setPartGrn({...partGrn,notes:e.target.value})} placeholder="OEM ref, serial, etc." />
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ mb: 4 }}>
                      <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 1.5 }}>2. Procurement & Pricing</Typography>
                      <Divider sx={{ mb: 2, opacity: 0.6 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel>Supplier / Source *</InputLabel>
                            <Select
                              value={partGrn.supplier_id}
                              onChange={e => setPartGrn({...partGrn, supplier_id: e.target.value})}
                              label="Supplier / Source *"
                              required
                            >
                              <MenuItem value=""><em>None (Independent Stock)</em></MenuItem>
                              {suppliers.map(s => (
                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <TextField fullWidth type="number" label="Qty *" value={partGrn.stock} onChange={e=>setPartGrn({...partGrn,stock:e.target.value})} required inputProps={{min:1}} />
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <TextField fullWidth type="number" label={`Cost (${currency})`} value={partGrn.cost_price} onChange={e=>setPartGrn({...partGrn,cost_price:e.target.value})} inputProps={{min:0,step:0.01}} />
                        </Grid>
                        <Grid item xs={4} sm={2}>
                          <TextField fullWidth type="number" label={`Sell (${currency}) *`} value={partGrn.price} onChange={e=>setPartGrn({...partGrn,price:e.target.value})} required inputProps={{min:0,step:0.01}} />
                        </Grid>
                      </Grid>
                    </Box>

                    {partMargin && partGrn.cost_price > 0 && (
                      <Box sx={{p:2.5,borderRadius:3,bgcolor:'rgba(76,175,80,0.05)',border:'1px solid rgba(76,175,80,0.2)',display:'flex',gap:3,flexWrap:'wrap',alignItems:'center',mb:3}}>
                        <MarginIcon sx={{color:'success.main'}}/>
                        <Box>
                          <Typography variant="caption" sx={{fontWeight:800,color:'success.main',textTransform:'uppercase'}}>Profit Preview</Typography>
                          <Typography variant="body2" component="div" sx={{fontWeight:900, display: 'flex', alignItems: 'center', gap: 1}}>
                            +{(parseFloat(partGrn.price||0)-parseFloat(partGrn.cost_price||0)).toLocaleString()} {currency} / unit · <MarginChip margin={partMargin}/>
                          </Typography>
                        </Box>
                        {partGrn.stock > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{fontWeight:800,opacity:0.6,textTransform:'uppercase'}}>Batch Profit</Typography>
                            <Typography variant="body2" sx={{fontWeight:900,color:'success.main'}}>
                              +{((parseFloat(partGrn.price||0)-parseFloat(partGrn.cost_price||0))*parseInt(partGrn.stock||0)).toLocaleString()} {currency}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}

                    <Button variant="contained" color="secondary" fullWidth size="large" type="submit" sx={{py:2,borderRadius:4,fontWeight:900,fontSize:'1.1rem'}} startIcon={<AddIcon/>}>
                      ADD TO GRN LIST
                    </Button>
                  </form>
                </Card>
              </Grid>
            </Grid>
          )}
          {/* GRN DRAFT CART */}
          {grnItems.length > 0 && (
            <Grid container justifyContent="center" sx={{ mt: 4 }}>
              <Grid item xs={12} md={9}>
                <Card sx={{ borderRadius: 4, p: 4, border: '2px solid', borderColor: 'primary.main' }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StockIcon color="primary" /> Finalize Shipment Reception
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Review the items below. Once you click "COMMIT SHIPMENT", all items will be added to stock and the supplier balance will be updated in a single invoice.
                  </Typography>

                  {isMobile ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                      {grnItems.map((item, idx) => (
                        <Card key={item.id} variant="outlined" sx={{ borderRadius: 3, p: 2, bgcolor: 'rgba(26, 35, 126, 0.02)' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography sx={{ fontWeight: 800, color: 'primary.main', flex: 1 }}>{item.label}</Typography>
                            <IconButton size="small" color="error" onClick={() => setGrnItems(prev => prev.filter((_, i) => i !== idx))} sx={{ mt: -0.5, mr: -0.5 }}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={4}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>QTY</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{item.quantity}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>COST</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{item.cost_price.toLocaleString()}</Typography>
                            </Grid>
                            <Grid item xs={4}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block' }}>SUBTOTAL</Typography>
                              <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{(item.quantity * item.cost_price).toLocaleString()}</Typography>
                            </Grid>
                          </Grid>
                        </Card>
                      ))}
                      <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'primary.main', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 900 }}>GRAND TOTAL:</Typography>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>
                          {grnItems.reduce((acc, curr) => acc + (curr.quantity * curr.cost_price), 0).toLocaleString()} {currency}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3, border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'none', overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: isMobile ? 500 : 0 }}>
                      <TableHead sx={{ bgcolor: 'rgba(26, 35, 126, 0.03)' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900 }}>ITEM</TableCell>
                          <TableCell sx={{ fontWeight: 900 }}>QTY</TableCell>
                          <TableCell sx={{ fontWeight: 900 }}>COST</TableCell>
                          <TableCell sx={{ fontWeight: 900 }}>SUBTOTAL</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900 }}>REMOVE</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {grnItems.map((item, idx) => (
                          <TableRow key={item.id}>
                            <TableCell sx={{ fontWeight: 700 }}>{item.label}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.cost_price.toLocaleString()}</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>{(item.quantity * item.cost_price).toLocaleString()}</TableCell>
                            <TableCell align="right">
                              <IconButton size="small" color="error" onClick={() => setGrnItems(prev => prev.filter((_, i) => i !== idx))}>
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 900, textAlign: 'right' }}>GRAND TOTAL:</TableCell>
                          <TableCell colSpan={2} sx={{ fontWeight: 900, color: 'primary.main', fontSize: '1.1rem' }}>
                            {grnItems.reduce((acc, curr) => acc + (curr.quantity * curr.cost_price), 0).toLocaleString()} {currency}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        fullWidth label="Reference / Invoice #" 
                        value={grnReference} onChange={e => setGrnReference(e.target.value)} 
                        placeholder="e.g. INV-2024-001"
                        InputProps={{ sx: { borderRadius: 3 } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField 
                        fullWidth label="Shipment Notes" 
                        value={grnNotes} onChange={e => setGrnNotes(e.target.value)} 
                        placeholder="e.g. Received by Kamal"
                        InputProps={{ sx: { borderRadius: 3 } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        fullWidth variant="contained" color="primary" size="large"
                        disabled={isFinalizingGRN}
                        onClick={finalizeBulkGRN}
                        sx={{ py: 2, borderRadius: 3, fontWeight: 900, mt: 1 }}
                        startIcon={<GRNIcon />}
                      >
                        {isFinalizingGRN ? 'Processing...' : 'COMMIT SHIPMENT - UPDATED ALL STOCK & SUPPLIER DEBT'}
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 'parts' && <PartsInventory partsProps={parts} businessProfile={businessProfile} />}
      {activeTab === 'hotel' && <TireHotel hotelTiresProps={hotelTires} businessProfile={businessProfile} />}

      {/* â•â•â•â• PURCHASE ORDER DIALOG â•â•â•â• */}
      <Dialog 
        open={isPOOpen} 
        onClose={()=>setIsPOOpen(false)} 
        maxWidth="md" 
        fullWidth 
        fullScreen={isMobile}
        PaperProps={{sx:{borderRadius: isMobile ? 0 : 4}}}
      >
        <DialogTitle sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(0,0,0,0.08)', pb:2 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1.5 }}>
            <POIcon color="primary" />
            <Box>
              <Typography sx={{ fontWeight:900 }}>Purchase Order Builder</Typography>
              <Typography variant="caption" color="text.secondary">{orderItems.length} items • {orderItems.reduce((s,o)=>s+o.orderQty,0)} total units</Typography>
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

          {isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {orderItems.map(item => (
                <Card key={`${item.type}-${item.id}`} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>{item.name}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Chip label={item.type.toUpperCase()} size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900, bgcolor: item.type === 'tire' ? 'rgba(26,35,126,0.08)' : 'rgba(245,0,87,0.08)', color: item.type === 'tire' ? 'primary.main' : 'secondary.main' }} />
                        <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      </Box>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => setOrderItems(prev => prev.filter(o => !(o.id === item.id && o.type === item.type)))}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.02)', p: 1.5, borderRadius: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary' }}>STOCK</Typography>
                      <Chip label={item.currentStock === 0 ? 'Out' : item.currentStock} size="small" color={item.currentStock === 0 ? 'error' : item.currentStock <= threshold ? 'warning' : 'success'} sx={{ fontWeight: 900, height: 20 }} />
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary', mb: 0.5 }}>ORDER QUANTITY</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5 }}>
                        <IconButton size="small" onClick={() => updateOrderQty(item.id, item.type, -1)} sx={{ bgcolor: 'rgba(0,0,0,0.04)', p: 0.5 }}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', minWidth: 24, textAlign: 'center' }}>{item.orderQty}</Typography>
                        <IconButton size="small" onClick={() => updateOrderQty(item.id, item.type, +1)} sx={{ bgcolor: 'rgba(0,0,0,0.04)', p: 0.5 }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>Item Details</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>Stock</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900 }}>Order Qty</TableCell>
                    <TableCell align="center"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orderItems.map(item => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.label} • {item.type.toUpperCase()}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={item.currentStock} size="small" color={item.currentStock <= threshold ? 'warning' : 'success'} variant="outlined" sx={{ fontWeight: 900 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
                          <IconButton size="small" onClick={() => updateOrderQty(item.id, item.type, -1)}><RemoveIcon fontSize="small" /></IconButton>
                          <Typography sx={{ fontWeight: 900, minWidth: 20 }}>{item.orderQty}</Typography>
                          <IconButton size="small" onClick={() => updateOrderQty(item.id, item.type, 1)}><AddIcon fontSize="small" /></IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => setOrderItems(prev => prev.filter(o => !(o.id === item.id && o.type === item.type)))}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {orderItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No items added to order</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0,0,0,0.08)', gap: 1.5 }}>
          <Button onClick={() => setOrderItems([])} color="error" sx={{ fontWeight: 800 }}>Clear All</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" onClick={handleCopyPO} startIcon={<CopyIcon />} sx={{ borderRadius: 2, fontWeight: 800 }}>Copy Text</Button>
          <Button variant="contained" onClick={handlePrintPO} startIcon={<PrintIcon />} sx={{ borderRadius: 2, fontWeight: 900, px: 4 }}>Print PO</Button>
        </DialogActions>
      </Dialog>

      {/* STOCK RETURNS TAB */}
      {activeTab === 'returns' && isAdmin && (
        <Grid container justifyContent="center">
          <Grid item xs={12} md={8}>
            <Card sx={{ p: isMobile ? 2 : 4, borderRadius: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: 'error.main' }}>Stock Returns & Debt Reduction</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Return items to suppliers and automatically reduce your payable balance.</Typography>

              <form onSubmit={handleReturnSubmit}>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 1.5 }}>1. Supply Context</Typography>
                  <Divider sx={{ mb: 2, opacity: 0.6 }} />
                  <FormControl fullWidth>
                    <InputLabel>Target Supplier</InputLabel>
                    <Select
                      value={returnData.supplier_id}
                      onChange={e => setReturnData({...returnData, supplier_id: e.target.value})}
                      label="Target Supplier"
                      required
                    >
                      {suppliers.map(s => (
                        <MenuItem key={s.id} value={s.id}>{s.name} (Debt: {Number(s.payable_balance||0).toLocaleString()} {currency})</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 1.5 }}>2. Product Selection</Typography>
                  <Divider sx={{ mb: 2, opacity: 0.6 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Item Type</InputLabel>
                        <Select
                          value={returnData.type}
                          onChange={e => setReturnData({...returnData, type: e.target.value, tire_id: '', part_id: ''})}
                          label="Item Type"
                        >
                          <MenuItem value="tire">Tire</MenuItem>
                          <MenuItem value="part">Spare Part</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {returnData.type === 'tire' ? (
                        <Autocomplete
                          options={tires}
                          getOptionLabel={(o) => `${o.brand} ${o.size} (${o.stock} in stock)`}
                          getOptionKey={(o) => o.id}
                          onChange={(_, v) => setReturnData({...returnData, tire_id: v?.id || ''})}
                          renderInput={(p) => <TextField {...p} label="Select Tire" required />}
                        />
                      ) : (
                        <Autocomplete
                          options={parts}
                          getOptionLabel={(o) => `${o.name} (${o.stock} in stock)`}
                          getOptionKey={(o) => o.id}
                          onChange={(_, v) => setReturnData({...returnData, part_id: v?.id || ''})}
                          renderInput={(p) => <TextField {...p} label="Select Part" required />}
                        />
                      )}
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.secondary', letterSpacing: 1.5 }}>3. Return Details</Typography>
                  <Divider sx={{ mb: 2, opacity: 0.6 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth type="number" label="Quantity to Return"
                        value={returnData.quantity}
                        onChange={e => setReturnData({...returnData, quantity: e.target.value})}
                        required
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth label="Reason for Return"
                        value={returnData.reason}
                        onChange={e => setReturnData({...returnData, reason: e.target.value})}
                        placeholder="e.g. Defective, Wrong Item"
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Button
                  type="submit" fullWidth variant="contained" color="error"
                  sx={{ py:2, borderRadius:4, fontWeight:900, fontSize:'1.1rem' }}
                >
                  PROCESS RETURN & REDUCE DEBT
                </Button>
              </form>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

const getExpiredUnitsForTireExtern = (tireId, lotAging) => {
  return lotAging
    .filter(l => l.tire_id === tireId && l.age_status === 'Expired')
    .reduce((sum, l) => sum + parseInt(l.current_qty || 0), 0);
};

export default TireList;
