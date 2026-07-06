CREATE TABLE IF NOT EXISTS Project (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  projectNumber TEXT DEFAULT '',
  location      TEXT DEFAULT '',
  year          INTEGER DEFAULT 2026,
  buildingType  TEXT DEFAULT '',
  buildingArea  REAL DEFAULT 0,
  floors        INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','completed','archived')),
  ppn           REAL DEFAULT 11,
  overhead      REAL DEFAULT 0,
  note          TEXT DEFAULT '',
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Material (
  id            TEXT PRIMARY KEY,
  code          TEXT DEFAULT '',
  name          TEXT NOT NULL,
  specification TEXT DEFAULT '',
  category      TEXT DEFAULT '',
  unit          TEXT NOT NULL DEFAULT 'buah',
  unitPrice     REAL NOT NULL DEFAULT 0,
  supplier      TEXT DEFAULT '',
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Wage (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  dailyWage   REAL NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'OH',
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Equipment (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT DEFAULT '',
  capacity      TEXT DEFAULT '',
  rentalPrice   REAL NOT NULL DEFAULT 0,
  unit          TEXT NOT NULL DEFAULT 'hari',
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Ahs (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL,
  category    TEXT DEFAULT 'kustom' CHECK(category IN ('sni','kustom')),
  source      TEXT DEFAULT '',
  totalPrice  REAL DEFAULT 0,
  projectId   TEXT,
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AhsComponentMaterial (
  id            TEXT PRIMARY KEY,
  ahsId         TEXT NOT NULL,
  materialId    TEXT NOT NULL,
  coefficient   REAL NOT NULL DEFAULT 0,
  totalPrice    REAL DEFAULT 0,
  FOREIGN KEY (ahsId) REFERENCES Ahs(id) ON DELETE CASCADE,
  FOREIGN KEY (materialId) REFERENCES Material(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS AhsComponentWage (
  id          TEXT PRIMARY KEY,
  ahsId       TEXT NOT NULL,
  wageId      TEXT NOT NULL,
  coefficient REAL NOT NULL DEFAULT 0,
  totalPrice  REAL DEFAULT 0,
  FOREIGN KEY (ahsId) REFERENCES Ahs(id) ON DELETE CASCADE,
  FOREIGN KEY (wageId) REFERENCES Wage(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS AhsComponentEquipment (
  id          TEXT PRIMARY KEY,
  ahsId       TEXT NOT NULL,
  equipmentId TEXT NOT NULL,
  coefficient REAL NOT NULL DEFAULT 0,
  totalPrice  REAL DEFAULT 0,
  FOREIGN KEY (ahsId) REFERENCES Ahs(id) ON DELETE CASCADE,
  FOREIGN KEY (equipmentId) REFERENCES Equipment(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS WbsItem (
  id          TEXT PRIMARY KEY,
  projectId   TEXT NOT NULL,
  parentId    TEXT,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  unit        TEXT DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'item' CHECK(type IN ('group','item')),
  sortOrder   INTEGER DEFAULT 0,
  wbsPath     TEXT DEFAULT '',
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE,
  FOREIGN KEY (parentId) REFERENCES WbsItem(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS VolumeItem (
  id          TEXT PRIMARY KEY,
  wbsItemId   TEXT NOT NULL UNIQUE,
  ahsId       TEXT,
  volume      REAL DEFAULT 0,
  unit        TEXT DEFAULT '',
  formula     TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  createdAt   TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (wbsItemId) REFERENCES WbsItem(id) ON DELETE CASCADE,
  FOREIGN KEY (ahsId) REFERENCES Ahs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS RabSnapshot (
  id            TEXT PRIMARY KEY,
  projectId     TEXT NOT NULL,
  calculatedAt  TEXT NOT NULL DEFAULT (datetime('now')),
  totalPrice    REAL DEFAULT 0,
  ppn           REAL DEFAULT 0,
  overhead      REAL DEFAULT 0,
  grandTotal    REAL DEFAULT 0,
  data          TEXT DEFAULT '{}',
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AppSetting (
  id            TEXT PRIMARY KEY DEFAULT 'default',
  companyName   TEXT DEFAULT '',
  companyLogo   TEXT DEFAULT '',
  reportHeader  TEXT DEFAULT '',
  ppnDefault    REAL DEFAULT 11,
  createdAt     TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt     TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO AppSetting (id) VALUES ('default');
