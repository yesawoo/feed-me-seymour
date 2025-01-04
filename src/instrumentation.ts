import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc'
import { Resource } from '@opentelemetry/resources'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import dotenv from 'dotenv'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'

dotenv.config()

const config = (() => {
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/'
  const metricsPath =
    '/opentelemetry.proto.collector.metric.v1.MetricService/Export'
  const metricsEndpoint =
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
    `${otlpEndpoint}/${metricsPath}`

  const environment = process.env.ENVIRONMENT || 'development'

  const exportIntervalMillis = environment === 'development' ? 2500 : 60000

  return {
    metricsEndpoint: metricsEndpoint,
    environment: environment,
    exportIntervalMillis: exportIntervalMillis,
  }
})()

console.log(
  `Initializing Opentelemetry Instrumentation: ` +
    JSON.stringify(config, null, 2),
)

if (config.environment === 'development') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
}

const appContextResource = new Resource({
  [ATTR_SERVICE_NAME]: 'feed-me-seymour',
  [ATTR_SERVICE_VERSION]: '0.0.1',
})

const metricExporter = new OTLPMetricExporter({
  url: config.metricsEndpoint,
})

const reader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: config.exportIntervalMillis,
})

const sdk = new NodeSDK({
  resource: appContextResource,
  metricReader: reader,
})

sdk.start()

// import { testMetrics } from '../scripts/testInstrumentation'
// if (config.environment === 'development' && require.main === module) {
//   testMetrics()
// }
