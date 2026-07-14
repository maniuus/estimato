export const IPC_CHANNELS = {
  PROJECT_GET_ALL: 'project:getAll',
  PROJECT_GET_BY_ID: 'project:getById',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_GET_BY_STATUS: 'project:getByStatus',
  PROJECT_EXPORT: 'project:export',
  PROJECT_IMPORT: 'project:import',

  MATERIAL_GET_ALL: 'material:getAll',
  MATERIAL_GET_BY_ID: 'material:getById',
  MATERIAL_CREATE: 'material:create',
  MATERIAL_UPDATE: 'material:update',
  MATERIAL_DELETE: 'material:delete',
  MATERIAL_SEARCH: 'material:search',

  WAGE_GET_ALL: 'wage:getAll',
  WAGE_GET_BY_ID: 'wage:getById',
  WAGE_CREATE: 'wage:create',
  WAGE_UPDATE: 'wage:update',
  WAGE_DELETE: 'wage:delete',

  EQUIPMENT_GET_ALL: 'equipment:getAll',
  EQUIPMENT_GET_BY_ID: 'equipment:getById',
  EQUIPMENT_CREATE: 'equipment:create',
  EQUIPMENT_UPDATE: 'equipment:update',
  EQUIPMENT_DELETE: 'equipment:delete',

  // WBS
  WBS_GET_BY_PROJECT: 'wbs:getByProject',
  WBS_GET_TREE: 'wbs:getTree',
  WBS_GET_BY_ID: 'wbs:getById',
  WBS_CREATE: 'wbs:create',
  WBS_UPDATE: 'wbs:update',
  WBS_DELETE: 'wbs:delete',
  WBS_MOVE: 'wbs:move',

  // AHS
  AHS_GET_ALL: 'ahs:getAll',
  AHS_GET_BY_ID: 'ahs:getById',
  AHS_CREATE: 'ahs:create',
  AHS_UPDATE: 'ahs:update',
  AHS_DELETE: 'ahs:delete',
  AHS_GET_BY_PROJECT: 'ahs:getByProject',
  AHS_GET_LIBRARY: 'ahs:getLibrary',
  AHS_DUPLICATE: 'ahs:duplicate',

  // AHS Components
  AHS_MATERIAL_GET: 'ahs:material:getByAhs',
  AHS_MATERIAL_CREATE: 'ahs:material:create',
  AHS_MATERIAL_UPDATE: 'ahs:material:update',
  AHS_MATERIAL_DELETE: 'ahs:material:delete',

  AHS_WAGE_GET: 'ahs:wage:getByAhs',
  AHS_WAGE_CREATE: 'ahs:wage:create',
  AHS_WAGE_UPDATE: 'ahs:wage:update',
  AHS_WAGE_DELETE: 'ahs:wage:delete',

  AHS_EQUIPMENT_GET: 'ahs:equipment:getByAhs',
  AHS_EQUIPMENT_CREATE: 'ahs:equipment:create',
  AHS_EQUIPMENT_UPDATE: 'ahs:equipment:update',
  AHS_EQUIPMENT_DELETE: 'ahs:equipment:delete',

  // Volume
  VOLUME_GET_BY_PROJECT: 'volume:getByProject',
  VOLUME_GET_BY_WBS_ITEM: 'volume:getByWbsItem',
  VOLUME_UPSERT: 'volume:upsert',
  VOLUME_BULK_UPSERT: 'volume:bulkUpsert',
  VOLUME_DELETE: 'volume:delete',

  // Project Volume (Shared Volumes)
  PROJECT_VOLUME_GET_BY_PROJECT: 'projectVolume:getByProject',
  PROJECT_VOLUME_UPSERT: 'projectVolume:upsert',
  PROJECT_VOLUME_DELETE: 'projectVolume:delete',

  // RAB
  RAB_CALCULATE: 'rab:calculate',
  RAB_SAVE_SNAPSHOT: 'rab:saveSnapshot',
  RAB_GET_HISTORY: 'rab:getHistory',
  RAB_GET_LATEST: 'rab:getLatest',
  RAB_EXPORT_EXCEL: 'rab:exportExcel',
  RAB_EXPORT_PDF: 'rab:exportPdf',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_BACKUP: 'settings:backup',
  SETTINGS_RESTORE: 'settings:restore',

  // AHSP Import
  AHSP_IMPORT: 'ahsp:import',

  // Project Price Overrides
  PROJECT_PRICE_OVERRIDE: 'projectPrice:override',
  PROJECT_PRICE_GET_OVERRIDES: 'projectPrice:getOverrides',
  PROJECT_PRICE_DELETE_OVERRIDE: 'projectPrice:deleteOverride',

  // Telemetry
  TELEMETRY_GET_USER_ID: 'telemetry:getUserId',
  TELEMETRY_SEND_SIGNAL: 'telemetry:sendSignal'
} as const
