import { reduxForm } from 'redux-form'
import React from 'react'
import styled from 'styled-components'

import { model } from 'data'
import UnusedAddresses from './UnusedAddresses'
import UsedAddresses from './UsedAddresses'
const { WALLET_TX_SEARCH } = model.form

const Wrapper = styled.section`
  box-sizing: border-box;
`
class ManageAddressesContainer extends React.PureComponent {
  render () {
    const walletIndex = this.props.match.params.index
    return (
      <Wrapper>
        <UnusedAddresses walletIndex={walletIndex} />
        <UsedAddresses walletIndex={walletIndex} />
      </Wrapper>
    )
  }
}

export default reduxForm({
  form: WALLET_TX_SEARCH
})(ManageAddressesContainer)
