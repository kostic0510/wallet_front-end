import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import { getData } from './selectors'
import { actions } from 'data'

import Error from './template.error'
import Loading from './template.loading'
import Success from './template.success'

class SecondStepContainer extends React.PureComponent {
  render () {
    return this.props.data.cata({
      Success: (value) => <Success
        {...value}
        coin='BCH'
        handleSubmit={() => this.props.actions.sendBchSecondStepSubmitClicked()}
        handleBack={() => this.props.actions.sendBchSecondStepCancelClicked()}
      />,
      Failure: (message) => <Error>{message}</Error>,
      Loading: () => <Loading />,
      NotAsked: () => <Loading />
    })
  }
}

const mapStateToProps = state => ({
  data: getData(state)
})

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(actions.components.sendBch, dispatch)
})

export default connect(mapStateToProps, mapDispatchToProps)(SecondStepContainer)
