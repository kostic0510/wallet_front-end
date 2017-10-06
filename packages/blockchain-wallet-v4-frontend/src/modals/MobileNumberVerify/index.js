import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { bindActionCreators, compose } from 'redux'
import { formValueSelector } from 'redux-form'

import { actions } from 'data'
import modalEnhancer from 'providers/ModalEnhancer'
import MobileNumberVerify from './template.js'

class MobileNumberVerifyContainer extends React.Component {
  constructor (props) {
    super(props)
    this.onSubmit = this.onSubmit.bind(this)
    this.handleResend = this.handleResend.bind(this)
    this.handleChange = this.handleChange.bind(this)
  }

  componentDidMount () {
    this.handleResend()
  }

  onSubmit (e) {
    e.preventDefault()
    this.props.settingsActions.verifyMobile(this.props.code)
    this.props.modalActions.closeAllModals()
  }

  handleResend () {
    this.props.settingsActions.updateMobile(this.props.mobileNumber)
  }

  handleChange () {
    this.props.modalActions.closeModal()
    this.props.modalActions.showModal('MobileNumberChange')
  }

  render () {
    return (
      <MobileNumberVerify
        {...this.props}
        onSubmit={this.onSubmit}
        handleResend={this.handleResend}
        handleChange={this.handleChange}
      />
    )
  }
}

MobileNumberVerifyContainer.propTypes = {
  mobileNumber: PropTypes.string.isRequired
}

const mapStateToProps = (state) => ({
  code: formValueSelector('mobileNumberVerify')(state, 'code')
})

const mapDispatchToProps = (dispatch) => ({
  modalActions: bindActionCreators(actions.modals, dispatch),
  settingsActions: bindActionCreators(actions.settings, dispatch)
})

const enhance = compose(
  modalEnhancer('MobileNumberVerify'),
  connect(mapStateToProps, mapDispatchToProps)
)

export default enhance(MobileNumberVerifyContainer)
