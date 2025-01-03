import opentelemetry from '@opentelemetry/api'
export const testMetrics = () => {
  const meter = opentelemetry.metrics.getMeter('example-exporter-collector')

  const requestCounter = meter.createCounter('test_counter', {
    description: 'Example of a Counter',
  })

  const upDownCounter = meter.createUpDownCounter('test_up_down_counter', {
    description: 'Example of a UpDownCounter',
  })

  const gauge = meter.createGauge('test_gauge')
  // const attributes = { pid: process.pid, environment: 'staging' }

  setInterval(() => {
    requestCounter.add(7)
    upDownCounter.add(Math.random() > 0.5 ? 1 : -1, {})
  }, 1000)
  gauge.record(Math.random() * 10000)
}
