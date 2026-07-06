export type ServiceResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string }

export function success<T>(data: T): ServiceResult<T> {
  return { success: true, data } as ServiceResult<T>
}

export function failure<T = never>(error: string): ServiceResult<T> {
  return { success: false, error } as ServiceResult<T>
}
