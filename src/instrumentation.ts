/*instrumentation.ts*/
import dotenv from 'dotenv'
import { NodeSDK } from '@opentelemetry/sdk-node'
import opentelemetry from '@opentelemetry/api'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { Resource } from '@opentelemetry/resources'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions'
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
  MeterProvider,
} from '@opentelemetry/sdk-metrics'

dotenv.config()

const config = {
  metricsEndpoint:
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
    'http://localhost:4318/v1/metrics',
}

const getSDK = () => {
  const appContextResource = getAppContextResource()
  const metricExporter = getMetricExporter(config.metricsEndpoint)
  const metricReader = getMetricReader(metricExporter)
  const meterProvider = new MeterProvider({
    resource: appContextResource,
    // readers: [metricReader],
  })
  opentelemetry.metrics.setGlobalMeterProvider(meterProvider)

  const traceExporter = getTraceExporter()

  const sdk = new NodeSDK({
    traceExporter: traceExporter,
    metricReader: metricReader,
    resource: appContextResource,
    instrumentations: [getNodeAutoInstrumentations()],
  })

  meterProvider.getMeter('test').createCounter('metric').add(1)

  return sdk
}

function getAppContextResource() {
  return new Resource({
    [ATTR_SERVICE_NAME]: '',
    [ATTR_SERVICE_VERSION]: '1.0',
  })
}

function getMetricExporter(url) {
  return new OTLPMetricExporter({
    url: url,
  })
}

function getTraceExporter() {
  return new OTLPTraceExporter()
}

function getMetricReader(metricExporter) {
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 1000,
  })
  return metricReader
}

function sendTestMetric() {
  opentelemetry.metrics
    .getMeterProvider()
    .getMeter('test')
    .createCounter('metric')
    .add(1)
}

const sdk = getSDK()

console.log(`Starting SDK with Metrics Endpoint: ${config.metricsEndpoint}`)
sdk.start()
if (require.main === module) {
  sendTestMetric()
  console.log('Sending test metric')
  setTimeout(() => {
    console.log('10 seconds have passed')
  }, 10000)
}
