import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import { setDoctorRoom } from '../api';
import type { Doctor } from '../types';

interface Props {
  /** Doctor being edited; the dialog is open while this is non-null. */
  doctor: Doctor | null;
  onClose: () => void;
  onSaved: (doctor: Doctor) => void;
}

/** Lets staff record which room a doctor is in, or mark them as not present. */
export default function RoomDialog({ doctor, onClose, onSaved }: Props) {
  const [room, setRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (doctor) {
      setRoom(doctor.roomNumber ?? '');
      setError(null);
    }
  }, [doctor]);

  const save = async (value: string | null) => {
    if (!doctor || saving) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await setDoctorRoom(doctor.id, value));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = room.trim();
    if (trimmed) void save(trimmed);
  };

  return (
    <Dialog open={doctor !== null} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Consultorio</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{doctor?.name}</DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label="Número de consultorio"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            autoFocus
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          {doctor?.roomNumber && (
            <Button color="warning" onClick={() => void save(null)} disabled={saving}>
              Marcar ausente
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={room.trim() === '' || saving}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
