/**
   * Creates a wrapper of the provided function that enables aggregation capabilities
   * @function aggregateFn
   * @param {function} fn - Async function that has to be wrapped
   * @param {object} options - Configuration
   * @param {number} options.maxWaitTime=1000 - Max delay that can be introduced (calculated on the older item in queue )
   * @param {number} options.maxItems=100 - Max number of items that can be aggregated together
   * @param {statsCb} options.stats -  Callback called every time that a requested is served.
   * @returns {aggregateFnReturnedObject}
   *
   * @example
   * import { aggregateFn } from 'aggregateFn'
   * const { fn, flush, cancel } = aggregateFn( myAggregableAsyncFn, {
   *   maxWaitTime: 200,
   *   maxItems: 2,
   *   stats: console.log
   * })
   */

export function aggregateFn (fn, { maxWaitTime = 1000, maxItems = 100, stats = null }) {
  let accumulator = [] // { params, resolve, reject}
  let timer = null

  // Forces to call fn() and execute any accumulated request
  const flush = async () => {
    const _acc = accumulator
    accumulator = []
    clearTimeout(timer)
    timer = null
    let ok = false

    try {
      const results = await fn(_acc.map(({ params }) => params))
      if (results.length !== _acc.length) throw new Error('fn() returns an array with mismatching length')
      for (let i = 0; i < _acc.length; i++) {
        _acc[i].resolve(results[i])
      }
      ok = true
    } catch (err) {
      for (const _r of _acc) {
        _r.reject(err)
      }
    }
    if (stats) {
      stats({
        ok,
        count: _acc.length,
        swarf: maxItems - _acc.length,
        delay: _acc.length ? Date.now() - _acc[0].time : 0
      })
    }
  }

  // Discard any accumulated request
  const cancel = () => {
    clearTimeout(timer)
    const _acc = accumulator
    timer = null
    accumulator = []
    for (const _r of _acc) {
      _r.reject('Operation cancelled')
    }
  }

  // Accumulate a single request
  const wrappedFn = (...params) => {
    let resolveTask, rejectTask
    const promise = new Promise((resolve, reject) => {
      resolveTask = resolve
      rejectTask = reject
    })

    if (params.length === 1) params = params[0]
    if (params.length === 0) params = undefined

    accumulator.push({
      params,
      resolve: resolveTask,
      reject: rejectTask,
      time: Date.now()
    })

    if (!timer) {
      timer = setTimeout(flush, maxWaitTime)
    }
    if (accumulator.length >= maxItems) {
      flush()
    }

    return promise
  }

  return { fn: wrappedFn, flush, cancel }
}

/**
 * @typedef aggregateFnReturnedObject
 * @property {function} fn - Wrapped version of the provided function
 * @property {function} flush - A function that forces to call immediately the original function regardless of maxWaitTime and maxItems configuration
 * @property {function} cancel - A function that cancels any pending request
 */

/**
 * @callback statsCb
 * @param {boolean} ok - Indicated if the requested has been completed with success
 * @param {number} count - Number of aggregated requests
 * @param {number} swarf - Indicates the wasted aggregation (maxItems - count)
 * @param {number} delay - Delay introduced to the first queued request
 */
