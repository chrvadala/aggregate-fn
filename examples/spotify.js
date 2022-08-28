import { aggregateFn } from '../src/index.js'

// https://developer.spotify.com/documentation/general/guides/authorization/client-credentials/
const SPOTIFY_CLIENTID = process.env.SPOTIFY_CLIENTID
const SPOTIFY_SECRET = process.env.SPOTIFY_SECRET

// Init aggregatedFn
const aggregateFnOpts = {
  maxWaitTime: 1000,
  maxItems: 10,
  stats: stats => console.log(`Stats: ${JSON.stringify(stats)}`)
}

const { fn: getArtist, flush, cancel } = aggregateFn(async artistIds => {
  const token = await _getSpotifyToken(SPOTIFY_CLIENTID, SPOTIFY_SECRET)
  return await _getArtistBulk(token, artistIds)
}, aggregateFnOpts)

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
async function _getArtistBulk (token, artistIds) {
  const req = await fetch('https://api.spotify.com/v1/artists?ids=' + artistIds.join(','), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  const json = await req.json()
  return json.artists.map(({ name }) => name)
}

async function _getSpotifyToken (clientid, secret) {
  try {
    const req = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + (Buffer.from(clientid + ':' + secret).toString('base64')),
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    const token = await req.json()
    return token.access_token
  } catch (e) {
    throw new Error('Unable to retrieve Spotify token: ' + e.message)
  }
}
