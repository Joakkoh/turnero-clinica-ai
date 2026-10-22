export interface Doctor {
  id: number;
  name: string;
  license: string;
  /** Room the doctor is currently in; null when not present. */
  roomNumber: string | null;
}

export interface Patient {
  id: number;
  name: string;
  documentId: string;
  phone: string;
}

export interface DoctorInput {
  name: string;
  license: string;
  roomNumber: string | null;
}

export interface PatientInput {
  name: string;
  documentId: string;
  phone: string;
}
