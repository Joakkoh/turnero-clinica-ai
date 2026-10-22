import { useState } from 'react';
import { AppBar, Box, Container, Snackbar, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DoctorsTab from './components/DoctorsTab';
import PatientsTab from './components/PatientsTab';

type TabKey = 'doctors' | 'patients';

export default function App() {
  const [tab, setTab] = useState<TabKey>('doctors');
  const [toast, setToast] = useState<string | null>(null);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <LocalHospitalIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" component="h1">
            Turnero Clínica
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, value: TabKey) => setTab(value)}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Doctores" value="doctors" />
          <Tab label="Pacientes" value="patients" />
        </Tabs>

        {tab === 'doctors' ? (
          <DoctorsTab onNotify={setToast} />
        ) : (
          <PatientsTab onNotify={setToast} />
        )}
      </Container>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Box>
  );
}
