# aggregate-fn

Aggregate fn is a Javascript utility that gathers together multiple async operations. It is really useful when you want to merge many API requests, avoiding rate-limits.

[![chrvadala](https://img.shields.io/badge/website-chrvadala-orange.svg)](https://chrvadala.github.io)
[![Test](https://github.com/chrvadala/aggregate-fn/workflows/Test/badge.svg)](https://github.com/chrvadala/aggregate-fn/actions)
[![Coverage Status](https://coveralls.io/repos/github/chrvadala/aggregate-fn/badge.svg)](https://coveralls.io/github/chrvadala/aggregate-fn)
[![npm](https://img.shields.io/npm/v/aggregate-fn.svg?maxAge=2592000?style=plastic)](https://www.npmjs.com/package/aggregate-fn)
[![Downloads](https://img.shields.io/npm/dm/aggregate-fn.svg)](https://www.npmjs.com/package/aggregate-fn)
[![Donate](https://img.shields.io/badge/donate-GithubSponsor-green.svg)](https://github.com/sponsors/chrvadala)

# Features 
This utility can:
- aggregate requests up to a configured upper limit
- aggregate requests limiting the delay 
- provide you interesting metrics

![aggregate-fn descriptive picture](https://github.com/chrvadala/aggregate-fn/blob/main/aggregate-fn.png)

# Documentation
- [APIs](https://github.com/chrvadala/aggregate-fn/blob/main/docs/api.md)

# Install
```sh
npm install aggregate-fn
```
# Examples

## Simple test
In the following code snippet multiple async operations are aggregated together. Full source code available here [simple.js](https://github.com/chrvadala/aggregate-fn/blob/main/examples/simple.js)

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

// Init aggregateFn
const { fn, flush, cancel } = aggregateFn(myAggregableAsyncFn, {
  maxWaitTime: 200,
  maxItems: 2,
  stats: statsPrinter
})

//Executes multiple parallels async functions
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
````

## Calling a bulk service
In the following code snippet we reduce the number of requests toward a Spotify service, in order to have a better usage of Spotify's quota. Full source code available here: [spotify.js](https://github.com/chrvadala/aggregate-fn/blob/main/examples/spotify.js)

````js
import { aggregateFn } from 'aggregate-fn'

// https://developer.spotify.com/documentation/general/guides/authorization/client-credentials/
const SPOTIFY_CLIENTID = process.env.SPOTIFY_CLIENTID
const SPOTIFY_SECRET = process.env.SPOTIFY_SECRET

// Init aggregateFn
const { fn: getArtist, flush, cancel } = aggregateFn(_getArtistBulk, {
  maxWaitTime: 1000,
  maxItems: 10,
  stats: stats => console.log(`Stats: ${JSON.stringify(stats)}`)
})

// Executes multiple parallels async functions
Promise.all([
  (async function () {
    const info = await getArtist('1dfeR4HaWDbWqFHLkxsg1d')
    console.log(`Request #1: ${info}`)
  }()),

  (async function () {
    const info = await getArtist('3fMbdgg4jU18AjLCKBhRSm')
    console.log(`Request #2: ${info}`)
  }())
])

process.on('SIGINT', () => flush())
process.on('exit', () => cancel())

// ** Spotify APIs ** //
async function _getArtistBulk (artistIds) {
  const token = await _getSpotifyToken(SPOTIFY_CLIENTID, SPOTIFY_SECRET)
  const req = await fetch('https://api.spotify.com/v1/artists?ids=' + artistIds.join(','), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  const json = await req.json()
  if (!req.ok || !Array.isArray(json.artists)) throw new Error('Unable to retrieve Spotify data. Check your CLIENT_ID and SECRET.')
  return json.artists.map(({ name }) => name)
}

async function _getSpotifyToken (clientid, secret) {
  const req = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + (Buffer.from(clientid + ':' + secret).toString('base64')),
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  const json = await req.json()
  if (!req.ok || !json.access_token) throw new Error('Unable to retrieve Spotify token. Check your CLIENT_ID and SECRET.')
  return json.access_token
}
````

# Changelog
- **0.x** - Beta version
- **1.0** - First official version
- **1.1** - Upgrades deps and github actions
# Contributors
- [chrvadala](https://github.com/chrvadala) (author)

<hr>
<sub>In Memory of My Love :tulip:</sub>