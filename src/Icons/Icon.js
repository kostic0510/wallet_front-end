import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { Text } from '../Text'
import Icomoon from './Icomoon'

console.log(Icomoon)

const IconImage = styled.span`
  &:before {
    font-family: 'icomoon';
    content: '${props => props.code}';
  }
`

const Icon = (props) => {
  const { name, ...rest } = props
  const code = Icomoon[name]

  return (
    <Text {...rest}>
      <IconImage code={code} />
    </Text>
  )
}

Icon.propTypes = {
  name: PropTypes.string.isRequired
}

export default Icon
