export function aggregateFn (fn, { maxWait = 100, maxTasks = 100, stats = null }) {
  let accumulator = [] // { params, resolve, reject}
  let timer = null

  /**
   * Forces to call fn() and execute any accumulated request
   */
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
        swarf: maxTasks - _acc.length,
        delay: _acc.length ? Date.now() - _acc[0].time : 0
      })
    }
  }

  /**
   * Discard any accumulated request
   */
  const cancel = () => {
    clearTimeout(timer)
    const _acc = accumulator
    timer = null
    accumulator = []
    for (const _r of _acc) {
      _r.reject('Operation cancelled')
    }
  }

  /**
   * Accumulate a single request
   * @param {*} params
   * @returns
   */

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
      timer = setTimeout(flush, maxWait)
    }
    if (accumulator.length >= maxTasks) {
      flush()
    }

    return promise
  }

  return { fn: wrappedFn, flush, cancel }
}
