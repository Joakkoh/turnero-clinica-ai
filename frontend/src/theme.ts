import { createTheme } from '@mui/material/styles';

// System font stack on purpose: the app runs on a LAN that may have no internet,
// so nothing is loaded from external CDNs.
export default createTheme({
  palette: {
    primary: { main: '#0b7285' },
    background: { default: '#f4f7f9' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});
