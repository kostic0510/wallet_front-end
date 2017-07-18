import React from 'react'
import styled from 'styled-components'

const NumberContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  width: 100%;
  height: auto;
`
const NumberInput = styled.input.attrs({
  type: 'number'
})`
  display: block;
  width: 100%;
  height: 40px;
  min-height: 40px;
  padding: 6px 12px;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.42;
  color: #555555;
  background-color: #FFFFFF;
  background-image: none;
  outline-width: 0;
  user-select: text;
  border: 1px solid ${props => props.errorState === 'initial' ? '#CCCCCC' : props.errorState === 'invalid' ? '#990000' : '#006600'};

  &::-webkit-input-placeholder { color: #A8A8A8; }
`
const NumberError = styled.label`
  position: absolute;
  top: -18px;
  right: 0;
  display: block;
  height: 15px;
  font-size: 13px;
  font-weight: 300;
  color: #FF0000;
`

const NumberBox = (field) => {
  let errorState = !field.meta.touched ? 'initial' : (field.meta.invalid ? 'invalid' : 'valid')
  return (
    <NumberContainer>
      <NumberInput {...field.input} errorState={errorState} placeholder={field.placeholder} />
      {field.meta.touched && field.meta.error && <NumberError>{field.meta.error}</NumberError>}
    </NumberContainer>
  )
}

export default NumberBox
