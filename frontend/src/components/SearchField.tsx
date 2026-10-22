import { IconButton, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export default function SearchField({ value, onChange, placeholder }: Props) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{ flex: 1, minWidth: 240, maxWidth: 460, bgcolor: 'background.paper' }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton size="small" aria-label="Limpiar búsqueda" onClick={() => onChange('')}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
        htmlInput: { 'aria-label': placeholder },
      }}
    />
  );
}
