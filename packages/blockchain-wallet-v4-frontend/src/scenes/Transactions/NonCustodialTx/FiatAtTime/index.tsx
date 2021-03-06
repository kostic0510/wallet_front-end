import React from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { bindActionCreators } from 'redux'

import { FiatType } from '@core/types'
import { actions } from 'data'

import { getData } from './selectors'
import Error from './template.error'
import Loading from './template.loading'
import Success from './template.success'

class FiatAtTime extends React.PureComponent<Props> {
  componentDidMount() {
    const { amount, currency, hash, time } = this.props
    this.props.actions.fetchFiatAtTime(hash, amount, time * 1000, currency)
  }

  render() {
    const { data } = this.props

    return data.cata({
      Failure: (message) => <Error>{message}</Error>,
      Loading: () => <Loading />,
      NotAsked: () => null,
      Success: (value) => <Success fiatAtTime={value} />
    })
  }
}

const mapStateToProps = (state, ownProps: OwnProps) => ({
  data: getData(ownProps.hash, ownProps.currency, state)
})

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(actions.core.data.btc, dispatch)
})

const connector = connect(mapStateToProps, mapDispatchToProps)

type OwnProps = {
  amount: number
  currency: FiatType
  hash: string
  time: number
}

type Props = OwnProps & ConnectedProps<typeof connector>

export default connector(FiatAtTime)
