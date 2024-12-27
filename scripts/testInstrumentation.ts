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

dotenv.config()

// const sdk = new NodeSDK({
//   // traceExporter: new ConsoleSpanExporter(),
//   metricReader: new PeriodicExportingMetricReader({
//     exporter: new ConsoleMetricExporter({}),
//     exportIntervalMillis: 10000,
//   }),
//   instrumentations: [getNodeAutoInstrumentations()],
// })

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://localhost:4318/v1/metrics',
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()

const meter = metrics.getMeter('feed-me-seymour.instrumentation-test', '0.0.1')

const counter = meter.createCounter('test.counter')
for (let i = 0; i < 100; i++) {
  counter.add(i)
}

const gauge = meter.createGauge('test.gauge')
gauge.record(100 + Math.floor(Math.random() * 901))

const histo = meter.createHistogram('test.histogram')
histo.record(100)
histo.record(100)
histo.record(500)
histo.record(1)

const tracer = trace.getTracer('test-tracer')
const span = tracer.startActiveSpan('op', (span) => {
  try {
    setTimeout(() => {
      span.end()
    }, 1000)
  } catch (err) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message,
    })
    throw err
  }
})

sdk.shutdown()
