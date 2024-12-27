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
import { getLogger } from './util/logging'

const logger = getLogger(__filename)

dotenv.config()

const config = {
  metricsEndpoint:
    process.env.OTEL_METRICS_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4318/v1/metrics',
}

const getSDK = () => {
  const sdkType = process.env.OTEL_EXPORT_TO_CONSOLE ? 'console' : 'otlp'

  if (sdkType === 'console') {
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
logger.info(
  'Starting OpenTelemetry SDK - Metrics Endpoint: %s',
  config.metricsEndpoint,
)
sdk.start()
