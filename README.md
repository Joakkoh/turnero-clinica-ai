# turnero-clinica-ai

Small clinic management app meant to run on a local server and be used from the clinic's LAN. It lists **doctors** (name, license, room number when currently present) and **patients** (name, ID, phone), lets staff filter both tables and add new records.

## Stack

| Part     | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Database | PostgreSQL 16 (Docker container, data in the `pgdata` volume)    |
| Backend  | Go (`net/http` + `pgx`), simple REST API, no authentication      |
| Frontend | Vite + React + TypeScript + Material UI, client-side rendering only, served by nginx |

Everything runs with Docker Compose. nginx serves the static frontend and proxies `/api` to the backend, so only one port is exposed. The database and backend are not published on the host.

## Run

```bash
docker compose up -d --build
```

Then open `http://<server-ip>/` from any machine on the LAN. Optional configuration (port, DB credentials) goes in a `.env` file; see `.env.example`.

```bash
docker compose logs -f      # follow logs
docker compose down         # stop (data is kept)
docker compose down -v      # stop and delete the database
```

The first build needs internet access to pull images and dependencies. After that the app runs fully offline (no CDN fonts or scripts).

## Features

- **Doctors** tab: name, license and room. The room shows only while the doctor is present; otherwise "No presente". The room button lets staff set the room or mark the doctor as absent.
- **Patients** tab: name, ID and phone.
- Live search on each table (name, license or room for doctors; name, ID or phone for patients).
- "Nuevo doctor" / "Nuevo paciente" forms. License and patient ID must be unique.

The UI text is in Spanish.

## API

| Method | Path                       | Description                                              |
| ------ | -------------------------- | -------------------------------------------------------- |
| GET    | `/api/health`              | Health check (pings the database)                        |
| GET    | `/api/doctors?q=`          | List doctors, optionally filtered by name/license/room   |
| POST   | `/api/doctors`             | Create `{ "name", "license", "roomNumber"? }`            |
| PATCH  | `/api/doctors/{id}/room`   | Set `{ "roomNumber": "3" }`, or `null` to mark as absent |
| GET    | `/api/patients?q=`         | List patients, optionally filtered by name/ID/phone      |
| POST   | `/api/patients`            | Create `{ "name", "documentId", "phone"? }`              |

Errors are returned as `{ "error": "message" }` (400 invalid input, 404 not found, 409 duplicate license/ID).

## Development

```bash
# Backend (needs a Postgres reachable via DATABASE_URL)
cd backend && DATABASE_URL=postgres://turnero:turnero@localhost:5432/turnero?sslmode=disable go run .

# Frontend (proxies /api to localhost:8080)
cd frontend && npm install && npm run dev
```

## Notes

- There is no authentication: run it only on a trusted LAN and do not expose it to the internet.
- `backend/go.sum` is generated during the Docker build (`go mod tidy`). Run `go mod tidy` in `backend/` and commit the result if you want reproducible builds; do the same with `package-lock.json` in `frontend/`.
