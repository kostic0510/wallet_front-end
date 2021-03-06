import { takeEvery, takeLatest } from 'redux-saga/effects'

import * as AT from './actionTypes'
import sagas from './sagas'

export default ({ api, networks }) => {
  const dataXlmSagas = sagas({ api, networks })

  return function* coreDataXlmSaga() {
    yield takeLatest(AT.FETCH_LEDGER_DETAILS, dataXlmSagas.fetchLedgerDetails)
    yield takeLatest(AT.FETCH_DATA, dataXlmSagas.fetchData)
    yield takeEvery(AT.FETCH_TRANSACTIONS, dataXlmSagas.fetchTransactions)
    yield takeLatest(AT.FETCH_TRANSACTION_HISTORY, dataXlmSagas.fetchTransactionHistory)
  }
}
