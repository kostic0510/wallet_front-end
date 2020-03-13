import { Button } from 'blockchain-info-components'
import { FormattedMessage } from 'react-intl'
import { model } from 'data'
import { Props } from '../template.success'
import React from 'react'
import styled from 'styled-components'

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  > button {
    width: 45% !important;
  }
`

const { lastTxStatus } = model.components.borrow

const ActionButton: React.FC<Props> = props => {
  const isLastTxFailed = lastTxStatus(props.loan, props.loanTransactions, [
    'FAILED'
  ])

  switch (props.loan.status) {
    case 'PENDING_COLLATERAL_DEPOSIT':
    case 'PENDING_EXECUTION':
      return isLastTxFailed ? (
        <ButtonContainer>
          <Button
            nature='light'
            data-e2e='closeBorrowDetails'
            onClick={() => props.handleClose()}
          >
            <FormattedMessage
              id='modals.details.borrow.close'
              defaultMessage='Close'
            />
          </Button>
          <Button
            nature='primary'
            data-e2e='endBorrow'
            onClick={() =>
              props.borrowActions.setStep({
                step: 'ADD_COLLATERAL',
                offer: props.offer,
                loan: props.loan
              })
            }
          >
            <FormattedMessage
              id='modals.details.borrow.addcollat'
              defaultMessage='Add Collateral'
            />
          </Button>
        </ButtonContainer>
      ) : (
        <Button
          fullwidth
          nature='light'
          data-e2e='closeBorrowDetails'
          onClick={() => props.handleClose()}
        >
          <FormattedMessage
            id='modals.details.borrow.close'
            defaultMessage='Close'
          />
        </Button>
      )
    case 'OPEN':
      return isLastTxFailed ? (
        <ButtonContainer>
          <Button
            nature='primary'
            data-e2e='endBorrow'
            onClick={() =>
              props.borrowActions.setStep({
                step: 'ADD_COLLATERAL',
                offer: props.offer,
                loan: props.loan
              })
            }
          >
            <FormattedMessage
              id='modals.details.borrow.addcollat'
              defaultMessage='Add Collateral'
            />
          </Button>
          <Button
            fullwidth
            nature='dark-grey'
            data-e2e='endBorrow'
            onClick={() =>
              props.borrowActions.setStep({
                step: 'REPAY_LOAN',
                offer: props.offer,
                loan: props.loan
              })
            }
          >
            <FormattedMessage
              id='modals.details.borrow.endborrow'
              defaultMessage='End Borrowing'
            />
          </Button>
        </ButtonContainer>
      ) : (
        <Button
          fullwidth
          nature='dark-grey'
          data-e2e='endBorrow'
          onClick={() =>
            props.borrowActions.setStep({
              step: 'REPAY_LOAN',
              offer: props.offer,
              loan: props.loan
            })
          }
        >
          <FormattedMessage
            id='modals.details.borrow.endborrow'
            defaultMessage='End Borrowing'
          />
        </Button>
      )
    case 'PENDING_CLOSE':
      return isLastTxFailed ? (
        <Button
          fullwidth
          nature='dark-grey'
          data-e2e='endBorrow'
          onClick={() =>
            props.borrowActions.setStep({
              step: 'REPAY_LOAN',
              offer: props.offer,
              loan: props.loan
            })
          }
        >
          <FormattedMessage
            id='modals.details.borrow.retryrepayment'
            defaultMessage='Retry Repayment'
          />
        </Button>
      ) : (
        <Button
          fullwidth
          nature='light'
          data-e2e='closeBorrowDetails'
          onClick={() => props.handleClose()}
        >
          <FormattedMessage
            id='modals.details.borrow.close'
            defaultMessage='Close'
          />
        </Button>
      )
    default: {
      return (
        <Button
          fullwidth
          nature='light'
          data-e2e='closeBorrowDetails'
          onClick={() => props.handleClose()}
        >
          <FormattedMessage
            id='modals.details.borrow.close'
            defaultMessage='Close'
          />
        </Button>
      )
    }
  }
}

export default ActionButton
