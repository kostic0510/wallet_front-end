import deepEqual from 'fast-deep-equal'
import { createSelectorCreator, defaultMemoize } from 'reselect'

import * as bch from './bch'
import * as btc from './btc'
import * as checks from './checks'
import * as eth from './eth'
import * as xlm from './xlm'

const createDeepEqualSelector = createSelectorCreator(defaultMemoize, deepEqual)

export { bch, btc, checks, createDeepEqualSelector, eth, xlm }

export const MISSING_WALLET = 'MISSING_WALLET'

export const errorHandler = (e): string => {
  return typeof e === 'object'
    ? e.description
      ? e.description
      : e.message
      ? e.message
      : JSON.stringify(e)
    : typeof e === 'string'
    ? e
    : 'Unknown Error'
}

export const errorHandlerCode = (e) => {
  return typeof e === 'object' && e.code ? e.code : errorHandler(e)
}

export const errorCodeAndMessage = (e) => ({
  code: typeof e === 'object' ? Number(e.code) : 1,
  message: errorHandler(e)
})
