export function getQueueUri(host: string, port: number | string): string {
  return `tcp://${host}:${port}`
}
