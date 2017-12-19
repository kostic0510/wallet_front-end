
import { call, put, takeLatest } from 'redux-saga/effects'
import { delay } from 'redux-saga'
import * as AT from './actionTypes'
import * as A from './actions'

export default ({ api } = {}) => {
  const fetchRates = function * () {
    try {
      const response = yield call(api.getBitcoinTicker)
      yield call(delay, 2000)
      yield put(A.fetchRatesSuccess(response))
    } catch (e) {
      yield put(A.fetchRatesFailure(e.message))
    }
  }

  return function * () {
    yield takeLatest(AT.FETCH_BITCOIN_RATES, fetchRates)
  }
}
