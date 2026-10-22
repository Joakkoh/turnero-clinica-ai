import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { createDoctor } from '../api';
import type { Doctor } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (doctor: Doctor) => void;
}

export default function DoctorDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [license, setLicense] = useState('');
  const [room, setRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setLicense('');
    setRoom('');
    setError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const canSubmit = name.trim() !== '' && license.trim() !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);
    try {
      const doctor = await createDoctor({
        name: name.trim(),
        license: license.trim(),
        roomNumber: room.trim() || null,
      });
      reset();
      onCreated(doctor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Nuevo doctor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="Matrícula"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Consultorio"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              helperText="Opcional. Dejar vacío si el doctor no está presente."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit || saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
