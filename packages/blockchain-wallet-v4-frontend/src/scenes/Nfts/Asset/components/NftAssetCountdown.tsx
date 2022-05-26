import React, { useEffect, useState } from 'react'
import { colors } from '@blockchain-com/constellation'
import styled from 'styled-components'

import { Text } from 'blockchain-info-components'

import { EthText } from '.'

const CountdownText = styled(EthText)`
  font-size: 24px;
  line-height: 32px;
`
const GreyLetter = styled(Text)`
  color: ${colors.grey400};
  padding-right: 8px;
`
const NftAssetCountdown: React.FC<Props> = ({ countDownDate }) => {
  const [Countdown, setCountdown] = useState('')

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const duration = countDownDate - now
      const days = Math.floor(duration / (1000 * 60 * 60 * 24)).toString()
      const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString()
      const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60)).toString()
      setCountdown(() => `${days},${hours},${minutes}`)
      return { duration }
    }
    const interval = setInterval(function () {
      const { duration } = updateCountdown()
      // if duration < 0, expired
      if (duration < 0) {
        clearInterval(interval)
      }
    }, 1000)

    updateCountdown()

    return () => clearInterval(interval)
  }, [Countdown])

  return (
    <CountdownText>
      {Countdown.split(',')[0]}
      <GreyLetter size='24px' lineHeight='32px' weight={600}>
        d
      </GreyLetter>{' '}
      {Countdown.split(',')[1]}
      <GreyLetter size='24px' lineHeight='32px' weight={600}>
        h
      </GreyLetter>{' '}
      {Countdown.split(',')[2]}
      <GreyLetter size='24px' lineHeight='32px' weight={600}>
        m
      </GreyLetter>
    </CountdownText>
  )
}

type Props = {
  countDownDate: number
}

export default NftAssetCountdown
