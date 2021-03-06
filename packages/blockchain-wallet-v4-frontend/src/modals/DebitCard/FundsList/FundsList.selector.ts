import { lift } from 'ramda'

import { ExtractSuccess } from '@core/remote/types'
import { selectors } from 'data'
import { RootState } from 'data/rootReducer'

export const getData = (state: RootState) => {
  const eligibleAccountsR = selectors.components.debitCard.getEligibleAccounts(state)
  return lift((eligibleAccounts: ExtractSuccess<typeof eligibleAccountsR>) => eligibleAccounts)(
    eligibleAccountsR
  )
}
