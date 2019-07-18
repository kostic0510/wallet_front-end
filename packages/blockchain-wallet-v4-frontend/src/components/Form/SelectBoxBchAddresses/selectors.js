import {
  assoc,
  assocPath,
  concat,
  compose,
  curry,
  descend,
  filter,
  has,
  head,
  isNil,
  lensIndex,
  lensProp,
  lift,
  not,
  map,
  path,
  prepend,
  prop,
  reduce,
  set,
  sequence,
  sort
} from 'ramda'
import { Exchange, Remote } from 'blockchain-wallet-v4/src'
import { selectors } from 'data'
import { ADDRESS_TYPES } from 'blockchain-wallet-v4/src/redux/payment/btc/utils'

const allWallets = {
  label: 'All',
  options: [
    {
      label: 'All Bitcoin Cash Wallets',
      value: 'all'
    }
  ]
}

const allImportedAddresses = {
  label: 'Imported Addresses',
  options: [
    {
      label: 'All Imported Bitcoin Cash Addresses',
      value: 'allImportedAddresses'
    }
  ]
}

export const getData = (state, ownProps) => {
  const {
    coin,
    exclude = [],
    excludeHDWallets,
    excludeWatchOnly,
    excludeImported,
    excludeLockbox,
    includeAll = true,
    includePitAddress
  } = ownProps
  const buildDisplay = wallet => {
    if (has('balance', wallet)) {
      let bchDisplay = Exchange.displayBchToBch({
        value: wallet.balance,
        fromUnit: 'SAT',
        toUnit: 'BCH'
      })
      return wallet.label + ` (${bchDisplay})`
    }
    return wallet.label
  }
  const isActive = filter(x => !x.archived)
  const excluded = filter(x => !exclude.includes(x.label))
  const toDropdown = map(x => ({ label: buildDisplay(x), value: x }))
  const toGroup = curry((label, options) => [{ label, options }])
  const toPit = x => [{ label: `BCH PIT Address (${x})`, value: x }]

  const pitAddressSelector = selectors.components.send.getPaymentsAccountPit(
    'BCH',
    state
  )
  const hasPitAddress = !Remote.Failure.is(pitAddressSelector)

  const formatAddress = addressData => {
    const formattedAddress = {}
    return compose(
      a => assoc('label', prop('addr', addressData), a),
      a => assocPath(['value', 'type'], ADDRESS_TYPES.LEGACY, a),
      a =>
        assocPath(
          ['value', 'balance'],
          path(['info', 'final_balance'], addressData),
          a
        ),
      a => assocPath(['value', 'coin'], coin, a),
      a => assocPath(['value', 'address'], prop('addr', addressData), a),
      a => assoc('value', prop('info', addressData), a)
    )(formattedAddress)
  }

  const formatImportedAddressesData = addressesData => {
    return map(formatAddress, addressesData)
  }

  const getAddressesData = () => {
    const importedAddresses = selectors.core.common.bch.getActiveAddresses(
      state
    )
    const filterRelevantAddresses = addrs =>
      excludeWatchOnly
        ? filter(addr => not(isNil(prop('priv', addr))), addrs)
        : addrs
    const relevantAddresses = lift(filterRelevantAddresses)(importedAddresses)

    return sequence(Remote.of, [
      selectors.core.common.bch
        .getAccountsBalances(state)
        .map(isActive)
        .map(excluded)
        .map(toDropdown)
        .map(toGroup('Wallet')),
      excludeImported
        ? Remote.of([])
        : lift(formatImportedAddressesData)(relevantAddresses)
            .map(toGroup('Imported Addresses'))
            .map(x =>
              set(
                compose(
                  lensIndex(0),
                  lensProp('options')
                ),
                sort(
                  descend(path(['value', 'balance'])),
                  prop('options', head(x))
                ),
                x
              )
            ),
      excludeLockbox
        ? Remote.of([])
        : selectors.core.common.bch
            .getLockboxBchBalances(state)
            .map(excluded)
            .map(toDropdown)
            .map(toGroup('Lockbox')),
      includePitAddress && hasPitAddress
        ? pitAddressSelector.map(toPit).map(toGroup('The PIT'))
        : Remote.of([])
    ]).map(([b1, b2, b3, b4]) => {
      const data = reduce(concat, [], [b1, b2, b3, b4])
      if (includeAll) {
        return { data: prepend(allWallets, data) }
      } else if (excludeHDWallets) {
        return { data: [allImportedAddresses] }
      } else {
        return { data }
      }
    })
  }

  return getAddressesData()
}
