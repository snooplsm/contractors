import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  CssBaseline,
  Drawer,
  Box,
  List,
  ListItemText,
  IconButton,
  ListItemButton,
  Avatar,
  ListItemAvatar
} from '@mui/material';
import ContractorList from './ContractorList';
import MenuIcon from '@mui/icons-material/Menu';
import {APIProvider} from '@vis.gl/react-google-maps';

const drawerWidth = 240;

function App() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        NJ Licensed Contractors
      </Typography>
      <List>
        <ListItemButton  key={"Made in Mercer County"}>
        <ListItemAvatar>
          <Avatar><img
            alt="Item Image"
            src="mercercounty.svg"
            width={"80%"}
            height={"80%"}
          />
          </Avatar>
        </ListItemAvatar>
          <ListItemText primary={"Made in Mercer County"} />
        </ListItemButton>
      </List>
    </Box>
  );

  console.log('key', import.meta.env.VITE_REACT_APP_GOOGLE_API_KEY)
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            NJ Licensed Contractors
          </Typography>
          {/* <Button color="inherit">Login</Button> */}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <ContractorList/>
      </Box>
    </Box>
  );
}

export default App;