import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

const BaseTextGroup = styled.div`
  ${props => props.nowrap ? '& > * { white-space: nowrap }' : '& > * { white-space: normal }'};
  ${props => props.inline ? '& > * { display: inline; }' : '& > * { display: block; margin-bottom: 10px; }'};
`
const TextGroup = props => {
  const { children, ...rest } = props

  return (
    <BaseTextGroup {...rest}>{children}</BaseTextGroup>
  )
}

TextGroup.propTypes = {
  nowrap: PropTypes.bool.isRequired,
  inline: PropTypes.bool.isRequired
}

TextGroup.defaultProps = {
  nowrap: false,
  inline: false
}

export default TextGroup
