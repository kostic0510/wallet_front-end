import { BigNumber } from 'bignumber.js'

import { FiatType } from '@core/types'

export const getLang = (): string => {
  if (navigator.languages !== undefined) return navigator.languages[0]
  return navigator.language
}

export const formatCoin = (value, minDigits = 0, maxDigits = 8) => {
  const bigValue = new BigNumber(value)
  const decimalPlaces = bigValue.decimalPlaces()
  if (minDigits > decimalPlaces) return bigValue.toFormat(minDigits)
  if (maxDigits < decimalPlaces) return bigValue.toFormat(maxDigits)
  return bigValue.toFormat()
}

// deprecated
export const formatFiat = (value, digits = 2) => {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  })
}

export const coinToString = ({
  maxDigits = 8,
  minDigits = 0,
  unit,
  value
}: {
  maxDigits?: number
  minDigits?: number
  unit: { symbol: string }
  value
}): string => {
  const coinfig = window.coins[unit.symbol]?.coinfig
  return `${formatCoin(value, minDigits, maxDigits)} ${
    coinfig ? coinfig.displaySymbol : unit.symbol
  }`
}

export const fiatToString = ({
  digits = 2,
  showNarrowSymbol = false, // used to show $ instead of US$
  unit,
  value
}: {
  digits?: number
  showNarrowSymbol?: boolean
  unit: FiatType
  value: string | number
}): string => {
  const options = {
    currency: unit,
    currencyDisplay: showNarrowSymbol ? 'narrowSymbol' : undefined,
    minimumFractionDigits: digits,
    style: 'currency'
  }

  return new Intl.NumberFormat(getLang(), options).format(new BigNumber(value).toNumber())
}
