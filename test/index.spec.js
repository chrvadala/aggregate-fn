import { expect, test } from '@jest/globals'

import { aggregateFn } from '../src/index.js'

test('index', () => {
  expect(aggregateFn).toBeInstanceOf(Function)
})
