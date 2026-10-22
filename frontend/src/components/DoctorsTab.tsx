import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { listDoctors } from '../api';
import { useDebouncedValue, useList } from '../hooks';
import type { Doctor } from '../types';
import DoctorDialog from './DoctorDialog';
import RoomDialog from './RoomDialog';
import SearchField from './SearchField';

interface Props {
  onNotify: (message: string) => void;
}

export default function DoctorsTab({ onNotify }: Props) {
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim());
  const { items, loading, error, reload } = useList(listDoctors, query);

  const [adding, setAdding] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Doctor | null>(null);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, matrícula o consultorio"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)}>
          Nuevo doctor
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
                <TableCell sx={{ fontWeight: 600 }}>Matrícula</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Consultorio</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((doctor) => (
                <TableRow key={doctor.id} hover>
                  <TableCell>{doctor.name}</TableCell>
                  <TableCell>{doctor.license}</TableCell>
                  <TableCell>
                    {doctor.roomNumber ? (
                      <Chip label={doctor.roomNumber} color="success" size="small" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No presente
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Cambiar consultorio">
                      <IconButton
                        size="small"
                        aria-label={`Cambiar consultorio de ${doctor.name}`}
                        onClick={() => setEditingRoom(doctor)}
                      >
                        <MeetingRoomIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && items.length === 0 && !error && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {query
                      ? `Sin resultados para “${query}”`
                      : 'Todavía no hay doctores registrados'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Typography variant="caption" color="text.secondary">
        {items.length} {items.length === 1 ? 'doctor' : 'doctores'}
      </Typography>

      <DoctorDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(doctor) => {
          setAdding(false);
          reload();
          onNotify(`Doctor ${doctor.name} agregado`);
        }}
      />
      <RoomDialog
        doctor={editingRoom}
        onClose={() => setEditingRoom(null)}
        onSaved={(doctor) => {
          setEditingRoom(null);
          reload();
          onNotify(
            doctor.roomNumber
              ? `${doctor.name} ahora está en el consultorio ${doctor.roomNumber}`
              : `${doctor.name} marcado como ausente`,
          );
        }}
      />
    </Stack>
  );
}
