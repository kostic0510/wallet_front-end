import { model, selectors } from 'data'
import { head, includes, lift, prop, propOr, nth, toLower } from 'ramda'
import { formValueSelector } from 'redux-form'

const extractAddress = addr => prop('addr', head(addr))
const { ERC20_COIN_LIST } = model.coins
export const getData = (state, coin) => {
  const to = formValueSelector('requestEth')(state, 'to')
  const accountsR = selectors.core.kvStore.eth.getAccounts(state)
  const availability = selectors.core.walletOptions.getCoinAvailability(
    state,
    propOr('ETH', coin, coin)
  )
  const excludeLockbox = !availability
    .map(propOr(true, 'lockbox'))
    .getOrElse(true)

  const transform = accounts => ({
    type: prop('type', to),
    address: to ? prop('address', to) : extractAddress(accounts),
    excludeLockbox
  })

  return lift(transform)(accountsR)
}
export const getInitialValues = (state, ownProps) => {
  const coin = propOr('ETH', 'coin', ownProps)
  const to = to => ({ to, coin })
  if (ownProps.lockboxIndex != null) {
    return selectors.core.common.eth
      .getLockboxEthBalances(state)
      .map(nth(ownProps.lockboxIndex))
      .map(to)
      .getOrFail()
  } else if (includes(coin, ERC20_COIN_LIST)) {
    return selectors.core.common.eth
      .getErc20AccountBalances(state, toLower(coin))
      .map(to)
      .getOrFail()
  }
  return selectors.core.common.eth
    .getAccountBalances(state)
    .map(head)
    .map(to)
    .getOrFail()
}
