import { bindActionCreators, compose } from 'redux'
import { connect } from 'react-redux'
import { FormattedMessage } from 'react-intl'
import { includes, pickBy } from 'ramda'
import React from 'react'
import styled from 'styled-components'

import { actions, model } from 'data'
import { getData } from './selectors'
import { ModalBody, ModalHeader } from 'blockchain-info-components'
import { ModalPropsType } from '../../types'
import { RemoteDataType } from 'core/types'
import DataError from 'components/DataError'
import Loading from './template.loading'
import media from 'services/ResponsiveService'
import modalEnhancer from 'providers/ModalEnhancer'
import MoreInfo from './MoreInfo'
import Personal from './Personal'
import StepIndicator from 'components/StepIndicator'
import Submitted from './Submitted'
import Tray, { duration } from 'components/Tray'
import Verify from './Verify'
import VerifyMobile from './VerifyMobile'

const HeaderWrapper = styled.div`
  display: flex;
  flex-direction: row;
  ${media.mobile`
    flex-direction: column;
  `};
`

const StepHeader = styled(ModalHeader)`
  padding: 12px !important;
  > div {
    width: 100%;
    > div {
      width: 100%;
    }
  }
  & > :first-child {
    margin-right: 42px;
  }
`
const ErrorHeader = styled(ModalHeader)`
  border-bottom: 0px;
`
const IdentityVerificationTray = styled(Tray)<ModalPropsType>`
  margin-top: 0;
  border-radius: 0;
  height: 100%;
  > div:first-child {
    padding: 20px;
    > span:last-child {
      top: 0;
      right: 0;
      margin: 20px;
    }
  }
  > div:last-child {
    padding: 0;
    height: calc(100% - 57px);
  }
`

const KycStepIndicator = styled(StepIndicator)`
  justify-content: space-between;
  span {
    display: none;
  }
  > img {
    margin-left: 0;
    margin-right: 10px;
    height: 32px;
  }
  > div {
    flex: 1;
    height: 8px;
    max-width: 840px;
    margin: auto;
    padding: 0;
    border-radius: 4px;
    border: none;
    background-color: ${props => props.theme.grey200};
    &:after {
      bottom: 0;
      border-radius: 4px;
      background-color: ${props => props.theme.blue600};
    }
  }
`

const { STEPS, KYC_MODAL } = model.components.identityVerification

const stepMap = {
  [STEPS.personal]: (
    <FormattedMessage
      id='modals.identityverification.steps.personal'
      defaultMessage='Personal'
    />
  ),
  [STEPS.moreInfo]: (
    <FormattedMessage
      id='modals.identityverification.steps.more_info'
      defaultMessage='Info'
    />
  ),
  [STEPS.mobile]: (
    <FormattedMessage
      id='modals.identityverification.steps.mobile'
      defaultMessage='Phone'
    />
  ),
  [STEPS.verify]: (
    <FormattedMessage
      id='modals.identityverification.steps.verify'
      defaultMessage='Verify'
    />
  ),
  [STEPS.submitted]: (
    <FormattedMessage
      id='modals.identityverification.steps.submitted'
      defaultMessage='Submitted'
    />
  )
}

type OwnProps = {
  close: () => void
  needMoreInfo: boolean
  position: number
  step: number
  steps: RemoteDataType<any, any>
  tier: number
  total: number
}

type LinkDispatchPropsType = {
  actions: typeof actions.components.identityVerification
}

type Props = OwnProps & LinkDispatchPropsType

class IdentityVerification extends React.PureComponent<Props> {
  state = { show: false }

  componentDidMount () {
    /* eslint-disable */
    this.setState({ show: true })
    /* eslint-enable */
    this.initializeVerification()
  }

  getSteps = steps => pickBy((_, step) => includes(step, steps), stepMap)

  handleClose = () => {
    this.setState({ show: false })
    setTimeout(this.props.close, duration)
  }

  initializeVerification = () => {
    const { tier, needMoreInfo } = this.props
    this.props.actions.initializeVerification(tier, needMoreInfo)
  }

  getStepComponent = step => {
    const { actions } = this.props

    if (step === STEPS.personal)
      return (
        <Personal
          handleSubmit={actions.savePersonalData}
          onBack={actions.goToPrevStep}
        />
      )

    if (step === STEPS.moreInfo) return <MoreInfo />

    if (step === STEPS.mobile)
      return (
        <VerifyMobile
          handleSubmit={actions.verifySmsNumber}
          onBack={actions.goToPrevStep}
        />
      )

    if (step === STEPS.verify)
      return <Verify onBack={actions.goToPrevStep} onClose={this.handleClose} />
    if (step === STEPS.submitted)
      return <Submitted onClose={this.handleClose} />
  }

  render () {
    const { show } = this.state
    const { step, steps, position, total } = this.props

    return (
      <IdentityVerificationTray
        in={show}
        // @ts-ignore
        class='tray'
        position={position}
        total={total}
        onClose={this.handleClose}
        data-e2e='identityVerificationModal'
      >
        {steps.cata({
          Success: steps => (
            <React.Fragment>
              <StepHeader onClose={this.handleClose}>
                <HeaderWrapper>
                  <KycStepIndicator
                    adjuster={0}
                    barFullWidth
                    horizontalMobile
                    flexEnd
                    maxWidth='none'
                    step={step}
                    stepMap={this.getSteps(steps)}
                  />
                </HeaderWrapper>
              </StepHeader>
              <ModalBody>{this.getStepComponent(step)}</ModalBody>
            </React.Fragment>
          ),
          Loading: () => <Loading />,
          NotAsked: () => <Loading />,
          Failure: error => (
            <React.Fragment>
              <ErrorHeader onClose={this.handleClose} />
              <DataError
                onClick={this.initializeVerification}
                message={error}
              />
            </React.Fragment>
          )
        })}
      </IdentityVerificationTray>
    )
  }
}

// @ts-ignore
IdentityVerification.defaultProps = {
  step: STEPS.personal
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators(actions.components.identityVerification, dispatch)
})

const enhance = compose(
  modalEnhancer(KYC_MODAL, { preventEscapeClose: true }),
  connect(getData, mapDispatchToProps)
)

export default enhance(IdentityVerification)
