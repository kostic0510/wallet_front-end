import { WalletFiatType } from '@core/types'

import * as AT from './actionTypes'

export const initialized = (currency: WalletFiatType) => ({
  payload: { currency },
  type: AT.FIAT_TRANSACTIONS_INITIALIZED
})

export const loadMore = (currency: WalletFiatType) => ({
  payload: { currency },
  type: AT.FIAT_TRANSACTIONS_LOAD_MORE
})
