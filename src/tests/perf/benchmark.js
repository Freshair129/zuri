#!/usr/bin/env node

/**
 * Zuri Performance Benchmark — NFR2 Compliance Check
 *
 * Verifies: Dashboard API responses < 500ms (p95)
 *
 * Usage: node src/tests/perf/benchmark.js [baseUrl]
 * Default: http://localhost:3000
 *
 * Requires: running Zuri server
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000'
const ITERATIONS = 10
const P95_THRESHOLD_MS = 500
const TENANT_ID = '10000000-0000-0000-0000-000000000001'

const endpoints = [
  { name: 'Inventory Stock', path: '/api/inventory/stock' },
  { name: 'PO List', path: '/api/procurement/po' },
  { name: 'Supplier List', path: '/api/procurement/suppliers' },
]

async function benchmark(endpoint) {
  const latencies = []

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now()
    try {
      const res = await fetch(`${BASE_URL}${endpoint.path}`, {
        headers: { 'x-tenant-id': TENANT_ID },
      })
      if (!res.ok) {
        console.warn(`  [WARN] ${endpoint.name}: HTTP ${res.status}`)
      }
    } catch (error) {
      console.warn(`  [WARN] ${endpoint.name}: ${error.message}`)
    }
    const elapsed = performance.now() - start
    latencies.push(elapsed)
  }

  latencies.sort((a, b) => a - b)
  const p50 = latencies[Math.floor(latencies.length * 0.5)]
  const p95 = latencies[Math.floor(latencies.length * 0.95)]
  const p99 = latencies[Math.floor(latencies.length * 0.99)]

  return { name: endpoint.name, p50, p95, p99, pass: p95 <= P95_THRESHOLD_MS }
}

async function main() {
  console.log(`\n  Zuri Performance Benchmark`)
  console.log(`  Base URL: ${BASE_URL}`)
  console.log(`  Iterations: ${ITERATIONS}`)
  console.log(`  P95 Threshold: ${P95_THRESHOLD_MS}ms\n`)

  let allPass = true

  for (const endpoint of endpoints) {
    const result = await benchmark(endpoint)
    const status = result.pass ? '✓ PASS' : '✗ FAIL'
    console.log(`  ${status}  ${result.name}`)
    console.log(`         p50=${result.p50.toFixed(1)}ms  p95=${result.p95.toFixed(1)}ms  p99=${result.p99.toFixed(1)}ms`)
    if (!result.pass) allPass = false
  }

  console.log(`\n  ${allPass ? '✓ All endpoints within NFR2 threshold' : '✗ Some endpoints exceed NFR2 threshold'}`)
  process.exit(allPass ? 0 : 1)
}

main()
