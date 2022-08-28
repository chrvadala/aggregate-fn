import { aggregateFn } from '../src/index.js'
import { promisify } from 'util'
const sleep = promisify(setTimeout)

// this is a way to gather metrics
const statsPrinter = stats => console.log(`Stats: ${JSON.stringify(stats)}`)

// Here you can execute your async task (e.g. call one API)
const myAggregableAsyncFn = async requests => {
  const responses = requests.map(request => request * 2)
  return responses
}

// Init aggregatedFn
const { fn, flush, cancel } = aggregateFn(myAggregableAsyncFn, {
  maxWaitTime: 200,
  maxItems: 2,
  stats: statsPrinter
})

// Executes multiple parallels async functions
Promise.all([
  (async function () {
    const res = await fn(1)
    console.log(`Request #1: ${res}`)
  }()),

  (async function () {
    const res = await fn(2)
    console.log(`Request #2: ${res}`)
  }()),

  (async function () {
    const res = await fn(3)
    console.log(`Request #3: ${res}`)
  }()),

  (async function () {
    await sleep(500)
    const res = await fn(4)
    console.log(`Request #4: ${res}`)
  }())
])

process.on('SIGINT', () => flush())
process.on('exit', () => cancel())
