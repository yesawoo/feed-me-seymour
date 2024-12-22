export type Label = {
  key: string
  value: string | number | Date | boolean
}

export type Event = {
  id: string
  name: string
  labels: Label[]
  timestamp: Date
  data: any
  _sequence: number
}
