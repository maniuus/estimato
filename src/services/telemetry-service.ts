let initialized = false
let userId: string | null = null

export const telemetryService = {
  async initialize(): Promise<void> {
    if (initialized) return

    try {
      userId = await window.api.telemetry.getUserId()
      initialized = true

      // Send initial app launch signal from renderer
      this.sendSignal('app_launch', {
        environment: 'renderer',
        userAgent: navigator.userAgent
      })

      // Setup global error logging for the renderer process
      this.setupGlobalErrorCatching()
    } catch (err) {
      console.error('[Telemetry] Failed to initialize renderer telemetry:', err)
    }
  },

  sendSignal(type: string, payload: Record<string, any> = {}): void {
    window.api.telemetry.sendSignal(type, payload).catch(err => {
      console.warn('[Telemetry] Failed to send renderer signal:', err)
    })
  },

  setupGlobalErrorCatching(): void {
    // Uncaught exceptions
    window.addEventListener('error', (event) => {
      this.sendSignal('bug_report', {
        errorType: 'uncaught_exception',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || ''
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack = reason instanceof Error ? reason.stack : ''
      this.sendSignal('bug_report', {
        errorType: 'unhandled_rejection',
        message,
        stack: stack || ''
      })
    })
  }
}
