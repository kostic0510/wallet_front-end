/* eslint-disable no-param-reassign */
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import Remote from '@core/remote'

import * as T from './types'

const INITIAL_STATE: T.WalletConnectState = {
  sessionDetails: undefined,
  step: Remote.NotAsked,
  uri: ''
}

const walletConnectSlice = createSlice({
  initialState: INITIAL_STATE,
  name: 'walletConnect',
  reducers: {
    addNewDappConnection: (state, action) => {},
    handleSessionCallRequest: (state, action: PayloadAction<T.RequestMessagePayload>) => {},
    handleSessionDisconnect: (state, action) => {},
    handleSessionRequest: (state, action) => {},
    initWalletConnect: (state, action: PayloadAction<T.InitWalletConnectPayload>) => {},
    launchDappConnection: (state, action: PayloadAction<T.ModifyDappConnectionPayload>) => {},
    removeDappConnection: (state, action: PayloadAction<T.ModifyDappConnectionPayload>) => {},
    respondToSessionRequest: (state, action: PayloadAction<T.RespondToSessionRequestPayload>) => {},
    respondToTxSendRequest: (state, action: PayloadAction<T.RespondToTxSendRequestPayload>) => {},
    setSessionDetails: (state, action: PayloadAction<T.SessionDetailsType>) => {
      state.sessionDetails = action.payload
    },
    setStep: (state, action: PayloadAction<T.WalletConnectStepPayload>) => {
      state.step = Remote.Success({
        data: action.payload?.data,
        error: action.payload?.error,
        name: action.payload?.name
      })
    },
    setUri: (state, action: PayloadAction<string>) => {
      state.uri = action.payload
    }
  }
})

const { actions } = walletConnectSlice
const walletConnectReducer = walletConnectSlice.reducer
export { actions, walletConnectReducer }
