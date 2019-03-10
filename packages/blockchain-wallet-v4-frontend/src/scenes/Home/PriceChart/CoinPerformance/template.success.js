import React from 'react'
import styled from 'styled-components'
import { Exchange } from 'blockchain-wallet-v4/src'
import * as Currency from 'blockchain-wallet-v4/src/exchange/currency'
import { Text } from 'blockchain-info-components'
import { getPriceChartTime } from './services'

const Wrapper = styled.div`
  margin-top: 12px;
  display: flex;
  > div:last-child {
    margin-left: 4px;
  }
`

const Success = ({
  currency,
  priceChartTime,
  priceChange,
  pricePercentageChange
}) => {
  return (
    <Wrapper>
      <Text size='12px' color={priceChange >= 0 ? 'success' : 'sent'}>
        {Exchange.getSymbol(currency) + Currency.formatFiat(priceChange)} (%
        {Currency.formatFiat(pricePercentageChange)})
      </Text>
      <Text size='12px' color='lightblue-gray'>
        {getPriceChartTime(priceChartTime)}
      </Text>
    </Wrapper>
  )
}

export default Success
