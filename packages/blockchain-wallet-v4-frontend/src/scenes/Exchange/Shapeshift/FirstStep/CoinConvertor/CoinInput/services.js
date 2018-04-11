import { isEmpty } from 'ramda'
import { Exchange } from 'blockchain-wallet-v4/src'

export const convertCoinToFiat = (value, coin, coinUnit, fiatUnit, bchRates = {}, btcRates = {}, ethRates = {}) => {
  if (isEmpty(value)) return ''
  switch (coin) {
    case 'BCH': return Exchange.convertBchToFiat({ value: value, fromUnit: coinUnit, toCurrency: fiatUnit, rates: bchRates }).value
    case 'BTC': return Exchange.convertBitcoinToFiat({ value: value, fromUnit: coinUnit, toCurrency: fiatUnit, rates: btcRates }).value
    case 'ETH': return Exchange.convertEtherToFiat({ value: value, fromUnit: coinUnit, toCurrency: fiatUnit, rates: ethRates }).value
  }
}

export const convertFiatToCoin = (value, coin, coinUnit, fiatUnit, bchRates = {}, btcRates = {}, ethRates = {}) => {
  if (isEmpty(value)) return ''
  switch (coin) {
    case 'BCH': return Exchange.convertFiatToBch({ value: value, fromCurrency: fiatUnit, toUnit: coinUnit, rates: bchRates }).value
    case 'BTC': return Exchange.convertFiatToBitcoin({ value: value, fromCurrency: fiatUnit, toUnit: coinUnit, rates: btcRates }).value
    case 'ETH': return Exchange.convertFiatToEther({ value: value, fromCurrency: fiatUnit, toUnit: coinUnit, rates: ethRates }).value
  }
}
