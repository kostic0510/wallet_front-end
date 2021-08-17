import { SEND_FORM } from 'blockchain-wallet-v4-frontend/src/modals/SendCrypto/model'
import { SendFormType } from 'blockchain-wallet-v4-frontend/src/modals/SendCrypto/types'
import { call, put, select } from 'redux-saga/effects'

import { convertCoinToCoin } from 'blockchain-wallet-v4/src/exchange'
import { APIType } from 'blockchain-wallet-v4/src/network/api'
import { errorHandler } from 'blockchain-wallet-v4/src/utils'
import { selectors } from 'data'

import * as S from './selectors'
import { actions as A } from './slice'
import { SendCryptoStepType } from './types'

export default ({ api }: { api: APIType }) => {
  const fetchFees = function* () {
    yield put(A.fetchWithdrawalFeesLoading())
    try {
      const withdrawalFees: ReturnType<typeof api.getWithdrawalFees> = yield call(
        api.getWithdrawalFees,
        'simplebuy'
      )

      yield put(A.fetchWithdrawalFeesSuccess(withdrawalFees))
    } catch (e) {
      const error = errorHandler(e)
      yield put(A.fetchWithdrawalFeesFailure(error))
    }
  }

  const fetchLocks = function* () {
    yield put(A.fetchWithdrawalLocksLoading())
    try {
      const withdrawalFees: ReturnType<typeof api.getWithdrawalLocks> = yield call(
        api.getWithdrawalLocks
      )

      yield put(A.fetchWithdrawalLocksSuccess(withdrawalFees))
    } catch (e) {
      const error = errorHandler(e)
      yield put(A.fetchWithdrawalLocksFailure(error))
    }
  }

  // const fetchTransactionDetails = function* (action: ReturnType<typeof A.fetchTransactionDetails>) {
  //   // TODO: handle different transaction types and endpoints
  //   switch (action.payload.product) {
  //     case 'SIMPLEBUY':
  //       try {
  //         yield put(A.fetchTransactionDetailsLoading())
  //         const res: ReturnType<typeof api.getPaymentById> = yield call(
  //           api.getPaymentById,
  //           action.payload.id
  //         )
  //         yield put(A.fetchTransactionDetailsSuccess(res))
  //       } catch (e) {
  //         const error = errorHandler(e)
  //         yield put(A.fetchTransactionDetailsFailure(error))
  //       }
  //       break
  //     default:
  //       yield put(A.fetchTransactionDetailsFailure('Product not supported'))
  //   }
  // }

  const submitTransaction = function* () {
    try {
      yield put(A.setStep({ step: SendCryptoStepType.STATUS }))
      yield put(A.submitTransactionLoading())
      const formValues = selectors.form.getFormValues(SEND_FORM)(yield select()) as SendFormType
      const { amount, selectedAccount, to } = formValues
      const { coin } = selectedAccount
      const feesR = S.getWithdrawalFees(yield select(), selectedAccount.coin)
      const fee = feesR.getOrElse(undefined)

      const finalAmt = convertCoinToCoin({ baseToStandard: false, coin, value: amount })
      const finalFee = convertCoinToCoin({ baseToStandard: false, coin, value: fee || 0 })

      const response: ReturnType<typeof api.withdrawSBFunds> = yield call(
        api.withdrawSBFunds,
        to,
        coin,
        finalAmt,
        Number(finalFee)
      )

      yield put(A.submitTransactionSuccess(response))
    } catch (e) {
      const error = errorHandler(e)
      yield put(A.submitTransactionFailure(error))
    }
  }

  return {
    fetchFees,
    fetchLocks,
    // fetchTransactionDetails,
    submitTransaction
  }
}
