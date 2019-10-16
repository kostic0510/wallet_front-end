import { selectors } from 'data'
import { createDeepEqualSelector } from 'services/ReselectHelper'
import { isNil, path } from 'ramda'

export const getData = createDeepEqualSelector(
  [
    selectors.components.layoutWallet.getBalancesTable,
    selectors.modules.profile.getUserTiers
  ],
  (currentTab, userTiers) => {
    const isSilverOrAbove = !isNil(path(['data', 'current'], userTiers))
    return { currentTab, isSilverOrAbove }
  }
)
