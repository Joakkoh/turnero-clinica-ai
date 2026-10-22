import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { listPatients } from '../api';
import { useDebouncedValue, useList } from '../hooks';
import PatientDialog from './PatientDialog';
import SearchField from './SearchField';

interface Props {
  onNotify: (message: string) => void;
}

export default function PatientsTab({ onNotify }: Props) {
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const { items, loading, error, reload } = useList(listPatients, query);

  const [adding, setAdding] = useState(false);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, ID o teléfono"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)}>
          Nuevo paciente
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined">
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Teléfono</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((patient) => (
                <TableRow key={patient.id} hover>
                  <TableCell>{patient.name}</TableCell>
                  <TableCell>{patient.documentId}</TableCell>
                  <TableCell>{patient.phone || '—'}</TableCell>
                </TableRow>
              ))}
              {!loading && items.length === 0 && !error && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {query
                      ? `Sin resultados para “${query}”`
                      : 'Todavía no hay pacientes registrados'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="caption" color="text.secondary">
        {items.length} {items.length === 1 ? 'paciente' : 'pacientes'}
      </Typography>

      <PatientDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(patient) => {
          setAdding(false);
          reload();
          onNotify(`Paciente ${patient.name} agregado`);
        }}
      />
    </Stack>
  );
}
