import { Cartridge } from '@blockchain-com/components'
import {
  CoinIcon,
  Destination,
  MenuIcon,
  MenuItem,
  Separator,
  Wrapper
} from 'components/MenuLeft'
import { FormattedMessage } from 'react-intl'
import { LinkContainer } from 'react-router-bootstrap'
import { mapObjIndexed, toLower, values } from 'ramda'
import { Props } from '.'
import { SupportedCoinType } from 'core/types'
import { Text, TooltipHost, TooltipIcon } from 'blockchain-info-components'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

const HelperTipContainer = styled.div`
  position: relative;
  > div span {
    color: ${props => props.theme['grey400']};
  }
`
const HelperTip = styled(TooltipHost)`
  position: absolute;
  left: 74px;
  top: -8px;
`
export const NewCartridge = styled(Cartridge)`
  color: ${props => props.theme.orange600} !important;
  background-color: ${props => props.theme.white};
  letter-spacing: 1px;
  margin-left: auto;
  margin-right: -4px;
  padding: 4px 4px;
  border: 1px solid ${props => props.theme.grey000};
  border-radius: 4px;
`

type OwnProps = {
  exchangeUrl: string
}

const ExchangeNavItem = props => (
  <>
    <MenuIcon
      className='icon'
      name='blockchain-logo'
      style={{ marginLeft: '-2px' }}
      size='26px'
    />
    <Destination style={{ marginLeft: '2px' }}>
      <FormattedMessage
        id='layouts.wallet.menuleft.navigation.blockchain-exchange-1'
        defaultMessage='Exchange'
      />
    </Destination>
    {props.isExchangeAccountLinked && (
      <HelperTipContainer>
        <HelperTip id='exchangeSideNavConnected'>
          <TooltipIcon color='blue600' name='info' />
        </HelperTip>
      </HelperTipContainer>
    )}
  </>
)

const Navigation = (props: OwnProps & Props) => {
  const { ...rest } = props
  const { supportedCoins } = rest
  const coinOrder = [
    supportedCoins.PAX,
    supportedCoins.BTC,
    supportedCoins.ETH,
    supportedCoins.BCH,
    supportedCoins.XLM
  ]

  return (
    <Wrapper {...rest}>
      <LinkContainer to='/home' activeClassName='active'>
        <MenuItem data-e2e='dashboardLink'>
          <MenuIcon className='icon' name='home' size='24px' />
          <Destination>
            <FormattedMessage
              id='layouts.wallet.menuleft.navigation.dashboard'
              defaultMessage='Dashboard'
            />
          </Destination>
        </MenuItem>
      </LinkContainer>
      {values(
        mapObjIndexed(
          (coin: SupportedCoinType, i) =>
            coin &&
            coin.txListAppRoute &&
            coin.invited && (
              <LinkContainer
                key={i}
                to={coin.txListAppRoute}
                activeClassName='active'
              >
                <MenuItem
                  data-e2e={`${toLower(coin.coinCode)}Link`}
                  colorCode={coin.colorCode}
                  className='coin'
                >
                  <CoinIcon
                    className='coin-icon'
                    color={coin.colorCode}
                    name={coin.icons.circleFilled}
                    size='24px'
                  />
                  <Destination>{coin.displayName}</Destination>
                  {coin.showNewTagSidenav && (
                    <NewCartridge>
                      <Text color='orange600' size='12' weight={500} uppercase>
                        <FormattedMessage id='copy.new' defaultMessage='New' />
                      </Text>
                    </NewCartridge>
                  )}
                </MenuItem>
              </LinkContainer>
            ),
          coinOrder
        )
      )}
      <Separator />
      <LinkContainer to='/airdrops' activeClassName='active'>
        <MenuItem data-e2e='airdropLink' className='airdrop'>
          <MenuIcon className='icon' name='parachute' size='24px' />
          <Destination>
            <FormattedMessage
              id='layouts.wallet.menuleft.navigation.airdrops'
              defaultMessage='Airdrops'
            />
          </Destination>
          {/* UNCOMMENT WHEN AIRDROPS ARE IN PROGRESS */}
          {/* <NewCartridge> */}
          {/*  <Text color='green600' size='12' weight={600} uppercase> */}
          {/*    <FormattedMessage */}
          {/*      id='layouts.wallet.menuleft.navigation.airdrop.active' */}
          {/*      defaultMessage='Active' */}
          {/*    /> */}
          {/*  </Text> */}
          {/* </NewCartridge> */}
        </MenuItem>
      </LinkContainer>
      <LinkContainer to='/exchange' activeClassName='active'>
        <MenuItem data-e2e='exchangeLink'>
          <ExchangeNavItem {...props} />
        </MenuItem>
      </LinkContainer>
      {props.lockboxDevices.length > 0 ? (
        <LinkContainer to='/lockbox' activeClassName='active'>
          <MenuItem data-e2e='lockboxLink'>
            <MenuIcon
              className='icon'
              name='hardware'
              style={{ paddingLeft: '2px' }}
              size='24px'
            />
            <Destination style={{ marginLeft: '-2px' }}>
              <FormattedMessage
                id='layouts.wallet.menuleft.navigation.hardware'
                defaultMessage='Hardware'
              />
            </Destination>
            <HelperTipContainer>
              <HelperTip id='lockboxRequired'>
                <TooltipIcon color='blue600' name='info' />
              </HelperTip>
            </HelperTipContainer>
          </MenuItem>
        </LinkContainer>
      ) : null}
    </Wrapper>
  )
}

Navigation.propTypes = {
  lockboxOpened: PropTypes.bool
}

export default Navigation
