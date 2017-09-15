import React from 'react'
import PropTypes from 'prop-types'
import { FormattedMessage } from 'react-intl'

import { Button, Text } from 'blockchain-info-components'
import { SettingWrapper } from 'components/Setting'

const Setting = (props) => {
  const { handleClick, smsNumber, smsVerified } = props

  return (
    <SettingWrapper>
      <Text>{smsNumber}</Text>
      <Button nature='primary' onClick={handleClick}>
        { smsVerified === 1
          ? <FormattedMessage id='scenes.preferences.mobile.setting.change' defaultMessage='Change' />
          : <FormattedMessage id='scenes.preferences.mobile.setting.verify' defaultMessage='Verify' />
        }
      </Button>
    </SettingWrapper>
  )
}

Setting.propTypes = {
  smsNumber: PropTypes.string.isRequired,
  smsVerified: PropTypes.number.isRequired,
  handleClick: PropTypes.func.isRequired
}

export default Setting
