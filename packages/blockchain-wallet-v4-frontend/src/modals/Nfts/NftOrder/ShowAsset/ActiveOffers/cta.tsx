import React, { useEffect } from 'react'
import { FormattedMessage } from 'react-intl'
import BigNumber from 'bignumber.js'

import { Remote } from '@core'
import { displayCoinToCoin } from '@core/exchange'
import { GasCalculationOperations, NftAsset } from '@core/network/api/nfts/types'
import {
  Button,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Text,
  Tooltip,
  TooltipHost
} from 'blockchain-info-components'
import CoinDisplay from 'components/Display/CoinDisplay'
import FiatDisplay from 'components/Display/FiatDisplay'
import { NftOrderStepEnum } from 'data/components/nfts/types'

import { Props as OwnProps } from '../..'

const CTA: React.FC<Props> = (props) => {
  const { acceptOffer, nftActions, offerToAccept, offersForAsset, orderFlow } = props

  const fees = orderFlow.fees.getOrElse({
    approvalFees: 0,
    gasFees: 0,
    gasPrice: 0,
    proxyFees: 0,
    totalFees: 0
  })

  useEffect(() => {
    nftActions.fetchNftOffersForAsset({
      asset_contract_address: props.asset.asset_contract.address,
      token_id: props.asset.token_id
    })
  }, [])

  return offersForAsset.list.length ? (
    <>
      <Text size='16px' weight={600} color='grey900'>
        <FormattedMessage id='copy.active_offers' defaultMessage='Active Offers' />
      </Text>
      <Table style={{ maxHeight: '150px', overflow: 'scroll' }}>
        <TableHeader>
          <TableCell>
            <Text size='12px' weight={600}>
              Price
            </Text>
          </TableCell>
          <TableCell>
            <Text size='12px' weight={600}>
              Expires
            </Text>
          </TableCell>
          <TableCell style={{ justifyContent: 'center' }}>
            <Text size='12px' weight={600}>
              Actions
            </Text>
          </TableCell>
        </TableHeader>
        {[...offersForAsset.list]
          .sort((a, b) => {
            return a.created_date < b.created_date ? 1 : -1
          })
          ?.map((offer) => {
            return (
              <>
                <TableRow key={offer.created_date}>
                  <TableCell>
                    <Text size='14px' weight={600}>
                      {displayCoinToCoin({
                        coin: 'WETH',
                        value: offer.bid_amount
                      })}
                    </Text>
                  </TableCell>
                  <TableCell>-</TableCell>
                  <TableCell style={{ justifyContent: 'center' }}>
                    <Button
                      small
                      disabled={Remote.Loading.is(acceptOffer)}
                      onClick={() => {
                        nftActions.fetchFees({
                          event: offer,
                          operation: GasCalculationOperations.Accept
                        })
                        nftActions.setOrderFlowStep({
                          step: NftOrderStepEnum.ACCEPT_OFFER
                        })
                      }}
                      nature='empty'
                      data-e2e='acceptNftOffer'
                    >
                      <FormattedMessage id='button.accept' defaultMessage='Accept' />
                    </Button>
                  </TableCell>
                </TableRow>
              </>
            )
          })}
      </Table>
    </>
  ) : null
}

type Props = OwnProps & { asset: NftAsset }

export default CTA
