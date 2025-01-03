import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc'
import { Resource } from '@opentelemetry/resources'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSDK } from '@opentelemetry/sdk-node'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import { testMetrics } from './util/instrumentation'

console.log('Initializing Opentelemetry Instrumentation...')

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

const appContextResource = new Resource({
  [ATTR_SERVICE_NAME]: 'instrumentation-test',
  [ATTR_SERVICE_VERSION]: '1.0',
})

const metricExporter = new OTLPMetricExporter({
  url: 'http://localhost:4318/opentelemetry.proto.collector.metric.v1.MetricService/Export', // /v1/metrics',
})

const reader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 5000,
})

const sdk = new NodeSDK({
  resource: appContextResource,
  metricReader: reader,
})

sdk.start()

console.log('Sending test metrics...')
testMetrics()
