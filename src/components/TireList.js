import React, { useState, useMemo } from 'react';
import {
  TextField, Typography,
  Snackbar, Button, Box, Grid, Select,
  MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Divider, Autocomplete, Avatar, Card, Tab, Tabs, Alert, IconButton
} from '@mui/material';
import {
    Warning as WarningIcon,
    Search as SearchIcon,
    LocalShipping as GRNIcon,
    Inventory2 as StockIcon,
    Build as PartsIcon,
    Hotel as HotelIcon,
    Delete as DeleteIcon,
    AddPhotoAlternate as PhotoIcon,
    DirectionsCar as VehicleIcon
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';
import PartsInventory from './PartsInventory';
import TireHotel from './TireHotel';

const TireList = ({ 
    tires = [], addTire, updateTire, deleteTire, 
    parts = [], hotelTires = [], 
    masterData, businessProfile 
}) => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('brand');
  const [grnData, setGrnData] = useState({ 
    brand: '', 
    model: '', 
    size: '', 
    tire_category: 'New', 
    stock: '', 
    cost_price: '', 
    price: '',
    vehicle_type: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const tireBrands = masterData?.brands || [];
  const vehicleTypes = masterData?.vehicles || [];
  const currency = businessProfile?.currency || 'LKR';

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handleGRNSubmit = async (e) => {
    e.preventDefault();
    if (!grnData.brand || !grnData.size || !grnData.stock) {
      setAlert({ open: true, message: 'Please complete all required fields.', severity: 'error' });
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;
      if (selectedFile) {
        const compressedBlob = await compressImage(selectedFile);
        const fileName = `${Date.now()}_${selectedFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('tires')
          .upload(fileName, compressedBlob);
        
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('tires').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      // Restock Logic: Check if identical tire exists (same brand, model, size, vehicle_type, category)
      const existingTire = tires.find(t => 
        (t.brand || '').toLowerCase() === (grnData.brand || '').toLowerCase() &&
        (t.model || '').toLowerCase() === (grnData.model || '').toLowerCase() &&
        (t.size || '').toLowerCase() === (grnData.size || '').toLowerCase() &&
        (t.vehicle_type || '').toLowerCase() === (grnData.vehicle_type || '').toLowerCase() &&
        (t.tire_category || '').toLowerCase() === (grnData.tire_category || '').toLowerCase()
      );

      if (existingTire) {
        // Update existing stock
        const newStock = parseInt(existingTire.stock || 0) + parseInt(grnData.stock);
        const updates = { 
          stock: newStock,
          cost_price: parseFloat(grnData.cost_price || existingTire.cost_price || 0),
          price: parseFloat(grnData.price || existingTire.price || 0)
        };
        if (imageUrl) {
          updates.images = [...(existingTire.images || []), imageUrl];
        }
        await updateTire(existingTire.id, updates);
        setAlert({ open: true, message: 'Existing inventory updated with new stock.', severity: 'success' });
      } else {
        // Insert new tire
        await addTire({
          ...grnData,
          images: imageUrl ? [imageUrl] : [],
          stock: parseInt(grnData.stock),
          cost_price: parseFloat(grnData.cost_price || 0),
          price: parseFloat(grnData.price || 0)
        });
        setAlert({ open: true, message: 'New asset registered into inventory.', severity: 'success' });
      }

      setGrnData({ brand: '', model: '', size: '', tire_category: 'New', stock: '', cost_price: '', price: '', vehicle_type: '' });
      setSelectedFile(null);
      setActiveTab('stock');
    } catch (err) {
      console.error(err);
      setAlert({ open: true, message: 'Operation failed: ' + err.message, severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTire = async (id) => {
    if (window.confirm('Delete this Trade-in Exchange item?')) {
      try {
        await deleteTire(id);
        setAlert({ open: true, message: 'Item deleted successfully.', severity: 'info' });
      } catch (err) {
        setAlert({ open: true, message: 'Failed to delete item.', severity: 'error' });
      }
    }
  };

  const filteredAndSortedTires = useMemo(() => {
    return tires
      .filter(t => 
        (t.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.size || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.vehicle_type || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'price') return Number(a.price) - Number(b.price);
        if (sortBy === 'stock') return Number(a.stock) - Number(b.stock);
        return (a.brand || '').localeCompare(b.brand || '');
      });
  }, [tires, searchTerm, sortBy]);

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mb: 0.5 }}>Inventory Hub</Typography>
        <Typography variant="body1" color="text.secondary">Centralized command for tires, parts, and custodial assets</Typography>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(e, v) => setActiveTab(v)} 
        sx={{ 
          mb: 4,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
          '& .MuiTab-root': { fontWeight: 800, fontSize: '0.95rem', textTransform: 'none' }
        }}
      >
        <Tab icon={<StockIcon />} iconPosition="start" label="Stock Management" value="stock" />
        {isAdmin && <Tab icon={<GRNIcon />} iconPosition="start" label="Log GRN (New Stock)" value="grn" />}
        <Tab icon={<PartsIcon />} iconPosition="start" label="Parts & Consumables" value="parts" />
        <Tab icon={<HotelIcon />} iconPosition="start" label="Tire Hotel" value="hotel" />
      </Tabs>

      {activeTab === 'stock' && (
        <Box>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Search catalog by brand, size, or pattern..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />, sx: { borderRadius: 4, bgcolor: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth variant="standard">
                <InputLabel>Order By</InputLabel>
                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="brand">Manufacturer Alpha</MenuItem>
                  <MenuItem value="price">Valuation (Ascending)</MenuItem>
                  <MenuItem value="stock">On-Hand Level</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Card sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(26, 35, 126, 0.03)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, py: 3 }}>ASSET IDENTIFIER</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>CLASSIFICATION</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>STOCK QUANTUM</TableCell>
                    <TableCell sx={{ fontWeight: 900 }} align="right">UNIT RATE</TableCell>
                    {isAdmin && <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedTires.map((tire) => (
                    <TableRow key={tire.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            src={tire.images?.[0]} 
                            sx={{ bgcolor: 'rgba(26, 35, 126, 0.05)', color: 'primary.main', fontWeight: 900, borderRadius: 2 }}
                          >
                            {tire.brand?.[0]}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 900 }}>{tire.brand} <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>({tire.vehicle_type})</Typography></Typography>
                            <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 700 }}>{tire.size} • {tire.model}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={tire.tire_category} size="small" sx={{ fontWeight: 900, borderRadius: 2 }} color={tire.tire_category === 'New' ? 'success' : 'warning'} /></TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: 900, color: tire.stock < 10 ? 'error.main' : 'inherit' }}>{tire.stock} Units</Typography>
                          {tire.stock < 10 && <WarningIcon color="error" sx={{ fontSize: 16 }} />}
                        </Box>
                      </TableCell>
                      <TableCell align="right"><Typography sx={{ fontWeight: 900 }}>{Number(tire.price).toLocaleString()} {currency}</Typography></TableCell>
                      {isAdmin && (
                        <TableCell align="right">
                          {tire.brand === 'Trade-in Exchange' && (
                            <IconButton color="error" size="small" onClick={() => handleDeleteTire(tire.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {activeTab === 'grn' && isAdmin && (
        <Grid container justifyContent="center">
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 4, p: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Goods Received Note (GRN)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Log incoming stock from suppliers to update inventory levels.</Typography>

              <form onSubmit={handleGRNSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={tireBrands}
                      renderInput={(p) => <TextField {...p} label="Manufacturer Brand" variant="outlined" required />}
                      value={grnData.brand}
                      onChange={(_, v) => setGrnData({ ...grnData, brand: v })}
                      freeSolo
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Tire Size (e.g. 195/65 R15)" variant="outlined" value={grnData.size} onChange={e => setGrnData({...grnData, size: e.target.value})} required />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Model / Pattern Name" variant="outlined" value={grnData.model} onChange={e => setGrnData({...grnData, model: e.target.value})} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Tire Classification</InputLabel>
                      <Select value={grnData.tire_category} label="Tire Classification" onChange={e => setGrnData({...grnData, tire_category: e.target.value})}>
                        <MenuItem value="New">New Tire</MenuItem>
                        <MenuItem value="Reconditioned">Reconditioned (Used)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Autocomplete
                      options={vehicleTypes}
                      renderInput={(p) => <TextField {...p} label="Vehicle Compatibility" variant="outlined" />}
                      value={grnData.vehicle_type}
                      onChange={(_, v) => setGrnData({ ...grnData, vehicle_type: v })}
                      freeSolo
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Quantity Received" type="number" variant="outlined" value={grnData.stock} onChange={e => setGrnData({...grnData, stock: e.target.value})} required />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ border: '2px dashed rgba(0,0,0,0.1)', borderRadius: 2, p: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="grn-image-upload"
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                      <label htmlFor="grn-image-upload" style={{ width: '100%' }}>
                        <Button
                          component="span"
                          fullWidth
                          startIcon={selectedFile ? <PhotoIcon color="success" /> : <PhotoIcon />}
                          sx={{ textTransform: 'none', fontWeight: 700, p: 1 }}
                        >
                          {selectedFile ? (selectedFile.name.length > 15 ? selectedFile.name.slice(0, 15) + '...' : selectedFile.name) : "Attach Product Image"}
                        </Button>
                      </label>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label={`Buy Price (${currency})`} type="number" variant="outlined" value={grnData.cost_price} onChange={e => setGrnData({...grnData, cost_price: e.target.value})} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label={`Sell Price (${currency})`} type="number" variant="outlined" value={grnData.price} onChange={e => setGrnData({...grnData, price: e.target.value})} />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Button 
                      variant="contained" 
                      fullWidth 
                      size="large" 
                      type="submit" 
                      disabled={uploading}
                      sx={{ py: 2, borderRadius: 3, fontWeight: 900 }}
                    >
                      {uploading ? 'UPLOADING & UPDATING...' : 'COMMIT GRN & UPDATE STOCK'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 'parts' && <PartsInventory partsProps={parts} businessProfile={businessProfile} />}
      {activeTab === 'hotel' && <TireHotel hotelTiresProps={hotelTires} businessProfile={businessProfile} />}

      <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TireList;
