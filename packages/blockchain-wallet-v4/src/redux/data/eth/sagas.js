import * as A from './actions'
import * as AT from './actionTypes'
import * as Exchange from '../../../exchange'
import * as kvStoreSelectors from '../../kvStore/eth/selectors'
import * as S from './selectors'
import * as selectors from '../../selectors'
import * as transactions from '../../../transactions'
import {
  addIndex,
  concat,
  dissoc,
  equals,
  filter,
  head,
  isNil,
  join,
  last,
  length,
  map,
  mapObjIndexed,
  nth,
  path,
  pluck,
  prop,
  sum,
  takeLast,
  toUpper,
  values
} from 'ramda'
import { call, put, select, take } from 'redux-saga/effects'
import { getLockboxEthContext } from '../../kvStore/lockbox/selectors'
import BigNumber from 'bignumber.js'
import moment from 'moment'

const { calculateEthTxFee, transformTx, transformErc20Tx } = transactions.eth
const TX_PER_PAGE = 40
const TX_REPORT_PAGE_SIZE = 500 // TODO: lesson once pagination is working on backend
const CONTEXT_FAILURE = 'Could not get ETH context.'

export default ({ api }) => {
  //
  // ETH
  //
  const fetchData = function * () {
    try {
      yield put(A.fetchDataLoading())
      const context = yield select(S.getContext)
      const data = yield call(api.getEthData, context)
      const latestBlock = yield call(api.getEthLatestBlock)
      // account treatments
      const finalBalance = sum(values(data).map(obj => obj.balance))
      const totalReceived = sum(values(data).map(obj => obj.totalReceived))
      const totalSent = sum(values(data).map(obj => obj.totalSent))
      const nTx = sum(values(data).map(obj => obj.txn_count))
      const addresses = mapObjIndexed(num => dissoc('txns', num), data)

      const ethData = {
        addresses,
        info: {
          eth: {
            n_tx: nTx,
            total_received: totalReceived,
            total_sent: totalSent,
            final_balance: finalBalance
          }
        },
        latest_block: latestBlock
      }
      yield put(A.fetchDataSuccess(ethData))
      yield call(checkForLowEthBalance)
    } catch (e) {
      yield put(A.fetchDataFailure(e.message))
    }
  }

  const fetchLatestBlock = function * () {
    try {
      yield put(A.fetchLatestBlockLoading())
      const data = yield call(api.getEthLatestBlock)
      yield put(A.fetchLatestBlockSuccess(data))
    } catch (e) {
      yield put(A.fetchLatestBlockFailure(e.message))
    }
  }

  const fetchRates = function * () {
    try {
      yield put(A.fetchRatesLoading())
      const data = yield call(api.getEthTicker)
      yield put(A.fetchRatesSuccess(data))
    } catch (e) {
      yield put(A.fetchRatesFailure(e.message))
    }
  }

  const watchTransactions = function * () {
    while (true) {
      const action = yield take(AT.FETCH_ETH_TRANSACTIONS)
      yield call(fetchTransactions, action)
    }
  }

  const fetchTransactions = function * (action) {
    try {
      const { payload } = action
      const { address, reset } = payload
      const defaultAccountR = yield select(selectors.kvStore.eth.getContext)
      const ethAddress = address || defaultAccountR.getOrFail(CONTEXT_FAILURE)
      const pages = yield select(S.getTransactions)
      const nextPage = reset ? 0 : length(pages)
      const transactionsAtBound = yield select(S.getTransactionsAtBound)
      if (transactionsAtBound && !reset) return
      yield put(A.fetchTransactionsLoading(reset))
      const data = yield call(api.getEthTransactions, ethAddress, nextPage)
      const txs = path([ethAddress, 'txns'], data)
      if (isNil(txs)) return
      const atBounds = length(txs) < TX_PER_PAGE
      yield put(A.transactionsAtBound(atBounds))
      const page = yield call(__processTxs, txs)
      yield put(A.fetchTransactionsSuccess(page, reset))
    } catch (e) {
      yield put(A.fetchTransactionsFailure(e.message))
    }
  }

  const fetchTransactionHistory = function * (action) {
    const { payload } = action
    const { address, endDate, startDate } = payload
    let currentPage = 0

    try {
      yield put(A.fetchTransactionHistoryLoading())
      const defaultAccountR = yield select(selectors.kvStore.eth.getContext)
      const ethAddress = address || defaultAccountR.getOrFail(CONTEXT_FAILURE)

      // fetch account summary (includes first page of txs)
      const accountSummary = yield call(
        api.getEthAccountSummaryV2,
        ethAddress,
        currentPage,
        TX_REPORT_PAGE_SIZE
      )
      let fullTxList = prop('accountTransactions', accountSummary)
      const txCount = prop('transactionCount', accountSummary)
      currentPage++

      // keep fetching pages until we reach last page or last tx free previous page is before requested start date
      while (
        currentPage <= Math.ceil(txCount / TX_REPORT_PAGE_SIZE) &&
        moment.unix(prop('timestamp', last(fullTxList))).isAfter(startDate)
      ) {
        const txPage = yield call(
          api.getEthTransactionsV2,
          ethAddress,
          currentPage,
          TX_REPORT_PAGE_SIZE
        )
        fullTxList = fullTxList.concat(prop('transactions', txPage))
        currentPage++
      }

      // process txs further for report
      const processedTxList = yield call(
        __processReportTxs,
        fullTxList,
        startDate,
        endDate
      )
      yield put(A.fetchTransactionHistorySuccess(processedTxList))
    } catch (e) {
      yield put(A.fetchTransactionHistoryFailure(e.message))
    }
  }

  const fetchLegacyBalance = function * () {
    try {
      yield put(A.fetchLegacyBalanceLoading())
      const addrR = yield select(kvStoreSelectors.getLegacyAccountAddress)
      const addr = addrR.getOrElse('')
      const balances = yield call(api.getEthBalances, addr)
      const balance = path([addr, 'balance'], balances)
      yield put(A.fetchLegacyBalanceSuccess(balance))
    } catch (e) {
      yield put(A.fetchLegacyBalanceFailure())
    }
  }

  const checkForLowEthBalance = function * () {
    // TODO: ERC20 check for any erc20 balance in future
    const erc20Balance = (yield select(S.getErc20Balance, 'pax')).getOrElse(0)
    const weiBalance = (yield select(S.getBalance)).getOrFail()
    const ethRates = (yield select(S.getRates)).getOrFail()
    const ethBalance = Exchange.convertEthToFiat({
      value: weiBalance,
      fromUnit: 'WEI',
      toCurrency: 'USD',
      rates: ethRates
    }).value
    // less than $1 eth and has PAX, set warning flag to true
    const showWarning = parseInt(ethBalance) < 1 && erc20Balance > 0
    yield put(A.checkLowEthBalanceSuccess(showWarning))
  }

  //
  // ERC20
  //
  const fetchErc20Data = function * (action) {
    const { token } = action.payload
    try {
      yield put(A.fetchErc20DataLoading(token))
      yield put(A.fetchErc20Rates(token))
      const ethAddrs = yield select(S.getContext)
      const contractAddr = (yield select(
        selectors.kvStore.eth.getErc20ContractAddr,
        token
      )).getOrFail()
      const data = yield call(
        api.getErc20AccountSummaryV2,
        head(ethAddrs),
        contractAddr
      )
      // account treatments similar to eth info plus the token account_hash
      const tokenData = {
        account_hash: prop('accountHash', data),
        n_tx: parseInt(prop('transferCount', data)),
        total_received: parseInt(prop('totalReceived', data)),
        total_sent: parseInt(prop('totalSent', data)),
        final_balance: parseInt(prop('balance', data))
      }
      yield put(A.fetchErc20DataSuccess(token, tokenData))
    } catch (e) {
      yield put(A.fetchErc20DataFailure(token, prop('message', e)))
    }
  }

  const fetchErc20Rates = function * (action) {
    const { token } = action.payload
    try {
      yield put(A.fetchErc20RatesLoading(token))
      const data = yield call(api.getErc20Ticker, toUpper(token))
      yield put(A.fetchErc20RatesSuccess(token, data))
    } catch (e) {
      yield put(A.fetchErc20RatesFailure(token, e.message))
    }
  }

  const watchErc20Transactions = function * () {
    while (true) {
      const action = yield take(AT.FETCH_ERC20_TOKEN_TRANSACTIONS)
      yield call(fetchErc20Transactions, action)
    }
  }

  const fetchErc20Transactions = function * (action) {
    const { token, reset } = action.payload
    try {
      const defaultAccountR = yield select(selectors.kvStore.eth.getContext)
      const ethAddress = defaultAccountR.getOrFail(CONTEXT_FAILURE)
      const pages = yield select(S.getErc20Transactions, token)
      const nextPage = reset ? 0 : length(pages)
      const txsAtBound = yield select(S.getErc20TransactionsAtBound, token)
      const contractAddress = (yield select(
        selectors.kvStore.eth.getErc20ContractAddr,
        token
      )).getOrFail()
      if (txsAtBound && !reset) return
      yield put(A.fetchErc20TransactionsLoading(token, ethAddress, reset))
      const data = yield call(
        api.getErc20TransactionsV2,
        ethAddress,
        contractAddress,
        nextPage
      )
      const txs = prop('transfers', data)
      if (isNil(txs)) return
      const atBounds = length(txs) < TX_PER_PAGE
      yield put(A.erc20TransactionsAtBound(token, atBounds))
      const page = yield call(__processErc20Txs, txs, token)
      yield put(A.fetchErc20TransactionsSuccess(token, page, reset))
    } catch (e) {
      yield put(A.fetchErc20TransactionsFailure(token, e.message))
    }
  }

  const fetchErc20TransactionFee = function * (action) {
    const { hash, token } = action.payload
    try {
      yield put(A.fetchErc20TxFeeLoading(hash, token))
      const txData = yield call(api.getEthTransactionV2, hash)
      const fee = calculateEthTxFee(txData)
      yield put(A.fetchErc20TxFeeSuccess(fee, hash, token))
    } catch (e) {
      yield put(A.fetchErc20TxFeeFailure(hash, token, e.message))
    }
  }

  const fetchErc20TransactionHistory = function * (action) {
    const { payload } = action
    const { address, endDate, startDate, token } = payload
    let currentPage = 0

    try {
      yield put(A.fetchErc20TransactionHistoryLoading(token))
      const defaultAccountR = yield select(selectors.kvStore.eth.getContext)
      const ethAddress = address || defaultAccountR.getOrFail(CONTEXT_FAILURE)
      const contractAddress = (yield select(
        selectors.kvStore.eth.getErc20ContractAddr,
        token
      )).getOrFail()

      // fetch account summary without any txs since erc2
      const accountSummary = yield call(
        api.getErc20AccountSummaryV2,
        ethAddress,
        contractAddress,
        currentPage,
        TX_REPORT_PAGE_SIZE
      )
      let fullTxList = prop('transfers', accountSummary)
      const txCount = prop('transferCount', accountSummary)
      currentPage++

      // keep fetching pages until we reach last page or last tx free previous page is before requested start date
      while (
        currentPage <= Math.ceil(txCount / TX_REPORT_PAGE_SIZE) &&
        moment.unix(prop('timestamp', last(fullTxList))).isAfter(startDate)
      ) {
        const txPage = yield call(
          api.getErc20TransactionsV2,
          ethAddress,
          contractAddress,
          currentPage,
          TX_REPORT_PAGE_SIZE
        )
        fullTxList = fullTxList.concat(prop('transfers', txPage))
        currentPage++
      }

      // process txs further for report
      const processedTxList = yield call(
        __processErc20ReportTxs,
        fullTxList,
        startDate,
        endDate,
        token
      )

      yield put(A.fetchErc20TransactionHistorySuccess(processedTxList, token))
    } catch (e) {
      yield put(A.fetchErc20TransactionHistoryFailure(e.message, token))
    }
  }

  //
  // PRIVATE UTILS
  //
  const __processTxs = function * (txs) {
    const accountsR = yield select(kvStoreSelectors.getAccounts)
    const erc20ContractsR = yield select(kvStoreSelectors.getErc20ContractAddrs)
    const addresses = accountsR.getOrElse([]).map(prop('addr'))
    const erc20Contracts = erc20ContractsR.getOrElse([])
    const lockboxContextR = yield select(getLockboxEthContext)
    const lockboxContext = lockboxContextR.getOrElse([])
    const state = yield select()
    const ethAddresses = concat(addresses, lockboxContext)
    return map(transformTx(ethAddresses, erc20Contracts, state), txs)
  }
  const __processErc20Txs = function * (txs, token) {
    const accountsR = yield select(kvStoreSelectors.getAccounts)
    const addresses = accountsR.getOrElse([]).map(prop('addr'))
    const lockboxContextR = yield select(getLockboxEthContext)
    const lockboxContext = lockboxContextR.getOrElse([])
    const state = yield select()
    const ethAddresses = concat(addresses, lockboxContext)
    return map(transformErc20Tx(ethAddresses, state, token), txs)
  }
  const __buildTransactionReportModel = function (
    prunedTxList,
    historicalPrices,
    currentPrices,
    coin
  ) {
    const mapIndexed = addIndex(map)
    const fiatSymbol = prop('symbol', currentPrices)
    const currentPrice = new BigNumber(prop('last', currentPrices))
    return mapIndexed((tx, idx) => {
      const timeFormatted = join(
        ' ',
        takeLast(
          2,
          moment
            .unix(tx.time)
            .toString()
            .split(' ')
        )
      )
      const txType = prop('type', tx)
      const negativeSignOrEmpty = equals('sent', txType) ? '-' : ''
      const priceAtTime = new BigNumber(
        prop('price', nth(idx, historicalPrices))
      )
      const amountBig = new BigNumber(
        coin === 'PAX'
          ? Exchange.convertPaxToPax({
              value: tx.amount,
              fromUnit: 'WEI',
              toUnit: 'PAX'
            }).value
          : Exchange.convertEtherToEther({
              value: tx.amount,
              fromUnit: 'WEI',
              toUnit: 'ETH'
            }).value
      )
      const valueThen = amountBig.multipliedBy(priceAtTime).toFixed(2)
      const valueNow = amountBig.multipliedBy(currentPrice).toFixed(2)
      return {
        amount: `${negativeSignOrEmpty}${amountBig.toString()}`,
        date: moment.unix(prop('time', tx)).format('YYYY-MM-DD'),
        description: prop('description', tx),
        hash: prop('hash', tx),
        time: timeFormatted,
        type: txType,
        value_then: `${fiatSymbol}${negativeSignOrEmpty}${valueThen}`,
        value_now: `${fiatSymbol}${negativeSignOrEmpty}${valueNow}`,
        exchange_rate_then: fiatSymbol + priceAtTime.toFixed(2)
      }
    }, prunedTxList)
  }
  const __processErc20ReportTxs = function * (
    rawTxList,
    startDate,
    endDate,
    token
  ) {
    const fullTxList = yield call(__processErc20Txs, rawTxList)
    const paxMarketData = (yield select(
      selectors.data.eth.getErc20Rates,
      token
    )).getOrFail()

    // remove txs that dont match coin type and are not within date range
    const prunedTxList = filter(
      tx => moment.unix(tx.time).isBetween(startDate, endDate),
      fullTxList
    )

    // return empty list if no tx found in filter set
    if (!length(prunedTxList)) return []
    const txTimestamps = pluck('time', prunedTxList)
    const currency = (yield select(selectors.settings.getCurrency)).getOrElse(
      'USD'
    )

    // fetch historical price data
    const historicalPrices = yield call(
      api.getPriceTimestampSeries,
      toUpper(token),
      currency,
      txTimestamps
    )

    // build and return report model
    return yield call(
      __buildTransactionReportModel,
      prunedTxList,
      historicalPrices,
      prop(currency, paxMarketData),
      toUpper(token)
    )
  }
  const __processReportTxs = function * (rawTxList, startDate, endDate) {
    const fullTxList = yield call(__processTxs, rawTxList)
    const ethMarketData = (yield select(
      selectors.data.eth.getRates
    )).getOrFail()

    // remove txs that dont match coin type and are not within date range
    let prunedTxList = filter(tx => {
      return !tx.erc20 && moment.unix(tx.time).isBetween(startDate, endDate)
    }, fullTxList)

    // return empty list if no tx found in filter set
    if (!length(prunedTxList)) return []
    const txTimestamps = pluck('time', prunedTxList)
    const currency = (yield select(selectors.settings.getCurrency)).getOrElse(
      'USD'
    )

    // fetch historical price data
    const historicalPrices = yield call(
      api.getPriceTimestampSeries,
      'ETH',
      currency,
      txTimestamps
    )

    // build and return report model
    return yield call(
      __buildTransactionReportModel,
      prunedTxList,
      historicalPrices,
      prop(currency, ethMarketData),
      'ETH'
    )
  }

  return {
    checkForLowEthBalance,
    fetchData,
    fetchErc20Data,
    fetchLegacyBalance,
    fetchRates,
    fetchErc20Rates,
    fetchLatestBlock,
    fetchTransactions,
    fetchTransactionHistory,
    fetchErc20Transactions,
    fetchErc20TransactionFee,
    fetchErc20TransactionHistory,
    watchTransactions,
    watchErc20Transactions,
    __processTxs,
    __processErc20Txs
  }
}
