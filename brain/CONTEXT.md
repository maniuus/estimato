# Brain — Master RAB Konstruksi

Proyek ini adalah aplikasi **Desktop Master RAB Konstruksi** berbasis Electron + React + TypeScript.

---

## Arsitektur (Clean Architecture)

```
electron/main/         ← Main Process (Node.js)
├── database/
│   ├── connection.ts  ← SQLite connection singleton
│   ├── migrations/    ← Schema migrations (SQL)
│   └── repositories/  ← Repository pattern (data access)
├── services/          ← Business logic layer
└── ipc/
    └── handlers.ts    ← IPC handler registration

electron/preload/
└── index.ts           ← Context bridge (expose API to renderer)

src/                   ← Renderer Process (React)
├── main.tsx           ← React entry point
├── App.tsx            ← Root + router
├── components/
│   ├── ui/            ← Base UI components
│   └── layout/        ← Layout (sidebar, header)
├── pages/             ← Page components per modul
├── stores/            ← Zustand state management
├── services/          ← IPC call wrappers
├── hooks/             ← Custom React hooks
├── types/             ← Shared TypeScript types
└── lib/               ← Utilities (format, validation)
```

## Alur Data (Layered)
```
Renderer (React)
  ↓ Zustand store calls
src/services/*.ts  ← IPC call wrappers
  ↓ window.api.*
Preload (contextBridge)
  ↓ ipcRenderer.invoke
electron/main/ipc/handlers.ts
  ↓
electron/main/services/*.ts  ← Business logic
  ↓
electron/main/database/repositories/*.ts  ← Data access
  ↓
SQLite (better-sqlite3)
```

## Konvensi Kode

### Naming
| Item | Convention | Example |
|---|---|---|
| File/folder | kebab-case | `project-service.ts` |
| Class | PascalCase | `ProjectService` |
| Function | camelCase | `getAllProjects()` |
| Type/Interface | PascalCase | `ProjectData` |
| DB Table | PascalCase | `Project` |
| DB Column | camelCase | `projectName` |

### Repository Pattern
Setiap repository extends `BaseRepository<T>`:
```ts
class BaseRepository<T> {
  getAll(): T[]
  getById(id: string): T | null
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T
  update(id: string, data: Partial<T>): T | null
  delete(id: string): boolean
}
```

### Service Pattern
Service memanggil repository, menerapkan business logic:
```ts
class ProjectService {
  private repo: ProjectRepository

  createProject(data: CreateProjectInput): Project
  duplicateProject(id: string): Project
  archiveProject(id: string): Project
}
```

### IPC Handler Pattern
```ts
// handlers.ts — register semua handler
ipcMain.handle('project:getAll', () => projectService.getAll())
ipcMain.handle('project:create', (_e, data) => projectService.create(data))
```

### Renderer Service Pattern
```ts
// src/services/project.ts
export const projectService = {
  getAll: () => window.api.invoke('project:getAll'),
  create: (data) => window.api.invoke('project:create', data)
}
```

## Modul & Status

| Modul | Status | Priority |
|---|---|---|
| Proyek | ✅ Done | High |
| Master Data (Material, Upah, Alat) | ✅ Done | High |
| WBS (Tree, auto-code, CRUD) | ✅ Done | High |
| AHS (Library, komponen Material/Tenaga/Alat) | ✅ Done | High |
| Volume | ✅ Done | Medium |
| Kalkulasi (RAB) | ✅ Done | Medium |
| Laporan | ✅ Done | Medium |
| Dashboard | ✅ Done | Medium |
| Pengaturan | ✅ Done | Low |

## Fixed Bugs

### `BaseRepository.getAll()` returned single object instead of array (Jun 17)
**Root cause**: `getAll()` called `stmt.getAsObject()` once, which returns only the first row as a plain object. When the store tried to `.map()` this, it crashed with `xx.map is not a function`.

**Fix**: Changed `getAll()` to use `while (stmt.step()) { results.push(stmt.getAsObject()) }` — same pattern as `queryAll()`.

**Affected**: All repositories (Project, Material, Wage, Equipment, Ahs, WbsItem, etc.) used the inherited buggy `getAll()`. This caused Zustand stores to receive non-array data, crashing every `.map()` in the UI.

**Symptom**: `Uncaught TypeError: store.materials.map is not a function` (and similar for `store.ahsList`, `store.projects`).

**Lesson**: sql.js `Statement.getAsObject()` returns a single row, not all rows. Use a `while(stmt.step())` loop to iterate.

## Database Entities
- **Project** — proyek konstruksi
- **Material** — bahan/material
- **Wage** — upah tenaga kerja
- **Equipment** — alat kerja
- **Ahs** — analisa harga satuan
- **AhsComponentMaterial** — komponen material AHS
- **AhsComponentWage** — komponen tenaga AHS
- **AhsComponentEquipment** — komponen alat AHS
- **WbsItem** — item WBS (tree, self-referencing)
- **VolumeItem** — volume per item
- **RabSnapshot** — hasil kalkulasi
- **AppSetting** — pengaturan global

## Teknologi
- Electron 33 + electron-vite 2
- React 18 + TypeScript 5
- Tailwind CSS 3
- better-sqlite3 (SQLite)
- Zustand (state management)
- Zod (validation)

## Package Manager
npm

## Scripts
- `npm run dev` — development
- `npm run build` — production build
- `npm run typecheck` — type checking
- `npm run lint` — linting

## Catatan Penting
1. Semua akses database hanya terjadi di **main process**
2. Renderer hanya komunikasi via **IPC** (contextBridge)
3. Gunakan **Repository Pattern** untuk data access layer
4. Gunakan **Service Layer** untuk business logic
5. Setiap modul punya: **Repository** → **Service** → **IPC Handler** → **Renderer Service** → **Store**
6. UUID untuk primary key semua tabel
7. Timestamp ISO8601 auto-generated
8. UI dalam Bahasa Indonesia
