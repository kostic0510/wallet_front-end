/* eslint-disable @typescript-eslint/no-unused-vars */
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Remote } from '@core'
import {
  CollectionData,
  ExplorerGatewayNftCollectionType,
  GasCalculationOperations,
  GasDataI,
  NftAsset,
  NftAssetsType,
  NftCollection,
  NftOrder,
  NftOrdersType,
  OfferEventsType,
  OpenSeaStatus,
  RawOrder
} from '@core/network/api/nfts/types'
import { calculateGasFees } from '@core/redux/payment/nfts'
import { Await } from '@core/types'

import { NftOrderStepEnum, NftsStateType } from './types'

const initialState: NftsStateType = {
  activeTab: 'explore',
  assets: {
    atBound: false,
    collection: 'all',
    isFailure: false,
    isLoading: false,
    list: [],
    page: 0
  },
  collection: Remote.NotAsked,
  collectionSearch: [],
  collections: Remote.NotAsked,
  marketplace: {
    atBound: false,
    isFailure: false,
    isLoading: true,
    list: [],
    page: 0,
    token_ids_queried: []
  },
  offersMade: {
    atBound: false,
    isFailure: false,
    isLoading: true,
    list: [],
    page: 0
  },
  openSeaAsset: Remote.NotAsked,
  openSeaStatus: Remote.NotAsked,
  orderFlow: {
    asset: Remote.NotAsked,
    fees: Remote.NotAsked,
    isSubmitting: false,
    listingToCancel: null,
    matchingOrder: Remote.NotAsked,
    offerToCancel: null,
    orderToMatch: null,
    step: NftOrderStepEnum.SHOW_ASSET,
    // This is a hack because sometimes opensea sets the owner address
    // to NULL_ADDRESS (if contract is opensea storefront)
    // will be fixed by explorer-gateway eventually
    walletUserIsAssetOwnerHack: false
  }
}

const nftsSlice = createSlice({
  initialState,
  name: 'nfts',
  reducers: {
    acceptOffer: (
      state,
      action: PayloadAction<{ buy: NftOrder; gasData: GasDataI; sell: NftOrder }>
    ) => {},
    cancelListing: (state, action: PayloadAction<{ gasData: GasDataI; order: RawOrder }>) => {},
    cancelOffer: (
      state,
      action: PayloadAction<{ gasData: GasDataI; order: RawOrder | null }>
    ) => {},
    clearAndRefetchAssets: (state) => {},
    clearAndRefetchOffersMade: (state) => {},
    clearAndRefetchOrders: (state) => {},
    createOffer: (
      state,
      action: PayloadAction<{
        amount?: string
        asset: NftAsset
        coin?: string
      }>
    ) => {},
    createOrder: (
      state,
      action: PayloadAction<{ buy: NftOrder; gasData: GasDataI; sell: NftOrder }>
    ) => {},
    createSellOrder: (
      state,
      action: PayloadAction<{
        asset: NftAssetsType[0]
        endPrice: number | null
        expirationTime?: string
        gasData: GasDataI
        listingTime?: string
        paymentTokenAddress: string | undefined
        startPrice: number
        waitForHighestBid: boolean | undefined
      }>
    ) => {},
    createTransfer: (
      state,
      action: PayloadAction<{
        asset: NftAssetsType[0]
        gasData: GasDataI
        to: string
      }>
    ) => {},
    fetchFees: (
      state,
      action: PayloadAction<
        | {
            operation: GasCalculationOperations.AcceptOffer
            order: NftOrder
          }
        | {
            asset: NftAsset
            offer: string
            operation: GasCalculationOperations.CreateOffer
            paymentTokenAddress: string
          }
        | {
            operation: GasCalculationOperations.Buy
            order: NftOrder
            paymentTokenAddress?: string
          }
        | {
            asset: NftAsset
            endPrice?: number
            expirationTime?: string
            listingTime?: string
            operation: GasCalculationOperations.Sell
            paymentTokenAddress?: string
            startPrice: number
            waitForHighestBid?: boolean
          }
        | {
            asset: NftAsset
            operation: GasCalculationOperations.Transfer
            to: string
          }
        | {
            operation: GasCalculationOperations.Cancel
            order: RawOrder
          }
      >
    ) => {},
    fetchFeesFailure: (state, action: PayloadAction<string>) => {
      state.orderFlow.fees = Remote.Failure(action.payload)
    },
    fetchFeesLoading: (state) => {
      state.orderFlow.fees = Remote.Loading
    },
    fetchFeesSuccess: (
      state,
      action: PayloadAction<Await<ReturnType<typeof calculateGasFees>>>
    ) => {
      state.orderFlow.fees = Remote.Success(action.payload)
    },
    fetchMatchingOrder: (state) => {},
    fetchMatchingOrderFailure: (state, action: PayloadAction<string>) => {
      state.orderFlow.matchingOrder = Remote.Failure(action.payload)
    },
    fetchMatchingOrderLoading: (state) => {
      state.orderFlow.matchingOrder = Remote.Loading
    },
    fetchMatchingOrderSuccess: (
      state,
      action: PayloadAction<{ buy: NftOrder; sell: NftOrder }>
    ) => {
      state.orderFlow.matchingOrder = Remote.Success(action.payload)
    },
    fetchNftAssets: () => {},
    fetchNftAssetsFailure: (state, action: PayloadAction<string>) => {
      state.assets.isFailure = true
    },
    fetchNftAssetsLoading: (state) => {
      state.assets.isLoading = true
    },
    fetchNftAssetsSuccess: (state, action: PayloadAction<NftAssetsType>) => {
      state.assets.isFailure = false
      state.assets.isLoading = false
      state.assets.list = [...state.assets.list, ...action.payload]
    },
    fetchNftCollection: (
      state,
      action: PayloadAction<{
        slug: string
      }>
    ) => {},
    fetchNftCollectionFailure: (state, action: PayloadAction<string>) => {
      state.collection = Remote.Failure(action.payload)
    },
    fetchNftCollectionLoading: (state) => {
      state.collection = Remote.Loading
    },
    fetchNftCollectionSuccess: (state, action: PayloadAction<NftCollection>) => {
      state.collection = Remote.Success(action.payload)
    },
    fetchNftCollections: (
      state,
      action: PayloadAction<{
        direction?: 'ASC' | 'DESC'
        sortBy?: keyof ExplorerGatewayNftCollectionType
      }>
    ) => {},
    fetchNftCollectionsFailure: (state, action: PayloadAction<string>) => {
      state.collections = Remote.Failure(action.payload)
    },
    fetchNftCollectionsLoading: (state) => {
      state.collections = Remote.Loading
    },
    fetchNftCollectionsSuccess: (
      state,
      action: PayloadAction<ExplorerGatewayNftCollectionType[]>
    ) => {
      state.collections = Remote.Success(action.payload)
    },
    fetchNftOffersMade: () => {},
    fetchNftOffersMadeFailure: (state, action: PayloadAction<string>) => {
      state.offersMade.isFailure = true
    },
    fetchNftOffersMadeLoading: (state) => {
      state.offersMade.isLoading = true
    },
    fetchNftOffersMadeSuccess: (state, action: PayloadAction<OfferEventsType['asset_events']>) => {
      state.offersMade.isFailure = false
      state.offersMade.isLoading = false
      state.offersMade.list = [...state.offersMade.list, ...action.payload]
    },
    fetchNftOrderAsset: () => {},
    fetchNftOrderAssetFailure: (state, action: PayloadAction<string>) => {
      state.orderFlow.asset = Remote.Failure(action.payload)
    },
    fetchNftOrderAssetLoading: (state) => {
      state.orderFlow.asset = Remote.Loading
    },
    fetchNftOrderAssetSuccess: (state, action: PayloadAction<NftAsset>) => {
      state.orderFlow.asset = Remote.Success(action.payload)
    },
    fetchOpenseaAsset: (
      state,
      action: PayloadAction<{
        address: string
        token_id: string
      }>
    ) => {},
    fetchOpenseaAssetFailure: (state, action: PayloadAction<NftAsset>) => {
      state.openSeaStatus = Remote.Failure(action.payload)
    },
    fetchOpenseaAssetLoading: (state) => {
      state.openSeaStatus = Remote.Loading
    },
    fetchOpenseaAssetSuccess: (state, action: PayloadAction<NftAsset>) => {
      state.openSeaAsset = Remote.Success(action.payload)
    },
    fetchOpenseaStatus: () => {},
    fetchOpenseaStatusFailure: (state, action: PayloadAction<OpenSeaStatus>) => {
      state.openSeaStatus = Remote.Failure(action.payload)
    },
    fetchOpenseaStatusLoading: (state) => {
      state.openSeaStatus = Remote.Loading
    },
    fetchOpenseaStatusSuccess: (state, action: PayloadAction<OpenSeaStatus>) => {
      state.openSeaStatus = Remote.Success(action.payload)
    },
    nftOrderFlowClose: (state) => {
      state.orderFlow.step = NftOrderStepEnum.SHOW_ASSET
      state.orderFlow.walletUserIsAssetOwnerHack = false

      state.orderFlow.isSubmitting = false

      state.orderFlow.offerToCancel = null
      state.orderFlow.listingToCancel = null
      state.orderFlow.orderToMatch = null
      state.orderFlow.matchingOrder = Remote.NotAsked
      state.orderFlow.asset = Remote.NotAsked
      state.orderFlow.fees = Remote.NotAsked
    },
    nftOrderFlowOpen: (
      state,
      action: PayloadAction<
        | {
            asset: NftAsset
            asset_contract_address?: never
            offer: OfferEventsType['asset_events'][0]
            token_id?: never
            walletUserIsAssetOwnerHack: boolean
          }
        | {
            asset: NftAsset
            asset_contract_address?: never
            offer?: never
            token_id?: never
            walletUserIsAssetOwnerHack: boolean
          }
        | {
            asset?: never
            asset_contract_address: string
            offer?: never
            token_id: string
            walletUserIsAssetOwnerHack: boolean
          }
      >
    ) => {
      state.orderFlow.asset = Remote.Loading
      state.orderFlow.step = NftOrderStepEnum.SHOW_ASSET
      state.orderFlow.walletUserIsAssetOwnerHack = action.payload.walletUserIsAssetOwnerHack
    },
    resetNftAssets: (state) => {
      state.assets.atBound = false
      state.assets.page = 0
      state.assets.isLoading = false
      state.assets.list = []
    },
    resetNftFees: (state) => {
      state.orderFlow.fees = Remote.NotAsked
    },
    resetNftOffersMade: (state) => {
      state.offersMade.atBound = false
      state.offersMade.page = 0
      state.offersMade.isFailure = false
      state.offersMade.isLoading = true
      state.offersMade.list = []
    },
    resetNftOrders: (state) => {
      state.marketplace.atBound = false
      state.marketplace.page = 0
      state.marketplace.token_ids_queried = []
      state.marketplace.isFailure = false
      state.marketplace.isLoading = true
      state.marketplace.list = []
    },
    searchNftAssetContract: (
      state,
      action: PayloadAction<{ asset_contract_address?: string; search?: string }>
    ) => {},
    setActiveTab: (state, action: PayloadAction<'explore' | 'my-collection' | 'offers'>) => {
      state.activeTab = action.payload
    },
    setAssetBounds: (state, action: PayloadAction<{ atBound: boolean }>) => {
      state.assets.atBound = action.payload.atBound
    },
    setAssetData: (state, action: PayloadAction<{ collection?: string; page?: number }>) => {
      state.assets.collection = action.payload.collection || 'all'
      state.assets.page = action.payload.page || 0
    },
    setCollectionSearch: (state, action: PayloadAction<ExplorerGatewayNftCollectionType[]>) => {
      state.collectionSearch = action.payload
    },
    setListingToCancel: (state, action: PayloadAction<{ order: RawOrder }>) => {
      state.orderFlow.listingToCancel = action.payload.order
    },
    setMarketplaceBounds: (state, action: PayloadAction<{ atBound: boolean }>) => {
      state.marketplace.atBound = action.payload.atBound
    },
    setMarketplaceData: (
      state,
      action: PayloadAction<{
        atBound?: boolean
        collection?: CollectionData
        page?: number
        token_ids_queried?: string[]
      }>
    ) => {
      state.marketplace.page = action.payload.page || 0
      if (action.payload.atBound) state.marketplace.atBound = action.payload.atBound
      if (action.payload.collection) state.marketplace.collection = action.payload.collection
      if (action.payload.token_ids_queried)
        state.marketplace.token_ids_queried = action.payload.token_ids_queried
    },
    setOfferToCancel: (state, action: PayloadAction<{ offer: RawOrder }>) => {
      state.orderFlow.offerToCancel = action.payload.offer
    },
    setOffersMadeBounds: (state, action: PayloadAction<{ atBound: boolean }>) => {
      state.offersMade.atBound = action.payload.atBound
    },
    setOffersMadeData: (state, action: PayloadAction<{ page?: number }>) => {
      state.offersMade.page = action.payload.page || 0
    },
    setOrderFlowIsSubmitting: (state, action: PayloadAction<boolean>) => {
      state.orderFlow.isSubmitting = action.payload
    },
    setOrderFlowStep: (state, action: PayloadAction<{ step: NftOrderStepEnum }>) => {
      state.orderFlow.step = action.payload.step
    },
    setOrderToMatch: (state, action: PayloadAction<{ order: RawOrder }>) => {
      state.orderFlow.orderToMatch = action.payload.order
    }
  }
})

const { actions } = nftsSlice
const nftsReducer = nftsSlice.reducer
export { actions, nftsReducer }
