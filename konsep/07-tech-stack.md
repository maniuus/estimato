# Tech Stack — Master RAB Konstruksi

## Arsitektur

```
┌──────────────────────────────────────────────────┐
│                   Electron Main                  │
│  ┌─────────────┐  ┌──────────────┐               │
│  │ Main Process │  │   IPC Bridge │               │
│  │  (Node.js)   │◄─┤  (context    │               │
│  │  - SQLite    │  │   bridge)    │               │
│  │  - File I/O  │  └──────┬───────┘               │
│  │  - Print     │         │                        │
│  └─────────────┘         │                        │
└──────────────────────────┼────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────┐
│              Renderer Process                     │
│  ┌──────────────────────────────────────────┐     │
│  │        React + TypeScript                │     │
│  │  ┌────────┐ ┌──────────┐ ┌──────────┐   │     │
│  │  │  UI    │ │ Zustand  │ │ Router   │   │     │
│  │  │ (shadcn│ │ (state)  │ │ (react-  │   │     │
│  │  │ /tw)   │ │          │ │ router)  │   │     │
│  │  └────────┘ └──────────┘ └──────────┘   │     │
│  └──────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

## Stack Detail

### Frontend (Renderer)
| Teknologi | Versi | Fungsi |
|---|---|---|
| **Electron** | 28+ | Framework desktop |
| **React** | 18+ | Library UI |
| **TypeScript** | 5+ | Type safety |
| **Tailwind CSS** | 3+ | Utility CSS |
| **shadcn/ui** | latest | Komponen UI siap pakai |
| **Zustand** | 4+ | State management |
| **React Router** | 6+ | Routing halaman |
| **React Hook Form** | 7+ | Form handling |
| **Zod** | 3+ | Validasi form & data |
| **TanStack Table** | 8+ | Tabel interaktif (sort, filter, virtual) |
| **Recharts** | 2+ | Grafik (pie, bar) |

### Backend (Main Process)
| Teknologi | Fungsi |
|---|---|
| **better-sqlite3** | Database SQLite (synchronous, performant) |
| **electron-store** | Config/key-value storage |
| **electron-log** | Logging |
| **exceljs** | Read/write Excel (.xlsx) |
| **jsPDF** + **jspdf-autotable** | Generate PDF RAB |

### Build & Tooling
| Teknologi | Fungsi |
|---|---|
| **electron-vite** | Build tool (Vite-based, fast HMR) |
| **electron-builder** | Packaging & distribusi (.exe/.msi) |
| **ESLint** + **Prettier** | Linting & formatting |
| **Husky** + **lint-staged** | Git hooks |
| **Vitest** | Unit testing |

## Database

| Aspek | Pilihan |
|---|---|
| Engine | **SQLite** (via `better-sqlite3`) |
| ORM / Query | **Prisma** (optional, untuk migration & type safety) atau **raw SQL** |
| Lokasi file | `%APPDATA%/master-rab/data.sqlite` |
| Backup | Export ke `.zip` (sqlite + attachments) |

## Alasan Pemilihan

| Alasan | Detail |
|---|---|
| **Desktop** | QS/estimator sering kerja offline, butuh akses cepat |
| **Electron** | Cross-platform, UI modern dengan web stack |
| **React + TS** | Developer productivity, type safety |
| **SQLite** | Database embedded, zero config, performa tinggi |
| **better-sqlite3** | Synchronous = kode sederhana, performa 5x lebih cepat dari sqlite3 async |
| **shadcn/ui** | Komponen accessible, kustomisasi mudah, bundle kecil |
| **Zustand** | Simple state management, tanpa boilerplate |

## Struktur Project

```
master-rab/
├── electron/
│   ├── main/
│   │   ├── index.ts          # Entry main process
│   │   ├── database.ts       # SQLite connection & queries
│   │   ├── ipc-handlers.ts   # IPC handlers
│   │   └── printer.ts        # Print & export logic
│   └── preload/
│       └── index.ts          # Context bridge API
├── src/
│   ├── main.tsx              # Entry React
│   ├── App.tsx               # Root component + routing
│   ├── components/           # Shared UI components
│   ├── pages/                # Halaman per modul
│   ├── stores/               # Zustand stores
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utilities & helpers
│   └── types/                # TypeScript type definitions
├── resources/                # Icons, templates, assets
├── package.json
├── electron.vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```
