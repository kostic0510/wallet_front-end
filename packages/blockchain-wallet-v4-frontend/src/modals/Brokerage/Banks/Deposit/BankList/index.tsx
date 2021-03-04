import { bindActionCreators, Dispatch } from 'redux'
import { connect, ConnectedProps } from 'react-redux'
import React, { useEffect } from 'react'

import { actions } from 'data'
import { Remote } from 'blockchain-wallet-v4/src'
import { RootState } from 'data/rootReducer'
import { WalletFiatType } from 'core/types'

import { getData } from './selectors'
import Failure from '../template.failure'
import Loading from '../template.loading'
import Success from './template.success'

const BankList = (props: Props) => {
  useEffect(() => {
    if (props.fiatCurrency && !Remote.Success.is(props.data)) {
      props.brokerageActions.fetchBankTransferAccounts()
    }
    props.custodialActions.fetchCustodialBeneficiaries(props.fiatCurrency)
  }, [])

  return props.data.cata({
    Success: val => <Success {...val} {...props} />,
    Failure: () => <Failure {...props} handleClose={props.handleClose} />,
    Loading: () => <Loading />,
    NotAsked: () => <Loading />
  })
}

const mapStateToProps = (state: RootState, ownProps: OwnProps) => ({
  data: getData(state, ownProps)
})

export const mapDispatchToProps = (dispatch: Dispatch) => ({
  analyticsActions: bindActionCreators(actions.analytics, dispatch),
  custodialActions: bindActionCreators(actions.custodial, dispatch),
  brokerageActions: bindActionCreators(actions.components.brokerage, dispatch)
})

const connector = connect(mapStateToProps, mapDispatchToProps)

export type OwnProps = {
  fiatCurrency?: WalletFiatType
  handleClose: () => void
}
export type Props = OwnProps & ConnectedProps<typeof connector>

export default connector(BankList)
