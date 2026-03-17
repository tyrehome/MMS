import React, { useState, useEffect, useMemo } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Container,
  Typography,
  IconButton,
  AppBar as MuiAppBar,
  Toolbar,
  Divider,
  Paper,
  useMediaQuery,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Fade,
  Badge,
  Button,
  Snackbar,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SellIcon from "@mui/icons-material/Sell";
import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import NotificationsIcon from "@mui/icons-material/Notifications";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import InventoryIcon from "@mui/icons-material/Inventory";
import PersonIcon from "@mui/icons-material/Person";
import TireList from "./components/TireList";
import Dashboard from "./components/Dashboard";
import SaleForm from "./components/SaleForm";
import "antd/dist/reset.css";
import { AuthProvider, useAuth } from "./components/AuthContext";
import Login from "./components/Login";
import { supabase } from "./supabaseClient";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import CustomerProfile from "./components/CustomerProfile";
import WorkerTracking from "./components/WorkerTracking";

const drawerWidth = 240;

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
    [theme.breakpoints.down("sm")]: {
      marginLeft: 0,
      padding: theme.spacing(1.5),
    },
  })
);

const StyledAppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    marginLeft: 0,
  },
}));

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-start",
}));

const Logo = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(3, 2),
  justifyContent: "flex-start",
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.02)'
  }
}));

const AppContent = () => {
  const { user, role, isAdmin, logout } = useAuth();
  const [tires, setTires] = useState([]);
  const [sales, setSales] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [hotelTires, setHotelTires] = useState([]);
  const [parts, setParts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(isAdmin ? "Dashboard" : "SaleForm");
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [businessProfile, setBusinessProfile] = useState({ name: 'Dost Auto Tires', logo_url: '', currency: 'LKR' });
  const [masterData, setMasterData] = useState({ brands: [], vehicles: [], services: [] });

  // Sync selected component if permissions change
  useEffect(() => {
    if (!isAdmin && (selectedComponent === "Dashboard" || selectedComponent === "InventoryHub" || selectedComponent === "Finance" || selectedComponent === "Settings")) {
      setSelectedComponent("SaleForm");
    }
  }, [isAdmin, selectedComponent]);

  // Initial Fetches and Subscriptions
  useEffect(() => {
    if (!user) return;

    const fetchData = async (table, setter) => {
      const { data, error } = await supabase.from(table).select('*');
      if (!error && data) setter(data);
    };

    // Business Profile & Master Data
    const fetchBusinessSettings = async () => {
      const { data, error } = await supabase.from('business_settings').select('*').limit(1).maybeSingle();
      if (!error && data) setBusinessProfile(data);
    };
    fetchBusinessSettings();

    const fetchMasterData = async () => {
      const { data, error } = await supabase.from('master_data').select('*');
      if (!error && data) {
        const formatted = { brands: [], vehicles: [], services: [] };
        data.forEach(item => {
          if (formatted[item.type]) formatted[item.type].push(item.value);
        });
        setMasterData(formatted);
      }
    };
    fetchMasterData();

    // Data Fetches
    fetchData('tires', setTires);
    const fetchSales = async () => {
      const { data, error } = await supabase.from('sales').select('*, sale_items(*)');
      if (!error && data) setSales(data);
    };
    fetchSales();
    fetchData('hotel_tires', setHotelTires);
    fetchData('accounts', setAccounts);
    fetchData('parts', setParts);
    fetchData('customers', setCustomers);
    fetchData('appointments', setAppointments);
    fetchData('invoices', setInvoices);
    fetchData('workers', setWorkers);
    fetchData('tasks', setTasks);
    fetchData('vehicles', setVehicles);

    // Real-time Subscriptions
    const channels = [
      'tires', 'sales', 'hotel_tires', 'accounts', 'parts',
      'customers', 'appointments', 'invoices', 'workers',
      'tasks', 'vehicles', 'business_settings', 'master_data'
    ].map(table => {
      return supabase.channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          if (table === 'master_data') fetchMasterData();
          else if (table === 'business_settings') fetchData(table, (data) => setBusinessProfile(data[0] || businessProfile));
          else if (table === 'sales') fetchSales();
          else fetchData(table, (data) => {
            const setters = {
              tires: setTires, hotel_tires: setHotelTires,
              accounts: setAccounts, parts: setParts, customers: setCustomers,
              appointments: setAppointments, invoices: setInvoices,
              workers: setWorkers, tasks: setTasks, vehicles: setVehicles
            };
            if (setters[table]) setters[table](data);
          });
        })
        .subscribe();
    });

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [user]);

  const [userProfile, setUserProfile] = useState({ name: "User", role: "", avatar: "" });

  useEffect(() => {
    if (user) {
      setUserProfile({
        name: user.email.split('@')[0].toUpperCase(),
        role: role === 'admin' ? 'Administrator' : 'Staff',
        avatar: "",
      });
    }
  }, [user, role]);

  const [notifications, setNotifications] = useState(3);
  const isMobile = useMediaQuery("(max-width:600px)");

  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [isMobile]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: { 
            main: "#1a237e",
            light: "rgba(26, 35, 126, 0.08)",
            dark: "#0d47a1"
          },
          secondary: { 
            main: "#f50057",
            light: "#ff4081"
          },
          background: { 
            default: "#f8fafd", 
            paper: "#ffffff" 
          },
          text: { 
            primary: "#1e293b", 
            secondary: "#64748b" 
          },
        },
        shape: { borderRadius: 16 },
        typography: {
          fontFamily: '"Outfit", "Inter", "Roboto", sans-serif',
          h4: { fontWeight: 900, letterSpacing: '-0.8px' },
          h6: { fontWeight: 800 },
          button: { textTransform: 'none', fontWeight: 700 },
        },
        components: {
          MuiDrawer: {
            styleOverrides: {
              paper: {
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(20px)",
                borderRight: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "none",
              }
            }
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: "rgba(248, 250, 253, 0.8)",
                backdropFilter: "blur(12px)",
                color: "#1e293b",
                borderBottom: "1px solid rgba(0,0,0,0.05)",
                boxShadow: "none",
              }
            }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: "0 4px 25px -5px rgba(0,0,0,0.04), 0 2px 10px -5px rgba(0,0,0,0.02)",
                border: "1px solid rgba(0,0,0,0.05)",
                borderRadius: 24,
              }
            }
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                padding: '10px 24px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }
              },
              containedPrimary: {
                background: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)',
              }
            }
          },
        },
      }),
    []
  );

  const addTire = async (tire) => {
    try {
      await supabase.from('tires').insert([{ ...tire }]);
    } catch (e) { console.error(e); }
  };

  const updateTire = async (tireId, updatedData) => {
    try {
      await supabase.from('tires').update(updatedData).eq('id', tireId);
    } catch (e) { console.error(e); }
  };

  const deleteTire = async (tireId) => {
    try {
      await supabase.from('tires').delete().eq('id', tireId);
    } catch (e) { console.error(e); }
  };

  const addSale = async (invoice) => {
    try {
      const { data, error } = await supabase.rpc('process_sale', { sale_payload: invoice });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return true;
    } catch (e) {
      console.error("Error processing sale: ", e);
      return false;
    }
  };

  const addHotelTire = async (hotelTire) => {
    await supabase.from('hotel_tires').insert([hotelTire]);
  };

  const updateHotelTire = async (id, updatedData) => {
    await supabase.from('hotel_tires').update(updatedData).eq('id', id);
  };

  const deleteHotelTire = async (id) => {
    await supabase.from('hotel_tires').delete().eq('id', id);
  };

  const handleDrawerToggle = () => setOpen(!open);
  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, component: "Dashboard", adminOnly: true },
    { text: "Inventory Hub", icon: <InventoryIcon />, component: "InventoryHub", adminOnly: true },
    { text: "Sales & POS", icon: <SellIcon />, component: "SaleForm" },
    { text: "Customer CRM", icon: <PersonIcon />, component: "CustomerCRM" },
    { text: "Workshop", icon: <BuildCircleIcon />, component: "Workshop" },
    { text: "Finance", icon: <AnalyticsIcon />, component: "Finance", adminOnly: true },
    { text: "Settings", icon: <SettingsIcon />, component: "Settings", adminOnly: true },
  ];

  const drawer = (
    <div>
      <Logo>
        {businessProfile.logo_url ? (
          <img src={businessProfile.logo_url} alt="Logo" style={{ height: 40, marginRight: 8 }} />
        ) : (
          <BuildCircleIcon sx={{ fontSize: 36, mr: 1.5, color: 'primary.main' }} />
        )}
        <Typography variant="h6" noWrap sx={{ fontWeight: 900, color: 'primary.main', letterSpacing: '-0.5px' }}>
          {businessProfile.name}
        </Typography>
      </Logo>
      <Divider sx={{ opacity: 0.6 }} />
      <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
        <Avatar src={userProfile.avatar} alt={userProfile.name} sx={{ mr: 2 }} />
        <Box>
          <Typography variant="subtitle1">{userProfile.name}</Typography>
          <Typography variant="body2" color="textSecondary">{userProfile.role}</Typography>
        </Box>
      </Box>
      <Divider />
      <List>
        {menuItems
          .filter(item => !item.adminOnly || isAdmin)
          .map((item) => (
            <ListItem 
              button 
              key={item.text} 
              onClick={() => { setSelectedComponent(item.component); if (isMobile) setOpen(false); }} 
              selected={selectedComponent === item.component}
              sx={{
                mx: 1.5,
                my: 0.5,
                borderRadius: 3,
                width: 'auto',
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  '&:hover': { bgcolor: 'primary.light' }
                },
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.02)',
                  transform: 'translateX(4px)'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 45, color: 'text.secondary', transition: 'color 0.2s' }}>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontWeight: selectedComponent === item.component ? 800 : 600,
                  fontSize: '0.9rem'
                }} 
              />
            </ListItem>
          ))}
      </List>
    </div>
  );

  const renderComponent = () => {
    const commonProps = { businessProfile, masterData };

    switch (selectedComponent) {
      case "Dashboard": 
        return isAdmin ? <Dashboard tires={tires} sales={sales} {...commonProps} /> : <SaleForm tires={tires} addSale={addSale} accounts={accounts} workers={workers} {...commonProps} />;
      
      case "InventoryHub": 
        return isAdmin ? (
          <TireList 
            tires={tires || []} addTire={addTire} updateTire={updateTire} deleteTire={deleteTire} 
            parts={parts || []} hotelTires={hotelTires || []} 
            {...commonProps} 
          />
        ) : <SaleForm tires={tires} addSale={addSale} accounts={accounts} workers={workers} {...commonProps} />;
      
      case "SaleForm": 
        return <SaleForm tires={tires || []} addSale={addSale} accounts={accounts || []} workers={workers || []} {...commonProps} />;
      
      case "CustomerCRM": 
        return <CustomerProfile 
          customers={customers || []} vehicles={vehicles || []} accounts={accounts || []} 
          hotelTires={hotelTires || []} appointments={appointments || []} sales={sales || []} 
          {...commonProps} 
        />;
      
      case "Workshop": 
        return <WorkerTracking workersList={workers || []} tasksList={tasks || []} {...commonProps} />;
      
      case "Finance": 
        return isAdmin ? <Reports tires={tires || []} sales={sales || []} accounts={accounts || []} invoices={invoices || []} {...commonProps} /> : <SaleForm tires={tires} addSale={addSale} accounts={accounts} workers={workers} {...commonProps} />;
      
      case "Settings": 
        return isAdmin ? <Settings {...commonProps} /> : <SaleForm tires={tires} addSale={addSale} accounts={accounts} workers={workers} {...commonProps} />;
      
      default: return isAdmin ? <Dashboard tires={tires} sales={sales} {...commonProps} /> : <SaleForm tires={tires} addSale={addSale} accounts={accounts} workers={workers} {...commonProps} />;
    }
  };

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: "flex", minHeight: '100vh', bgcolor: 'background.default' }}>
          <StyledAppBar position="fixed" open={open}>
            <Toolbar>
              <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2, ...(open && { display: { sm: "none" } }) }}><MenuIcon /></IconButton>
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" noWrap sx={{ color: 'primary.main', fontWeight: 800 }}>
                  {businessProfile.name}
                </Typography>
                <Divider orientation="vertical" flexItem sx={{ mx: 2, height: 24, alignSelf: 'center', borderColor: 'rgba(0,0,0,0.1)' }} />
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  {selectedComponent}
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                size="small" 
                startIcon={<SellIcon />} 
                onClick={() => setSelectedComponent("SaleForm")}
                sx={{ 
                  mr: 2, 
                  display: { xs: 'none', md: 'flex' },
                  borderColor: 'rgba(0,0,0,0.1)',
                  color: 'text.secondary'
                }}
              >
                QUICK POS
              </Button>
              <IconButton color="inherit" sx={{ mr: 1 }}><Badge badgeContent={notifications} color="secondary"><NotificationsIcon /></Badge></IconButton>
              <Tooltip title="Account Settings">
                <IconButton onClick={handleMenu} sx={{ p: 0.5 }}>
                  <Avatar
                    src={userProfile.avatar}
                    alt={userProfile.name}
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: 'primary.main',
                      border: '2px solid white',
                      boxShadow: '0 0 0 2px rgba(26, 35, 126, 0.2)'
                    }}
                  >
                    {userProfile.name.charAt(0)}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    minWidth: 180,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                    borderRadius: 2
                  }
                }}
              >
                <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                  <ListItemIcon><ExitToAppIcon fontSize="small" /></ListItemIcon>
                  Log Out
                </MenuItem>
              </Menu>
            </Toolbar>
          </StyledAppBar>
          <Drawer sx={{ width: drawerWidth, flexShrink: 0, "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" } }} variant={isMobile ? "temporary" : "persistent"} anchor="left" open={open} onClose={() => setOpen(false)}>
            {drawer}
          </Drawer>
          <Main open={open}>
            <DrawerHeader />
            <Container maxWidth={false} sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 4 } }}>
              <Fade in={true} timeout={500}>
                <Box>{renderComponent()}</Box>
              </Fade>
            </Container>
          </Main>
        </Box>
      </Router>
    </ThemeProvider>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
