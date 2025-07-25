import DashboardLinks from '../components/DashboardLinks';
import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Button, Container, Box, 
  Avatar, Menu, MenuItem, IconButton, Divider, ListItemIcon 
} from '@mui/material';
import { 
  AccountCircle as AccountCircleIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  ExitToApp as ExitToAppIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Modificado para aceitar explicitamente a propriedade children
const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleClose();
    if (user?.role === 'admin') {
      navigate('/admin/profile');
    } else {
      navigate('/patient/profile');
    }
  };

  const handleDashboard = () => {
    handleClose();
    if (user?.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/patient/dashboard');
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
              <img 
                src="/images/logo.png" 
                alt="Logo" 
                style={{ height: '40px', marginRight: '10px' }} 
              />
              <Typography variant="h6" component="div">
                Sistema de Receitas
              </Typography>
            </Link>
          </Box>

          {/* Desktop Menu */}
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Button color="inherit" component={Link} to="/">
              Início
            </Button>
            <Button color="inherit" component={Link} to="/request-prescription">
              Solicitar Receita
            </Button>
            
            {user ? (
              <>
                <IconButton
                  size="large"
                  aria-label="conta do usuário"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
                >
                  <AccountCircleIcon />
                </IconButton>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem onClick={handleDashboard}>
                    <ListItemIcon>
                      <DashboardIcon fontSize="small" />
                    </ListItemIcon>
                    Dashboard
                  </MenuItem>
                  <MenuItem onClick={handleProfile}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    Perfil
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <ExitToAppIcon fontSize="small" />
                    </ListItemIcon>
                    Sair
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button color="inherit" component={Link} to="/login">
                  Login
                </Button>
                <Button color="inherit" component={Link} to="/register">
                  Cadastro
                </Button>
              </>
            )}
          </Box>

          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="end"
            onClick={toggleMobileMenu}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Mobile Menu */}
          <Menu
            id="mobile-menu"
            anchorEl={document.body}
            open={mobileMenuOpen}
            onClose={toggleMobileMenu}
            PaperProps={{
              sx: {
                width: '100%',
                maxWidth: '100%',
                top: '56px !important',
                left: '0 !important',
              },
            }}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
          >
            <MenuItem component={Link} to="/" onClick={toggleMobileMenu}>
              Início
            </MenuItem>
            <MenuItem component={Link} to="/request-prescription" onClick={toggleMobileMenu}>
              Solicitar Receita
            </MenuItem>
            
            {user ? (
              <>
                <MenuItem onClick={() => { toggleMobileMenu(); handleDashboard(); }}>
                  <ListItemIcon>
                    <DashboardIcon fontSize="small" />
                  </ListItemIcon>
                  Dashboard
                </MenuItem>
                <MenuItem onClick={() => { toggleMobileMenu(); handleProfile(); }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  Perfil
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { toggleMobileMenu(); handleLogout(); }}>
                  <ListItemIcon>
                    <ExitToAppIcon fontSize="small" />
                  </ListItemIcon>
                  Sair
                </MenuItem>
              </>
            ) : (
              <>
                <MenuItem component={Link} to="/login" onClick={toggleMobileMenu}>
                  Login
                </MenuItem>
                <MenuItem component={Link} to="/register" onClick={toggleMobileMenu}>
                  Cadastro
                </MenuItem>
              </>
            )}
          </Menu>
        </Toolbar>
      </AppBar>
     <DashboardLinks />
      <Container component="main" sx={{ flexGrow: 1, py: 4 }}>
        {/* Renderiza children em vez de Outlet */}
        {children || <Outlet />}
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) => theme.palette.grey[200],
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Dr. Paulo Donadel - Sistema de Gerenciamento de Receitas Médicas
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;
