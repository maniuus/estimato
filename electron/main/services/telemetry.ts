import TelemetryDeck from '@telemetrydeck/sdk'
import { webcrypto } from 'crypto'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

let tdInstance: TelemetryDeck | null = null
let telemetryUserId: string | null = null

export function getOrCreateTelemetryUserId(): string {
  if (telemetryUserId) return telemetryUserId

  const userDataPath = app.getPath('userData')
  const idFilePath = join(userDataPath, 'telemetry-user-id.json')

  try {
    if (existsSync(idFilePath)) {
      const data = JSON.parse(readFileSync(idFilePath, 'utf8'))
      if (data && typeof data.userId === 'string') {
        telemetryUserId = data.userId
        return telemetryUserId!
      }
    }
  } catch (err) {
    console.error('[Telemetry] Failed to read user ID file:', err)
  }

  // Generate new one
  telemetryUserId = uuidv4()
  try {
    writeFileSync(idFilePath, JSON.stringify({ userId: telemetryUserId }), 'utf8')
  } catch (err) {
    console.error('[Telemetry] Failed to write user ID file:', err)
  }

  return telemetryUserId!
}

export function initTelemetry(): void {
  if (tdInstance) return

  try {
    const userId = getOrCreateTelemetryUserId()
    tdInstance = new TelemetryDeck({
      appID: 'C6CB5C0B-59DD-4014-BABC-21CC9ED73069',
      clientUser: userId,
      subtleCrypto: webcrypto.subtle as any
    })

    console.log('[Telemetry] Initialized for main process with ID:', userId)

    // Capture main process uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[Telemetry] Main process uncaught exception:', error)
      sendTelemetrySignal('bug_report', {
        errorType: 'main_uncaught_exception',
        message: error.message || String(error),
        stack: error.stack || ''
      })
    })

    process.on('unhandledRejection', (reason) => {
      console.error('[Telemetry] Main process unhandled rejection:', reason)
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack = reason instanceof Error ? reason.stack : ''
      sendTelemetrySignal('bug_report', {
        errorType: 'main_unhandled_rejection',
        message,
        stack: stack || ''
      })
    })

    sendTelemetrySignal('main_process_start', {
      platform: process.platform,
      arch: process.arch,
      version: app.getVersion()
    })
  } catch (err) {
    console.error('[Telemetry] Failed to initialize main process telemetry:', err)
  }
}

export function sendTelemetrySignal(type: string, payload: Record<string, any> = {}): void {
  if (!tdInstance) {
    initTelemetry()
  }
  if (!tdInstance) return

  tdInstance.signal(type, payload).catch(err => {
    console.warn('[Telemetry] Failed to send main process signal:', err)
  })
}
