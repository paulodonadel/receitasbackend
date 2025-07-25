import React from 'react';
import { AppBar, Toolbar, Typography, Box, Avatar, Button, Chip, Menu, MenuItem, IconButton, useMediaQuery } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditIcon from '@mui/icons-material/Edit';
import { useTheme } from '@mui/material/styles';

const logoUrl = '/images/logo.png';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    if (user?.role === 'admin') {
      navigate('/admin/profile');
    } else {
      navigate('/patient/profile');
    }
    handleClose();
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="sticky" color="primary" sx={{ marginBottom: 3, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Link
          to={user ? (user.role === 'admin' ? "/admin/dashboard" : "/patient/dashboard") : "/login"}
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}
        >
          <Avatar src={logoUrl} alt="Logomarca da Clínica" sx={{ mr: 2, width: 48, height: 48, backgroundColor: 'white', padding: '4px', border: '1px solid #ccc' }} variant="rounded" />
          <Typography variant={isMobile ? "h6" : "h5"} component="div" sx={{ flexGrow: 1, fontWeight: 'bold', fontSize: isMobile ? 18 : 24 }}>
            Sistema de Receitas
          </Typography>
        </Link>

        {user && (
          isMobile ? (
            <>
              <IconButton color="inherit" onClick={handleMenu} size="large">
                <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountCircleIcon fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user.name || user.email}
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem onClick={handleProfile}>
                  <EditIcon fontSize="small" sx={{ mr: 1 }} />
                  Meu Perfil
                </MenuItem>
                <MenuItem onClick={() => { handleClose(); handleLogout(); }}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Sair
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={<AccountCircleIcon />}
                label={user.name || user.email}
                variant="outlined"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.7)', '.MuiChip-icon': { color: 'white' } }}
              />
              <Button
                color="inherit"
                onClick={handleProfile}
                startIcon={<EditIcon />}
                variant="outlined"
                sx={{ borderColor: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' } }}
              >
                Perfil
              </Button>
              <Button
                color="inherit"
                onClick={handleLogout}
                startIcon={<LogoutIcon />}
                variant="outlined"
                sx={{ borderColor: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' } }}
              >
                Sair
              </Button>
            </Box>
          )
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;


