# aggregate-fn

Aggregate fn is a Javascript utility that brings together multiple async operations. It is really useful when you want to merge many API requests together.

[![chrvadala](https://img.shields.io/badge/website-chrvadala-orange.svg)](https://chrvadala.github.io)
[![Test](https://github.com/chrvadala/aggregate-fn/workflows/Test/badge.svg)](https://github.com/chrvadala/aggregate-fn/actions)
[![Coverage Status](https://coveralls.io/repos/github/chrvadala/aggregate-fn/badge.svg)](https://coveralls.io/github/chrvadala/aggregate-fn)
[![npm](https://img.shields.io/npm/v/aggregate-fn.svg?maxAge=2592000?style=plastic)](https://www.npmjs.com/package/aggregate-fn)
[![Downloads](https://img.shields.io/npm/dm/aggregate-fn.svg)](https://www.npmjs.com/package/aggregate-fn)
[![Donate](https://img.shields.io/badge/donate-PayPal-green.svg)](https://www.paypal.me/chrvadala/25)

# Features 
This utility can:
- aggregate requests up to a configured upper limit
- aggregate requests limiting the delay 
- provide you interesting metrics

# Documentation
- [APIs](https://github.com/chrvadala/aggregate-fn/blob/main/docs/api.md)

# Install
```sh
npm install aggregate-fn
```
# Examples
````js
import { aggregateFn } from 'aggregate-fn'
import { promisify } from 'util'
const sleep = promisify(setTimeout)

// this is a way to gather metrics
const statsPrinter = stats => console.log(`Stats: ${JSON.stringify(stats)}`)

// Here you can execute your async task (e.g. call one API)
const myAggregableAsyncFn = async requests => {
  const responses = requests.map(request => request * 2)
  return responses
}

const { fn, flush, cancel } = aggregateFn(myAggregableAsyncFn, { 
  maxWait: 200, 
  maxTasks: 2, 
  stats: statsPrinter
})

Promise.all([ // let's try with some parallelism
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
````

# Changelog
- **0.x** - Beta version
- **1.0** - First official version
# Contributors
- [chrvadala](https://github.com/chrvadala) (author)

<hr>
<sub>In Memory of My Love :tulip:</sub>