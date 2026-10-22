package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maxBodyBytes = 1 << 20
	maxNameLen   = 200
	maxFieldLen  = 50
)

// NewRouter wires the REST API.
func NewRouter(store *Store) http.Handler {
	a := &api{store: store}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", a.health)

	mux.HandleFunc("GET /api/doctors", a.listDoctors)
	mux.HandleFunc("POST /api/doctors", a.createDoctor)
	mux.HandleFunc("PATCH /api/doctors/{id}/room", a.setDoctorRoom)

	mux.HandleFunc("GET /api/patients", a.listPatients)
	mux.HandleFunc("POST /api/patients", a.createPatient)

	return logRequests(mux)
}

type api struct {
	store *Store
}

func (a *api) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := a.store.Ping(ctx); err != nil {
		writeError(w, http.StatusServiceUnavailable, "base de datos no disponible")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ---- Doctors ---------------------------------------------------------------

func (a *api) listDoctors(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	doctors, err := a.store.ListDoctors(r.Context(), q)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, doctors)
}

type doctorInput struct {
	Name       string  `json:"name"`
	License    string  `json:"license"`
	RoomNumber *string `json:"roomNumber"`
}

func (a *api) createDoctor(w http.ResponseWriter, r *http.Request) {
	var in doctorInput
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.License = strings.TrimSpace(in.License)
	in.RoomNumber = normalizeRoom(in.RoomNumber)

	if msg := firstError(
		required("el nombre", in.Name, maxNameLen),
		required("la matrícula", in.License, maxFieldLen),
		optional("el consultorio", in.RoomNumber, maxFieldLen),
	); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	doctor, err := a.store.CreateDoctor(r.Context(), Doctor{
		Name: in.Name, License: in.License, RoomNumber: in.RoomNumber,
	})
	if errors.Is(err, ErrDuplicate) {
		writeError(w, http.StatusConflict, "Ya existe un doctor con esa matrícula")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, doctor)
}

type roomInput struct {
	RoomNumber *string `json:"roomNumber"`
}

// setDoctorRoom records which room a doctor is currently in; a null or empty
// roomNumber marks the doctor as not present.
func (a *api) setDoctorRoom(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeError(w, http.StatusBadRequest, "id inválido")
		return
	}
	var in roomInput
	if !decodeJSON(w, r, &in) {
		return
	}
	room := normalizeRoom(in.RoomNumber)
	if msg := optional("el consultorio", room, maxFieldLen); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	doctor, err := a.store.SetDoctorRoom(r.Context(), id, room)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, "doctor no encontrado")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, doctor)
}

// ---- Patients --------------------------------------------------------------

func (a *api) listPatients(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	patients, err := a.store.ListPatients(r.Context(), q)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, patients)
}

type patientInput struct {
	Name       string `json:"name"`
	DocumentID string `json:"documentId"`
	Phone      string `json:"phone"`
}

func (a *api) createPatient(w http.ResponseWriter, r *http.Request) {
	var in patientInput
	if !decodeJSON(w, r, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.DocumentID = strings.TrimSpace(in.DocumentID)
	in.Phone = strings.TrimSpace(in.Phone)

	phone := &in.Phone
	if in.Phone == "" {
		phone = nil
	}
	if msg := firstError(
		required("el nombre", in.Name, maxNameLen),
		required("el ID", in.DocumentID, maxFieldLen),
		optional("el teléfono", phone, maxFieldLen),
	); msg != "" {
		writeError(w, http.StatusBadRequest, msg)
		return
	}

	patient, err := a.store.CreatePatient(r.Context(), Patient{
		Name: in.Name, DocumentID: in.DocumentID, Phone: in.Phone,
	})
	if errors.Is(err, ErrDuplicate) {
		writeError(w, http.StatusConflict, "Ya existe un paciente con ese ID")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, patient)
}

// ---- Helpers ---------------------------------------------------------------

// normalizeRoom trims the room and converts empty values to nil ("not present").
func normalizeRoom(room *string) *string {
	if room == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*room)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func required(label, value string, max int) string {
	if value == "" {
		return "Falta " + label
	}
	if utf8.RuneCountInString(value) > max {
		return "Demasiado largo: " + label
	}
	return ""
}

func optional(label string, value *string, max int) string {
	if value != nil && utf8.RuneCountInString(*value) > max {
		return "Demasiado largo: " + label
	}
	return ""
}

func firstError(msgs ...string) string {
	for _, m := range msgs {
		if m != "" {
			return m
		}
	}
	return ""
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "JSON inválido")
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encoding response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func serverError(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	writeError(w, http.StatusInternalServerError, "error interno del servidor")
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s -> %d (%s)", r.Method, r.URL.RequestURI(), rec.status, time.Since(start).Round(time.Millisecond))
	})
}
