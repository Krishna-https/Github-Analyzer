/**
 * Shared error plumbing for routes that talk to Docker. dockerode (via
 * docker-modem) copies the daemon's HTTP status onto thrown Errors as
 * `statusCode`; these helpers let API routes distinguish a missing container
 * (client error) from a broken daemon (server fault).
 */

export class ContainerError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ContainerError'
  }
}

export function dockerStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const status = (error as { statusCode?: unknown }).statusCode
  return typeof status === 'number' ? status : undefined
}