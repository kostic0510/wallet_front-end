import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { formValueSelector } from 'redux-form'
import { equals, toLower } from 'ramda'
import { actions } from 'data'

import FirstStep from './template.js'

class FirstStepContainer extends React.Component {
  constructor (props) {
    super(props)

    const { exchangeAccounts } = this.props
    const sourceCoin = exchangeAccounts && exchangeAccounts.source ? exchangeAccounts.source.coin : 'BTC'
    const targetCoin = exchangeAccounts && exchangeAccounts.target ? exchangeAccounts.target.coin : 'ETH'
    const sourceAmount = exchangeAccounts && exchangeAccounts.source ? exchangeAccounts.source.amount : 0
    this.handleNext = this.handleNext.bind(this)
    this.state = { sourceCoin, targetCoin, sourceAmount }
  }

  componentWillReceiveProps (nextProps) {
    const nextExchangeAccounts = nextProps.exchangeAccounts
    console.log('Next exchange accounts', nextExchangeAccounts)
    if (nextExchangeAccounts) {
      if (!equals(this.props.exchangeAccounts, nextExchangeAccounts)) {
        this.setState({
          sourceCoin: nextExchangeAccounts.source.coin,
          targetCoin: nextExchangeAccounts.target.coin,
          sourceAddress: nextExchangeAccounts.source.coin === 'ETH' ? nextExchangeAccounts.source.address : nextExchangeAccounts.source.xpub,
          targetAddress: nextExchangeAccounts.target.coin === 'ETH' ? nextExchangeAccounts.target.address : nextExchangeAccounts.target.xpub,
          sourceAmount: nextExchangeAccounts.source.amount
        })
      }
    }
  }

  handleNext () {
    console.log('Submitting step 1')
    // Make request to shapeShift to create order
    console.log(this.state)
    const { sourceCoin, targetCoin, sourceAmount, sourceAddress, targetAddress } = this.state
    const pair = toLower(sourceCoin + '_' + targetCoin)
    this.props.shapeShiftActions.createOrder({
      depositAmount: sourceAmount,
      pair,
      returnAddress: sourceAddress,
      withdrawal: targetAddress
    })
    this.props.nextStep()
  }

  render () {
    const { exchangeAccounts, ...rest } = this.props

    return (
      <FirstStep
        sourceCoin={this.state.sourceCoin}
        targetCoin={this.state.targetCoin}
        sourceAmount={this.state.amount}
        handleNext={this.handleNext}
        {...rest} />
    )
  }
}

const mapStateToProps = (state) => ({
  exchangeAccounts: formValueSelector('exchange')(state, 'accounts')
})

const mapDispatchToProps = (dispatch) => ({
  shapeShiftActions: bindActionCreators(actions.payment.shapeShift, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(FirstStepContainer)
