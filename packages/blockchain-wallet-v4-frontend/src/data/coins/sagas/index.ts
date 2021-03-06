import { CoinType, PaymentType, PaymentValue, RemoteDataType } from '@core/types'
import { selectors } from 'data'

import * as BCH from './coins/bch'
import * as BTC from './coins/btc'
import * as ERC20 from './coins/erc20'
import * as ETH from './coins/eth'
import * as SELF_CUSTODY from './coins/self-custody'
// import * as EUR from './coins/eur'
// import * as GBP from './coins/gbp'
// import * as USD from './coins/usd'
import * as XLM from './coins/xlm'

const getSaga = (coin: CoinType) => {
  if (selectors.core.data.coins.getErc20Coins().includes(coin)) {
    return 'ERC20'
  }
  if (selectors.core.data.coins.getDynamicSelfCustodyCoins().includes(coin)) {
    return 'SELF_CUSTODY'
  }
  return coin
}

// create a function map of all coins
const coinSagas = {
  BCH,
  BTC,
  ERC20,
  ETH,
  SELF_CUSTODY,
  // EUR,
  // GBP,
  // USD,
  XLM
}

//
// for now this is a dumping ground for both sagas and util functions (not generator functions)
// that require coin specific logic to execute. perhaps in the future we split these out further
//

export default ({ api, coreSagas, networks }) => {
  // gets the default account/address for requested coin
  const getDefaultAccountForCoin = function* (coin: CoinType): Generator<string> {
    const saga = getSaga(coin)
    const defaultAccountR = yield coinSagas[saga]?.getDefaultAccount(coin)
    // @ts-ignore
    return defaultAccountR.getOrFail('Failed to find default account')
  }

  // gets the next receive address for requested coin
  // account based currencies will just return the account address
  const getNextReceiveAddressForCoin = function* (
    coin: CoinType,
    index?: number
  ): Generator<string> {
    const saga = getSaga(coin)
    return yield coinSagas[saga]?.getNextReceiveAddress(coin, networks, index, api)
  }

  // gets or updates a provisional payment for a coin
  // provisional payments are mutable payment objects used to build a transaction
  // over an extended period of time (e.g. as user goes through interest/swap/sell flows)
  const getOrUpdateProvisionalPaymentForCoin = function* (
    coin: CoinType,
    paymentR: RemoteDataType<string | Error, PaymentValue | undefined>
  ): Generator<PaymentType> {
    const saga = getSaga(coin)
    return yield coinSagas[saga]?.getOrUpdateProvisionalPayment(
      coreSagas,
      networks,
      paymentR
    ) as PaymentType
  }

  return {
    getDefaultAccountForCoin,
    getNextReceiveAddressForCoin,
    getOrUpdateProvisionalPaymentForCoin
  }
}
