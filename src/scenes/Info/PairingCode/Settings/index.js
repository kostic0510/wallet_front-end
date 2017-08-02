
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import { actions, selectors } from 'data'
import Settings from './template.js'

class SettingsContainer extends React.Component {
  constructor (props) {
    super(props)
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick () {
    this.props.modalActions.showModal('PairingCode')
  }

  render () {
    return <Settings {...this.props} handleClick={this.handleClick} />
  }
}

const mapStateToProps = (state) => {
  return {
    guid: selectors.core.wallet.getGuid(state),
    sharedKey: selectors.core.wallet.getSharedKey(state)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    modalActions: bindActionCreators(actions.modals, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(SettingsContainer)
