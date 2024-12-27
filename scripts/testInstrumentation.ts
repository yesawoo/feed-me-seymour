/*instrumentation.ts*/
import dotenv from 'dotenv'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics'
import { metrics, SpanStatusCode, trace } from '@opentelemetry/api'
import { setTimeout } from 'node:timers/promises'

dotenv.config()

// const sdk = new NodeSDK({
//   // traceExporter: new ConsoleSpanExporter(),
//   metricReader: new PeriodicExportingMetricReader({
//     exporter: new ConsoleMetricExporter({}),
//     exportIntervalMillis: 10000,
//   }),
//   instrumentations: [getNodeAutoInstrumentations()],
// })

const config = {
  metricsEndpoint:
    process.env.OTEL_METRICS_EXPORTER_OTLP_ENDPOINT ||
    process.env.METRICS_ENDPOINT ||
    'http://localhost:4318/v1/metrics',

  metricPrefix: process.env.METRIC_PREFIX || 'test.',
}

console.log('Config: ', JSON.stringify(config, undefined, 2))

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: config.metricsEndpoint,
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

const bork = async () => {
  const meter = metrics.getMeter(
    'feed-me-seymour.instrumentation-test',
    '0.0.1',
  )

  console.log('Sending counter...')
  const counter = meter.createCounter(config.metricPrefix + 'counter')
  for (let i = 0; i < 100; i++) {
    await setTimeout(10)
    counter.add(i)
  }

  console.log('Sending gauge...')
  const gauge = meter.createGauge(config.metricPrefix + 'gauge')
  gauge.record(100 + Math.floor(Math.random() * 901))

  console.log('Sending histogram...')
  const histo = meter.createHistogram(config.metricPrefix + 'histogram')
  await setTimeout(1000)
  histo.record(100)
  await setTimeout(1000)
  histo.record(100)
  await setTimeout(1000)
  histo.record(500)
  await setTimeout(1000)
  histo.record(1)

  console.log('Sending trace...')
  const tracer = trace.getTracer(config.metricPrefix + 'tracer')
  const span = tracer.startActiveSpan(config.metricPrefix + 'op', (span) => {
    setTimeout(1000)
      .then(() => {
        console.log('Span I guess?')
      })
      .catch((err) => {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: err.message,
        })
      })
      .finally(() => {
        span.end()
      })
  })
  console.log('Done sending metrics...')
}

;(async () => {
  sdk.start()
  await bork()
  console.log('Shutting down...')
  await sdk.shutdown()
})()
