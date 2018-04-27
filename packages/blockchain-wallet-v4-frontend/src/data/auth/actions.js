import * as AT from './actionTypes'

export const login = (guid, password, code, sharedKey, mobileLogin) => ({ type: AT.LOGIN, payload: { guid, password, code, sharedKey, mobileLogin } })

export const loginLoading = () => ({ type: AT.LOGIN_LOADING })

export const loginSuccess = () => ({ type: AT.LOGIN_SUCCESS })

export const loginFailure = (err) => ({ type: AT.LOGIN_FAILURE, payload: { err } })

export const mobileLogin = (data) => ({ type: AT.MOBILE_LOGIN, payload: { data } })

export const setAuthType = (authType) => ({ type: AT.SET_AUTH_TYPE, payload: { authType } })

export const register = (email, password) => ({ type: AT.REGISTER, payload: { email, password } })

export const registerLoading = () => ({ type: AT.REGISTER_LOADING })

export const registerSuccess = () => ({ type: AT.REGISTER_SUCCESS })

export const registerFailure = () => ({ type: AT.REGISTER_FAILURE })

export const restore = (mnemonic, email, password, network) => ({ type: AT.RESTORE, payload: { mnemonic, email, password, network } })

export const restoreLoading = () => ({ type: AT.RESTORE_LOADING })

export const restoreSuccess = () => ({ type: AT.RESTORE_SUCCESS })

export const restoreFailure = () => ({ type: AT.RESTORE_FAILURE })

export const remindGuid = (email, code, sessionToken) => ({ type: AT.REMIND_GUID, payload: { email, code, sessionToken } })

export const authenticate = () => ({ type: AT.AUTHENTICATE })

export const logout = () => ({ type: AT.LOGOUT })

export const startLogoutTimer = () => ({ type: AT.START_LOGOUT_TIMER })

export const reset2fa = (guid, email, newEmail, secretPhrase, message, code, sessionToken) => ({ type: AT.RESET_2FA, payload: { guid, email, newEmail, secretPhrase, message, code, sessionToken } })

export const reset2faLoading = () => ({ type: AT.RESET_2FA_LOADING })

export const reset2faSuccess = () => ({ type: AT.RESET_2FA_SUCCESS })

export const reset2faFailure = (err) => ({ type: AT.RESET_2FA_FAILURE, payload: { err } })

export const upgradeWallet = () => ({ type: AT.UPGRADE_WALLET, payload: {} })
