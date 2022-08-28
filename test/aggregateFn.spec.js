import { jest, describe, it, expect, test, beforeEach, afterEach } from '@jest/globals'
import { aggregateFn } from '../src/aggregateFn.js'

const INFINITE = 999_999

let aggregableFuncCalledTimes = 0
async function aggregableFuncThatResolves (params) {
  aggregableFuncCalledTimes++
  return await Promise.resolve(params.map(n => n * 2))
}
async function aggregableFuncThatRejects () {
  aggregableFuncCalledTimes++
  return await Promise.reject(new Error('fn_error'))
}

beforeEach(() => {
  aggregableFuncCalledTimes = 0
})

afterEach(() => {
  jest.useRealTimers()
})

describe('aggregateFn base operations', () => {
  it('flushes because reached maxItems', async () => {
    expect.assertions(6)
    const { fn } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: INFINITE, maxItems: 3 })

    const res1 = fn(1)
    const res2 = fn(2)
    expect(aggregableFuncCalledTimes).toBe(0)
    const res3 = fn(3)
    expect(aggregableFuncCalledTimes).toBe(1)

    await expect(res1).resolves.toBe(2)
    await expect(res2).resolves.toBe(4)
    await expect(res3).resolves.toBe(6)
    expect(aggregableFuncCalledTimes).toBe(1)
  })

  it('flushes because reached maxWaitTime time', async () => {
    expect.assertions(5)
    jest.useFakeTimers()

    const { fn } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: 300, maxItems: INFINITE })

    const res1 = fn(1)
    const res2 = fn(2)
    const res3 = fn(3)

    expect(aggregableFuncCalledTimes).toBe(0)

    jest.advanceTimersByTime(301)

    await expect(res1).resolves.toBe(2)
    await expect(res2).resolves.toBe(4)
    await expect(res3).resolves.toBe(6)
    expect(aggregableFuncCalledTimes).toBe(1)
  })

  it('flushes because flush() has been called', async () => {
    expect.assertions(5)
    jest.useFakeTimers()

    const { fn, flush } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: INFINITE, maxItems: INFINITE })

    const res1 = fn(1)
    const res2 = fn(2)
    const res3 = fn(3)

    expect(aggregableFuncCalledTimes).toBe(0)

    await flush()

    await expect(res1).resolves.toBe(2)
    await expect(res2).resolves.toBe(4)
    await expect(res3).resolves.toBe(6)
    expect(aggregableFuncCalledTimes).toBe(1)
  })

  it('flushes because cancel() has been called', async () => {
    expect.assertions(5)

    const { fn, cancel } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: INFINITE, maxItems: INFINITE })

    const res1 = fn(1)
    const res2 = fn(2)
    const res3 = fn(3)

    expect(aggregableFuncCalledTimes).toBe(0)

    cancel()

    await expect(res1).rejects.toBe('Operation cancelled')
    await expect(res2).rejects.toBe('Operation cancelled')
    await expect(res3).rejects.toBe('Operation cancelled')
    expect(aggregableFuncCalledTimes).toBe(0)
  })

  it('should reject', async () => {
    expect.assertions(4)

    const { fn, flush } = aggregateFn(aggregableFuncThatRejects, { maxWaitTime: INFINITE, maxItems: INFINITE })

    const res1 = expect(fn(1)).rejects.toThrow('fn_error')
    const res2 = expect(fn(2)).rejects.toThrow('fn_error')
    const res3 = expect(fn(3)).rejects.toThrow('fn_error')
    expect(aggregableFuncCalledTimes).toBe(0)

    await flush()

    await Promise.all([res1, res2, res3]) // waits all async functions
  })

  it('flushes because rechead number of tasks or wait time', async () => {
    expect.assertions(9)
    jest.useFakeTimers()
    const { fn, flush } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: 100, maxItems: 3 })

    const res1 = expect(fn(1)).resolves.toBe(2)
    const res2 = expect(fn(2)).resolves.toBe(4)
    const res3 = expect(fn(3)).resolves.toBe(6)
    expect(aggregableFuncCalledTimes).toBe(1)
    await Promise.all([res1, res2, res3])

    const res4 = expect(fn(1)).resolves.toBe(2)
    const res5 = expect(fn(2)).resolves.toBe(4)
    expect(aggregableFuncCalledTimes).toBe(1)
    jest.advanceTimersByTime(101)
    await Promise.all([res4, res5])

    const res6 = expect(fn(1)).resolves.toBe(2)
    await flush()
    await res6
    expect(aggregableFuncCalledTimes).toBe(3)
  })

  it('should manage multiple params', async () => {
    expect.assertions(3)
    const originalFn = async (params) => {
      expect(params).toEqual([
        [1, 2, 3],
        [4, 5, 6]
      ])
      return params.map(([a, b, c]) => a + b + c)
    }

    const { fn, flush } = aggregateFn(originalFn, { maxWaitTime: INFINITE, maxItems: INFINITE })
    const res1 = fn(1, 2, 3)
    const res2 = fn(4, 5, 6)
    await flush()
    await expect(res1).resolves.toBe(1 + 2 + 3)
    await expect(res2).resolves.toBe(4 + 5 + 6)
  })

  it('should manage zero params', async () => {
    expect.assertions(3)
    const originalFn = async (params) => {
      expect(params).toEqual([undefined, undefined])
      return [3, 5]
    }

    const { fn, flush } = aggregateFn(originalFn, { maxWaitTime: INFINITE, maxItems: INFINITE })
    const res1 = fn()
    const res2 = fn()
    await flush()
    await expect(res1).resolves.toBe(3)
    await expect(res2).resolves.toBe(5)
  })

  it('should throw if fn returns an array with a size different by the provided one', async () => {
    expect.assertions(4)
    const originalFn = async (params) => {
      expect(params).toHaveLength(3)
      return [3, 5]
    }
    const { fn, flush } = aggregateFn(originalFn, { maxWaitTime: INFINITE, maxItems: INFINITE })

    const res1 = expect(fn()).rejects.toThrow('fn() returns an array with mismatching length')
    const res2 = expect(fn()).rejects.toThrow('fn() returns an array with mismatching length')
    const res3 = expect(fn()).rejects.toThrow('fn() returns an array with mismatching length')
    await flush()

    await Promise.all([res1, res2, res3])
  })
})

describe('aggregateFn stats', () => {
  test('behaviour when flushed manually', async () => {
    expect.assertions(2)
    jest.useFakeTimers()
    const stats = jest.fn()
    const { fn, flush } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: 1000, maxItems: 100, stats })

    const res1 = fn(1)
    const res2 = fn(2)
    const res3 = fn(3)

    jest.advanceTimersByTime(305)
    await flush()
    await Promise.all([res1, res2, res3])

    expect(stats).toHaveBeenCalledTimes(1)
    expect(stats).toHaveBeenCalledWith({
      ok: true,
      count: 3,
      swarf: 100 - 3, // maxItems - accumulator.length
      delay: 305 // time lost waiting to be resolved
    })
  })

  test('behaviour when flushed for maxWaitTime time', async () => {
    expect.assertions(2)
    jest.useFakeTimers()
    const stats = jest.fn()
    const { fn } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: 1000, maxItems: 800, stats })

    const res1 = fn(1)
    const res2 = fn(2)
    const res3 = fn(3)

    jest.advanceTimersByTime(1000)

    await Promise.all([res1, res2, res3])

    expect(stats).toHaveBeenCalledTimes(1)
    expect(stats).toHaveBeenCalledWith({
      ok: true,
      count: 3,
      swarf: 800 - 3,
      delay: 1000
    })
  })

  test('behaviour when flushed for maxItems', async () => {
    expect.assertions(2)
    jest.useFakeTimers()
    const stats = jest.fn()
    const { fn } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: INFINITE, maxItems: 3, stats })

    jest.advanceTimersByTime(75)
    const res1 = fn(1)
    jest.advanceTimersByTime(100)
    const res2 = fn(2)
    jest.advanceTimersByTime(100)
    const res3 = fn(3)

    await Promise.all([res1, res2, res3])

    expect(stats).toHaveBeenCalledTimes(1)
    expect(stats).toHaveBeenCalledWith({
      ok: true,
      count: 3,
      swarf: 0,
      delay: 200
    })
  })

  test('empty flush', async () => {
    expect.assertions(2)
    const stats = jest.fn()
    const { flush } = aggregateFn(aggregableFuncThatResolves, { maxWaitTime: 1000, maxItems: 500, stats })

    await flush()

    expect(stats).toHaveBeenCalledTimes(1)
    expect(stats).toHaveBeenCalledWith({
      ok: true,
      count: 0,
      swarf: 500,
      delay: 0
    })
  })
})
