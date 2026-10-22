import type { Doctor, DoctorInput, Patient, PatientInput } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error('No se pudo conectar con el servidor');
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Body was not JSON; keep the generic message.
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

const withQuery = (q: string) => (q ? `?q=${encodeURIComponent(q)}` : '');

export const listDoctors = (q: string, signal?: AbortSignal) =>
  request<Doctor[]>(`/doctors${withQuery(q)}`, { signal });

export const createDoctor = (input: DoctorInput) =>
  request<Doctor>('/doctors', { method: 'POST', body: JSON.stringify(input) });

export const setDoctorRoom = (id: number, roomNumber: string | null) =>
  request<Doctor>(`/doctors/${id}/room`, {
    method: 'PATCH',
    body: JSON.stringify({ roomNumber }),
  });

export const listPatients = (q: string, signal?: AbortSignal) =>
  request<Patient[]>(`/patients${withQuery(q)}`, { signal });

export const createPatient = (input: PatientInput) =>
  request<Patient>('/patients', { method: 'POST', body: JSON.stringify(input) });
