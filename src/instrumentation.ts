/*instrumentation.ts*/
import dotenv from 'dotenv'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics'

dotenv.config()

const config = {
  metricsEndpoint:
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
    'http://localhost:4318/v1/metrics',
}

const getSDK = () => {
  if (config.metricsEndpoint === ':console:') {
    return new NodeSDK({
      traceExporter: new ConsoleSpanExporter(),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter({}),
        exportIntervalMillis: 10000,
      }),
      instrumentations: [getNodeAutoInstrumentations()],
    })
  }

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),

    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: config.metricsEndpoint }),
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  })

  return sdk
}

const sdk = getSDK()

console.log(`Starting SDK with Metrics Endpoint: ${config.metricsEndpoint}`)
sdk.start()
