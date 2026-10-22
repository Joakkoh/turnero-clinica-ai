package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Doctor is a physician. RoomNumber is nil when the doctor is not currently
// present in any room.
type Doctor struct {
	ID         int64   `json:"id"`
	Name       string  `json:"name"`
	License    string  `json:"license"`
	RoomNumber *string `json:"roomNumber"`
}

// Patient is a person attended at the clinic.
type Patient struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	DocumentID string `json:"documentId"`
	Phone      string `json:"phone"`
}

var (
	ErrDuplicate = errors.New("duplicate")
	ErrNotFound  = errors.New("not found")
)

const schema = `
CREATE TABLE IF NOT EXISTS doctors (
	id          BIGSERIAL PRIMARY KEY,
	name        TEXT NOT NULL,
	license     TEXT NOT NULL UNIQUE,
	room_number TEXT,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
	id          BIGSERIAL PRIMARY KEY,
	name        TEXT NOT NULL,
	document_id TEXT NOT NULL UNIQUE,
	phone       TEXT NOT NULL DEFAULT '',
	created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

// Store wraps the Postgres connection pool.
type Store struct {
	pool *pgxpool.Pool
}

// NewStore connects to Postgres (retrying while the database container boots)
// and makes sure the schema exists.
func NewStore(ctx context.Context, dsn string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("invalid database configuration: %w", err)
	}

	const attempts = 30
	var lastErr error
	for i := 1; i <= attempts; i++ {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		lastErr = pool.Ping(pingCtx)
		cancel()
		if lastErr == nil {
			break
		}
		log.Printf("waiting for database (%d/%d): %v", i, attempts, lastErr)
		select {
		case <-ctx.Done():
			pool.Close()
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
	if lastErr != nil {
		pool.Close()
		return nil, fmt.Errorf("database unreachable: %w", lastErr)
	}

	if _, err := pool.Exec(ctx, schema); err != nil {
		pool.Close()
		return nil, fmt.Errorf("migrating schema: %w", err)
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close()                         { s.pool.Close() }
func (s *Store) Ping(ctx context.Context) error { return s.pool.Ping(ctx) }

// likePattern turns user input into a safe, case-insensitive "contains" pattern.
func likePattern(q string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + r.Replace(q) + "%"
}

// mapError translates driver errors into the package's sentinel errors.
func mapError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return ErrDuplicate
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

// ---- Doctors ---------------------------------------------------------------

const doctorCols = `id, name, license, room_number`

// ListDoctors returns doctors whose name, license or room matches q (all when q is empty).
func (s *Store) ListDoctors(ctx context.Context, q string) ([]Doctor, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if q == "" {
		rows, err = s.pool.Query(ctx,
			`SELECT `+doctorCols+` FROM doctors ORDER BY lower(name), id`)
	} else {
		rows, err = s.pool.Query(ctx,
			`SELECT `+doctorCols+` FROM doctors
			  WHERE name ILIKE $1 OR license ILIKE $1 OR room_number ILIKE $1
			  ORDER BY lower(name), id`, likePattern(q))
	}
	if err != nil {
		return nil, err
	}
	out, err := pgx.CollectRows(rows, pgx.RowToStructByPos[Doctor])
	if err != nil {
		return nil, err
	}
	if out == nil {
		out = []Doctor{}
	}
	return out, nil
}

func (s *Store) CreateDoctor(ctx context.Context, d Doctor) (Doctor, error) {
	var out Doctor
	err := s.pool.QueryRow(ctx,
		`INSERT INTO doctors (name, license, room_number) VALUES ($1, $2, $3)
		 RETURNING `+doctorCols, d.Name, d.License, d.RoomNumber).
		Scan(&out.ID, &out.Name, &out.License, &out.RoomNumber)
	return out, mapError(err)
}

// SetDoctorRoom sets (or clears, when room is nil) the room a doctor is currently in.
func (s *Store) SetDoctorRoom(ctx context.Context, id int64, room *string) (Doctor, error) {
	var out Doctor
	err := s.pool.QueryRow(ctx,
		`UPDATE doctors SET room_number = $2 WHERE id = $1 RETURNING `+doctorCols, id, room).
		Scan(&out.ID, &out.Name, &out.License, &out.RoomNumber)
	return out, mapError(err)
}

// ---- Patients --------------------------------------------------------------

const patientCols = `id, name, document_id, phone`

// ListPatients returns patients whose name, ID or phone matches q (all when q is empty).
func (s *Store) ListPatients(ctx context.Context, q string) ([]Patient, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if q == "" {
		rows, err = s.pool.Query(ctx,
			`SELECT `+patientCols+` FROM patients ORDER BY lower(name), id`)
	} else {
		rows, err = s.pool.Query(ctx,
			`SELECT `+patientCols+` FROM patients
			  WHERE name ILIKE $1 OR document_id ILIKE $1 OR phone ILIKE $1
			  ORDER BY lower(name), id`, likePattern(q))
	}
	if err != nil {
		return nil, err
	}
	out, err := pgx.CollectRows(rows, pgx.RowToStructByPos[Patient])
	if err != nil {
		return nil, err
	}
	if out == nil {
		out = []Patient{}
	}
	return out, nil
}

func (s *Store) CreatePatient(ctx context.Context, p Patient) (Patient, error) {
	var out Patient
	err := s.pool.QueryRow(ctx,
		`INSERT INTO patients (name, document_id, phone) VALUES ($1, $2, $3)
		 RETURNING `+patientCols, p.Name, p.DocumentID, p.Phone).
		Scan(&out.ID, &out.Name, &out.DocumentID, &out.Phone)
	return out, mapError(err)
}
