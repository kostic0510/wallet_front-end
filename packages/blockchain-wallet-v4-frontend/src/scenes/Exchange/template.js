import React from 'react'
import { FormattedMessage } from 'react-intl'
import styled from 'styled-components'

import { Link, Text, TextGroup } from 'blockchain-info-components'
import ExchangeBox from './ExchangeBox'

const Wrapper = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;

  @media(min-width: 992px) { flex-direction: row; }
`
const Column = styled.div`
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
  padding: 30px 0;
  box-sizing: border-box;
`
const ColumnLeft = styled(Column)`
  padding: 30px;
  @media(min-width: 992px) { padding: 30px 5px 30px 30px; }
`
const ColumnRight = styled(Column)`
  padding: 30px;
  @media(min-width: 992px) { padding: 30px 30px 30px 5px; }
`
// const ExchangeBox = styled.div`
//   height: 300px;
//   border: 1px solid black;
// `

const HelpLink = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  padding-top: 5px;
`

const Exchange = () => {
  return (
    <Wrapper>
      <ColumnLeft>
        <ExchangeBox>
          Exchange details
        </ExchangeBox>
        <HelpLink>
          <Text weight={300} size='13px'>
            <FormattedMessage id='scenes.exchange.simple' defaultMessage='Need help?' />
          </Text>
          <Link href='https://support.blockchain.com/hc/en-us/requests/new' target='_blank' size='13px' weight={300}>
            <FormattedMessage id='scenes.transaction.ether.content.empty.etherwelcome.learnmore' defaultMessage='Contact Support' />
          </Link>
        </HelpLink>
      </ColumnLeft>
      <ColumnRight>
        <TextGroup>
          <Text color='brand-primary' weight={600} size='18px'>
            <FormattedMessage id='scenes.exchange.simple' defaultMessage='Simple. Seamless. Secure.' />
          </Text>
          <Text weight={300} size='16px'>
            <FormattedMessage id='scenes.exchange.text' defaultMessage='You can now exchange your bitcoin for ether and vice versa directly from your Blockchain wallet. In a few simple steps, your exchange will be in progress. Note: exchanges usually take between twenty minutes and two hours.' />
          </Text>
        </TextGroup>
      </ColumnRight>
    </Wrapper>
  )
}

export default Exchange
