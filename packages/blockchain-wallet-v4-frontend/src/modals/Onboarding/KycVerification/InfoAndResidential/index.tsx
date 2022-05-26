import React, { PureComponent } from 'react'
import { connect, ConnectedProps } from 'react-redux'
import { bindActionCreators } from 'redux'

import { ExtractSuccess } from '@core/types'
import DataError from 'components/DataError'
import { actions, model, selectors } from 'data'
import { CountryType } from 'data/components/identityVerification/types'
import { RootState } from 'data/rootReducer'
import { Analytics, InfoAndResidentialFormValuesType } from 'data/types'

import Loading from '../template.loading'
import { getData } from './selectors'
import Success from './template.success'

const { INFO_AND_RESIDENTIAL_FORM } = model.components.identityVerification

class InfoAndResidential extends PureComponent<Props> {
  componentDidMount() {
    this.fetchData()
  }

  fetchData = () => {
    this.props.identityVerificationActions.fetchSupportedCountries()
    this.props.identityVerificationActions.fetchStates()
  }

  handleSubmit = () => {
    const {
      analyticsActions,
      checkSddEligibility,
      identityVerificationActions,
      onCompletionCallback
    } = this.props
    identityVerificationActions.saveInfoAndResidentialData({
      checkSddEligibility,
      onCompletionCallback
    })
    analyticsActions.trackEvent({
      key: Analytics.ONBOARDING_PERSONAL_INFORMATION_ENTERED,
      properties: {
        origin: 'SETTINGS'
      }
    })
  }

  onCountryChange = (e, value) => {
    this.setDefaultCountry(value)
  }

  setDefaultCountry = (country: CountryType) => {
    this.props.formActions.change(INFO_AND_RESIDENTIAL_FORM, 'country', country)
    this.props.formActions.clearFields(INFO_AND_RESIDENTIAL_FORM, false, false, 'state')
  }

  setDefaultState = (state: string) => {
    // states have prefix US- we have to remove it for preselect
    const realState = state.replace('US-', '')
    this.props.formActions.change(INFO_AND_RESIDENTIAL_FORM, 'state', realState)
  }

  render() {
    return this.props.data.cata({
      Failure: () => <DataError onClick={this.fetchData} />,
      Loading: () => <Loading />,
      NotAsked: () => <Loading />,
      Success: (val) => (
        <Success
          {...this.props}
          {...val}
          onSubmit={this.handleSubmit}
          onCountrySelect={this.onCountryChange}
          updateDefaultCountry={this.setDefaultCountry}
          updateDefaultState={this.setDefaultState}
          initialValues={{
            ...val.userData
          }}
        />
      )
    })
  }
}

const mapStateToProps = (state: RootState) => ({
  countryCode: selectors.core.settings.getCountryCode(state).getOrElse(null),
  data: getData(state),
  formValues: selectors.form.getFormValues(INFO_AND_RESIDENTIAL_FORM)(state) as
    | InfoAndResidentialFormValuesType
    | undefined,
  usState: selectors.core.settings.getUsState(state).getOrElse(null)
})

const mapDispatchToProps = (dispatch) => ({
  analyticsActions: bindActionCreators(actions.analytics, dispatch),
  formActions: bindActionCreators(actions.form, dispatch),
  identityVerificationActions: bindActionCreators(actions.components.identityVerification, dispatch)
})

const connector = connect(mapStateToProps, mapDispatchToProps)

export type OwnProps = {
  checkSddEligibility?: boolean
  onClose: () => void
  onCompletionCallback?: () => void
}

export type SuccessStateType = ExtractSuccess<ReturnType<typeof getData>>

export type Props = OwnProps & ConnectedProps<typeof connector>

export default connector(InfoAndResidential)
