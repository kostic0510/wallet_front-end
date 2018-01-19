import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import { getContext, getData } from './selectors'
import { selectors, actions } from 'data'
// import Error from './template.error'
// import Loading from './template.loading'
// import Success from './template.success'
import Content from './template'

const threshold = 250

class ContentContainer extends React.Component {
  componentWillMount () {
    // if (Remote.NotAsked.is(this.props.data)) {
    this.props.dataBitcoinActions.fetchTransactions(this.props.context, true, 0)
    // }
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.data.source !== nextProps.data.source) {
      this.props.dataBitcoinActions.fetchTransactions(nextProps.data.source, true, 0)
    }
    
    // const fetchTransactions = curry((reset, ntx, currentData, nextData) =>
    //   this.props.dataBitcoinActions.fetchTransactions(nextData.source, reset, ntx)
    // )

    // Appends more transactions depending on the scroll position
    // if (!equals(this.props.scroll.yOffset, nextProps.scroll.yOffset)) {
    //   if (nextProps.scroll.yMax - nextProps.scroll.yOffset < threshold) {
    //     console.log('ask for more')
    //     const nbTransactions = nextProps.data.map(compose(length, prop('transactions')))
    //     nbTransactions.map(console.log)
    //     lift(fetchTransactions(false))(nbTransactions, this.props.data, nextProps.data)
    //   }
    // }
  }

  render () {
    const { data } = this.props
    console.log(data)
    // return data.cata({
    //   Success: (value) => <div />, // <Success isEmpty={equals(value.total, 0)} transactions={value.transactions} />,
    //   Failure: (message) => <Error>{message}</Error>,
    //   Loading: () => <Loading />,
    //   NotAsked: () => <Loading />
    // })
    return <Content {...data} />
    // return <div />
  }
}

const mapStateToProps = state => ({
  data: getData(state),
  context: getContext(state),
  scroll: selectors.scroll.selectScroll(state)
})

const mapDispatchToProps = (dispatch) => ({
  dataBitcoinActions: bindActionCreators(actions.core.data.bitcoin, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(ContentContainer)
