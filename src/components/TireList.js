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
    Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from './AuthContext';
import PartsInventory from './PartsInventory';
import TireHotel from './TireHotel';

const TireList = ({ 
    tires = [], addTire, updateTire, deleteTire, 
    parts = [], hotelTires = [], 
    masterData, businessProfile 
}) => {
  const { isAdmin } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('brand');
  const [grnData, setGrnData] = useState({ brand: '', model: '', size: '', tire_category: 'New', stock: '', cost_price: '', price: '' });
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const tireBrands = masterData?.brands || [];
  const currency = businessProfile?.currency || 'LKR';

  const handleGRNSubmit = async (e) => {
    e.preventDefault();
    if (!grnData.brand || !grnData.size || !grnData.stock) {
      setAlert({ open: true, message: 'Please complete all required fields.', severity: 'error' });
      return;
    }

    try {
      await addTire({
        ...grnData,
        stock: parseInt(grnData.stock),
        cost_price: parseFloat(grnData.cost_price || 0),
        price: parseFloat(grnData.price || 0)
      });
      setAlert({ open: true, message: 'GRN Successfully Logged. Stock Updated.', severity: 'success' });
      setGrnData({ brand: '', model: '', size: '', tire_category: 'New', stock: '', cost_price: '', price: '' });
      setTabValue(0); // Go back to stock list
    } catch (err) {
      setAlert({ open: true, message: 'Failed to log GRN.', severity: 'error' });
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
      .filter(t => (t.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) || (t.size || '').toLowerCase().includes(searchTerm.toLowerCase()))
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
        value={tabValue} 
        onChange={(e, v) => setTabValue(v)} 
        sx={{ 
          mb: 4,
          '& .MuiTabs-indicator': { height: 3, borderRadius: 1.5 },
          '& .MuiTab-root': { fontWeight: 800, fontSize: '0.95rem', textTransform: 'none' }
        }}
      >
        <Tab icon={<StockIcon />} iconPosition="start" label="Stock Management" />
        <Tab icon={<GRNIcon />} iconPosition="start" label="Log GRN (New Stock)" />
        <Tab icon={<PartsIcon />} iconPosition="start" label="Parts & Consumables" />
        <Tab icon={<HotelIcon />} iconPosition="start" label="Tire Hotel" />
      </Tabs>

      {tabValue === 0 && (
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
                          <Avatar sx={{ bgcolor: 'rgba(26, 35, 126, 0.05)', color: 'primary.main', fontWeight: 900, borderRadius: 2 }}>{tire.brand?.[0]}</Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 900 }}>{tire.brand}</Typography>
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

      {tabValue === 1 && (
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
                    <TextField fullWidth label="Quantity Received" type="number" variant="outlined" value={grnData.stock} onChange={e => setGrnData({...grnData, stock: e.target.value})} required />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label={`Buy Price (${currency})`} type="number" variant="outlined" value={grnData.cost_price} onChange={e => setGrnData({...grnData, cost_price: e.target.value})} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label={`Sell Price (${currency})`} type="number" variant="outlined" value={grnData.price} onChange={e => setGrnData({...grnData, price: e.target.value})} />
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Button variant="contained" fullWidth size="large" type="submit" sx={{ py: 2, borderRadius: 3, fontWeight: 900 }}>COMMIT GRN & UPDATE STOCK</Button>
                  </Grid>
                </Grid>
              </form>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && <PartsInventory partsProps={parts} businessProfile={businessProfile} />}
      {tabValue === 3 && <TireHotel hotelTiresProps={hotelTires} businessProfile={businessProfile} />}

      <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert({ ...alert, open: false })}>
        <Alert severity={alert.severity} sx={{ borderRadius: 3, fontWeight: 700 }}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TireList;

