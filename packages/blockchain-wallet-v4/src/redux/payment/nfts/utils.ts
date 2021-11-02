import BigNumber from 'bignumber.js'
import BN from 'bn.js'
import { ethers, Signer } from 'ethers'

import {
  Asset,
  ComputedFees,
  ECSignature,
  FeeMethod,
  HowToCall,
  NftAsset,
  NftOrderSide,
  NftOrdersType,
  NftSaleKind,
  PartialReadonlyContractAbi,
  SolidityTypes,
  UnhashedOrder,
  UnsignedOrder,
  WyvernAsset,
  WyvernNFTAsset,
  WyvernSchemaName
} from '@core/network/api/nfts/types'

import { ERC721_ABI, ERC1155_ABI, proxyRegistry_ABI, wyvernExchange_ABI } from './abis'
import { schemaMap } from './schemas'
import { FunctionInputKind } from './types'

type Order = NftOrdersType['orders'][0]

export const INVERSE_BASIS_POINT = 10000
export const NULL_BLOCK_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
const MIN_EXPIRATION_SECONDS = 10
const ORDER_MATCHING_LATENCY_SECONDS = 60 * 60 * 24 * 7
const OPENSEA_FEE_RECIPIENT = '0x5b3256965e7c3cf26e11fcaf296dfc8807c01073'
const MAX_DIGITS_IN_UNSIGNED_256_INT = 72
export const DEFAULT_BUYER_FEE_BASIS_POINTS = 0
export const DEFAULT_SELLER_FEE_BASIS_POINTS = 250
export const OPENSEA_SELLER_BOUNTY_BASIS_POINTS = 100
export const DEFAULT_MAX_BOUNTY = DEFAULT_SELLER_FEE_BASIS_POINTS
export const ENJIN_ADDRESS = '0xfaaFDc07907ff5120a76b34b731b278c38d6043C'
export const ENJIN_COIN_ADDRESS = '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c'

export const bigNumberToBN = (value: BigNumber) => {
  return new BN(value.toString(), 10)
}

const ethABI_local = {
  elementaryName(name) {
    if (name.startsWith('int[')) {
      return `int256${name.slice(3)}`
    }
    if (name === 'int') {
      return 'int256'
    }
    if (name.startsWith('uint[')) {
      return `uint256${name.slice(4)}`
    }
    if (name === 'uint') {
      return 'uint256'
    }
    if (name.startsWith('fixed[')) {
      return `fixed128x128${name.slice(5)}`
    }
    if (name === 'fixed') {
      return 'fixed128x128'
    }
    if (name.startsWith('ufixed[')) {
      return `ufixed128x128${name.slice(6)}`
    }
    if (name === 'ufixed') {
      return 'ufixed128x128'
    }
    return name
  },
  eventID(name, types) {
    // FIXME: use node.js util.format?
    const sig = `${name}(${types.map(this.elementaryName).join(',')})`
    return ethers.utils.keccak256(Buffer.from(sig))
  },
  isDynamic(type) {
    // FIXME: handle all types? I don't think anything is missing now
    return type === 'string' || type === 'bytes' || this.parseTypeArray(type) === 'dynamic'
  },
  methodID(name, types) {
    return this.eventID(name, types).slice(0, 4)
  },
  parseTypeArray(type) {
    const tmp = type.match(/(.*)\[(.*?)\]$/)
    if (tmp) {
      return tmp[2] === '' ? 'dynamic' : parseInt(tmp[2], 10)
    }
    return null
  }
}

/**
 * Computes the default value for a type
 * @param type The ABI type to calculate a default value for
 * @return The default value for that type
 */
const generateDefaultValue = (type: string): string | boolean | number => {
  switch (type) {
    case 'address':
    case 'bytes20':
      /* Null address is sometimes checked in transfer calls. */
      // But we need to use 0x000 because bitwise XOR won't work if there's a 0 in the actual address, since it will be replaced as 1 OR 0 = 1
      return '0x0000000000000000000000000000000000000000'
    case 'bytes32':
      return '0x0000000000000000000000000000000000000000000000000000000000000000'
    case 'bool':
      return false
    case 'int':
    case 'uint':
    case 'uint8':
    case 'uint16':
    case 'uint32':
    case 'uint64':
    case 'uint256':
      return 0
    default:
      throw new Error(`Default value not yet implemented for type: ${type}`)
  }
}

const getOrderHashHex = (order: UnhashedOrder): string => {
  const orderParts = [
    { type: SolidityTypes.Address, value: order.exchange },
    { type: SolidityTypes.Address, value: order.maker },
    { type: SolidityTypes.Address, value: order.taker },
    { type: SolidityTypes.Uint256, value: order.makerRelayerFee.toString() },
    { type: SolidityTypes.Uint256, value: order.takerRelayerFee.toString() },
    { type: SolidityTypes.Uint256, value: order.makerProtocolFee.toString() },
    { type: SolidityTypes.Uint256, value: order.takerProtocolFee.toString() },
    { type: SolidityTypes.Address, value: order.feeRecipient },
    { type: SolidityTypes.Uint8, value: order.feeMethod },
    { type: SolidityTypes.Uint8, value: order.side },
    { type: SolidityTypes.Uint8, value: order.saleKind },
    { type: SolidityTypes.Address, value: order.target },
    { type: SolidityTypes.Uint8, value: order.howToCall },
    { type: SolidityTypes.Bytes, value: new Buffer(order.calldata.slice(2), 'hex') },
    { type: SolidityTypes.Bytes, value: new Buffer(order.replacementPattern.slice(2), 'hex') },
    { type: SolidityTypes.Address, value: order.staticTarget },
    { type: SolidityTypes.Bytes, value: new Buffer(order.staticExtradata.slice(2), 'hex') },
    { type: SolidityTypes.Address, value: order.paymentToken },
    { type: SolidityTypes.Uint256, value: order.basePrice.toString() },
    { type: SolidityTypes.Uint256, value: order.extra.toString() },
    { type: SolidityTypes.Uint256, value: order.listingTime.toString() },
    { type: SolidityTypes.Uint256, value: order.expirationTime.toString() },
    { type: SolidityTypes.Uint256, value: order.salt.toString() }
  ]
  const types = orderParts.map((o) => o.type)
  const values = orderParts.map((o) => o.value)
  const hash = ethers.utils.solidityKeccak256(types, values)
  return hash
}

/**
 * Get the non-prefixed hash for the order
 * (Fixes a Wyvern typescript issue and casing issue)
 * @param order order to hash
 */
export function getOrderHash(order: UnhashedOrder) {
  const orderWithStringTypes = {
    ...order,
    feeMethod: order.feeMethod.toString(),
    feeRecipient: order.feeRecipient.toLowerCase(),
    howToCall: order.howToCall.toString(),
    maker: order.maker.toLowerCase(),
    saleKind: order.saleKind.toString(),
    side: order.side.toString(),
    taker: order.taker.toLowerCase()
  }
  return getOrderHashHex(orderWithStringTypes as any)
}

/**
 * Generates a pseudo-random 256-bit salt.
 * The salt can be included in an 0x order, ensuring that the order generates a unique orderHash
 * and will not collide with other outstanding orders that are identical in all other parameters.
 * @return  A pseudo-random 256-bit number that can be used as a salt.
 */
const generatePseudoRandomSalt = (): string => {
  // BigNumber.random returns a pseudo-random number between 0 & 1 with a passed in number of decimal places.
  // Source: https://mikemcl.github.io/bignumber.js/#random
  const randomNumber = BigNumber.random(MAX_DIGITS_IN_UNSIGNED_256_INT)
  const factor = new BigNumber(10).pow(MAX_DIGITS_IN_UNSIGNED_256_INT - 1)
  const salt = randomNumber.times(factor).integerValue()
  return bigNumberToBN(salt).toString()
}

export const encodeCall = (abi, parameters: any[]): string => {
  const inputTypes = abi.inputs.map((i) => i.type)
  const fragment = ethers.utils.Fragment.from(abi)
  const encoded = `${Buffer.concat([
    Buffer.from(ethers.utils.Interface.getSighash(fragment)),
    Buffer.from(ethers.utils.defaultAbiCoder.encode(inputTypes, parameters).slice(2))
  ])}`

  return encoded
}

/**
 * Encodes the replacementPattern for a supplied ABI and replace kind
 * @param   abi AnnotatedFunctionABI
 * @param   replaceKind Parameter kind to replace
 * @return  The resulting encoded replacementPattern
 */
export const encodeReplacementPattern = (
  abi,
  replaceKind = FunctionInputKind.Replaceable,
  encodeToBytes = true
): string => {
  const output: Buffer[] = []
  const data: Buffer[] = []
  const dynamicOffset = abi.inputs.reduce((len, { type }) => {
    const match = type.match(/\[(.+)\]$/)
    return len + (match ? parseInt(match[1], 10) * 32 : 32)
  }, 0)
  abi.inputs
    .map(({ kind, type, value }) => ({
      bitmask: kind === replaceKind ? 255 : 0,
      type: ethABI_local.elementaryName(type),
      value: value !== undefined ? value : generateDefaultValue(type)
    }))
    .reduce((offset, { bitmask, type, value }) => {
      if (!value) return offset
      // The 0xff bytes in the mask select the replacement bytes. All other bytes are 0x00.
      const cur = Buffer.from(
        ethers.utils.defaultAbiCoder.encode([type], [value]).substring(2),
        'hex'
      ).fill(bitmask)
      if (ethABI_local.isDynamic(type)) {
        if (bitmask) {
          throw new Error('Replacement is not supported for dynamic parameters.')
        }
        output.push(
          Buffer.from(
            ethers.utils.defaultAbiCoder.encode(['uint256'], [dynamicOffset]).substring(2),
            'hex'
          )
        )
        data.push(cur)
        return offset + cur.length
      }
      output.push(cur)
      return offset
    }, dynamicOffset)
  // 4 initial bytes of 0x00 for the method hash.
  const methodIdMask = Buffer.alloc(4)
  const mask = Buffer.concat([methodIdMask, Buffer.concat(output.concat(data))])
  return encodeToBytes ? `0x${mask.toString('hex')}` : mask.map((b) => (b ? 1 : 0)).join('')
}

export const encodeDefaultCall = (abi, address) => {
  const parameters = abi.inputs.map((input) => {
    switch (input.kind) {
      case FunctionInputKind.Replaceable:
        return generateDefaultValue(input.type)
      case FunctionInputKind.Owner:
        return address
      case FunctionInputKind.Asset:
      default:
        return input.value
    }
  })
  return encodeCall(abi, parameters)
}

export const encodeSell = (schema, asset, address) => {
  const wyvAsset = schema.assetFromFields({
    Address: asset.asset_contract.address,
    ID: asset.token_id,
    Name: asset.name,
    Quantity: new BigNumber(1).toString()
  })
  const transfer = schema.functions.transfer(wyvAsset)
  const tokenInterface = new ethers.utils.Interface(ERC1155_ABI)
  const calldata = tokenInterface.encodeFunctionData('safeTransferFrom', [
    address.toLowerCase(),
    NULL_ADDRESS,
    asset.token_id,
    wyvAsset.quantity,
    []
  ])
  return {
    calldata,
    replacementPattern: encodeReplacementPattern(transfer),
    target: transfer.target
  }
}

export const encodeBuy = (schema, asset, address) => {
  const transfer = schema.functions.transfer(asset)
  const replaceables = transfer.inputs.filter((i: any) => i.kind === FunctionInputKind.Replaceable)
  const ownerInputs = transfer.inputs.filter((i: any) => i.kind === FunctionInputKind.Owner)

  // Validate
  if (replaceables.length !== 1) {
    throw new Error(
      `Only 1 input can match transfer destination, but instead ${replaceables.length} did`
    )
  }

  // Compute calldata
  const parameters = transfer.inputs.map((input: any) => {
    switch (input.kind) {
      case FunctionInputKind.Replaceable:
        return address
      case FunctionInputKind.Owner:
        return generateDefaultValue(input.type)
      default:
        try {
          return input.value.toString()
        } catch (e) {
          console.error(schema)
          console.error(asset)
          throw e
        }
    }
  })
  const calldata = encodeCall(transfer, parameters)

  // Compute replacement pattern
  let replacementPattern = '0x'
  if (ownerInputs.length > 0) {
    replacementPattern = encodeReplacementPattern(transfer, FunctionInputKind.Owner)
  }

  return {
    calldata,
    replacementPattern,
    target: transfer.target
  }
}

function _getTimeParameters(
  expirationTimestamp: number,
  listingTimestamp?: number,
  waitingForBestCounterOrder = false
) {
  // Validation
  const minExpirationTimestamp = Math.round(Date.now() / 1000 + MIN_EXPIRATION_SECONDS)
  const minListingTimestamp = Math.round(Date.now() / 1000)
  if (expirationTimestamp !== 0 && expirationTimestamp < minExpirationTimestamp) {
    throw new Error(
      `Expiration time must be at least ${MIN_EXPIRATION_SECONDS} seconds from now, or zero (non-expiring).`
    )
  }
  if (listingTimestamp && listingTimestamp < minListingTimestamp) {
    throw new Error('Listing time cannot be in the past.')
  }
  if (listingTimestamp && expirationTimestamp !== 0 && listingTimestamp >= expirationTimestamp) {
    throw new Error('Listing time must be before the expiration time.')
  }
  if (waitingForBestCounterOrder && expirationTimestamp === 0) {
    throw new Error('English auctions must have an expiration time.')
  }
  if (waitingForBestCounterOrder && listingTimestamp) {
    throw new Error(`Cannot schedule an English auction for the future.`)
  }
  if (parseInt(expirationTimestamp.toString()) !== expirationTimestamp) {
    throw new Error(`Expiration timestamp must be a whole number of seconds`)
  }

  if (waitingForBestCounterOrder) {
    listingTimestamp = expirationTimestamp
    // Expire one week from now, to ensure server can match it
    // Later, this will expire closer to the listingTime
    expirationTimestamp += ORDER_MATCHING_LATENCY_SECONDS
  } else {
    // Small offset to account for latency
    listingTimestamp = listingTimestamp || Math.round(Date.now() / 1000 - 100)
  }

  return {
    expirationTime: new BigNumber(expirationTimestamp),
    listingTime: new BigNumber(listingTimestamp)
  }
}

// function _getSchema(schemaName?: WyvernSchemaName): Schema<any> {
//   const schemaName_ = schemaName || WyvernSchemaName.ERC721
//   const schema = WyvernSchemas.schemas[this._networkName].filter((s) => s.name == schemaName_)[0]

//   if (!schema) {
//     throw new Error(
//       `Trading for this asset (${schemaName_}) is not yet supported. Please contact us or check back later!`
//     )
//   }
//   return schema
// }

function toBaseUnitAmount(amount: BigNumber, decimals: number): BigNumber {
  const unit = new BigNumber(10).pow(decimals)
  const baseUnitAmount = amount.times(unit)
  const hasDecimals = baseUnitAmount.decimalPlaces() !== 0
  if (hasDecimals) {
    throw new Error(`Invalid unit amount: ${amount.toString()} - Too many decimal places`)
  }
  return baseUnitAmount
}

function makeBigNumber(arg: number | string | BigNumber): BigNumber {
  // Zero sometimes returned as 0x from contracts
  if (arg === '0x') {
    arg = 0
  }
  // fix "new BigNumber() number type has more than 15 significant digits"
  arg = arg.toString()
  return new BigNumber(arg)
}

export function assignOrdersToSides(
  order: Order,
  matchingOrder: UnsignedOrder
): { buy: Order; sell: Order } {
  const isSellOrder = order.side === NftOrderSide.Sell

  let buy: Order
  let sell: Order
  if (!isSellOrder) {
    buy = order
    sell = {
      ...matchingOrder,
      r: buy.r,
      s: buy.s,
      v: buy.v
    }
  } else {
    sell = order
    buy = {
      ...matchingOrder,
      r: sell.r,
      s: sell.s,
      v: sell.v
    }
  }

  return { buy, sell }
}

export function _getMetadata(order: Order, referrerAddress?: string) {
  const referrer = referrerAddress || order.metadata.referrerAddress
  if (referrer) {
    return referrer
  }
  return undefined
}

/**
 * To-DO make it work with the dynamic price setting from the on-chain data. Currently hard-coded. Currently doesn't work with Enjin assets
 * Get current transfer fees for an asset
 * @param web3 Web3 instance
 * @param asset The asset to check for transfer fees
 */
async function getTransferFeeSettings(
  // web3: Web3,
  {
    accountAddress,
    asset
  }: {
    accountAddress?: string
    asset: Asset
  }
) {
  let transferFee: BigNumber | undefined
  let transferFeeTokenAddress: string | undefined

  // if (asset.tokenAddress.toLowerCase() == ENJIN_ADDRESS.toLowerCase()) {
  //   // Enjin asset
  //   const feeContract = web3.eth.contract(ERC1155 as any).at(asset.tokenAddress)

  //   const params = await promisifyCall<any[]>((c) =>
  //     feeContract.transferSettings(asset.tokenId, { from: accountAddress }, c)
  //   )
  //   if (params) {
  //     transferFee = makeBigNumber(params[3])
  //     if (params[2] == 0) {
  //       transferFeeTokenAddress = ENJIN_COIN_ADDRESS
  //     }
  //   }
  // }
  return { transferFee, transferFeeTokenAddress }
}

/**
 * Compute the `basePrice` and `extra` parameters to be used to price an order.
 * Also validates the expiration time and auction type.
 * @param tokenAddress Address of the ERC-20 token to use for trading.
 * Use the null address for ETH
 * @param expirationTime When the auction expires, or 0 if never.
 * @param startAmount The base value for the order, in the token's main units (e.g. ETH instead of wei)
 * @param endAmount The end value for the order, in the token's main units (e.g. ETH instead of wei). If unspecified, the order's `extra` attribute will be 0
 */
// async function _getPriceParameters(
//   orderSide: NftOrderSide,
//   tokenAddress: string,
//   expirationTime: number,
//   startAmount: number,
//   endAmount?: number,
//   waitingForBestCounterOrder = false,
//   englishAuctionReservePrice?: number
// ) {
//   const priceDiff = endAmount != null ? startAmount - endAmount : 0
//   const paymentToken = tokenAddress.toLowerCase()
//   const isEther = tokenAddress == NULL_ADDRESS
//   const { tokens } = await this.api.getPaymentTokens({ address: paymentToken })
//   const token = tokens[0]

//   // Validation
//   if (Number.isNaN(startAmount) || startAmount == null || startAmount < 0) {
//     throw new Error(`Starting price must be a number >= 0`)
//   }
//   if (!isEther && !token) {
//     throw new Error(`No ERC-20 token found for '${paymentToken}'`)
//   }
//   if (isEther && waitingForBestCounterOrder) {
//     throw new Error(`English auctions must use wrapped ETH or an ERC-20 token.`)
//   }
//   if (isEther && orderSide === NftOrderSide.Buy) {
//     throw new Error(`Offers must use wrapped ETH or an ERC-20 token.`)
//   }
//   if (priceDiff < 0) {
//     throw new Error('End price must be less than or equal to the start price.')
//   }
//   if (priceDiff > 0 && expirationTime == 0) {
//     throw new Error('Expiration time must be set if order will change in price.')
//   }
//   if (englishAuctionReservePrice && !waitingForBestCounterOrder) {
//     throw new Error('Reserve prices may only be set on English auctions.')
//   }
//   if (englishAuctionReservePrice && englishAuctionReservePrice < startAmount) {
//     throw new Error('Reserve price must be greater than or equal to the start amount.')
//   }

//   // Note: WyvernProtocol.toBaseUnitAmount(makeBigNumber(startAmount), token.decimals)
//   // will fail if too many decimal places, so special-case ether
//   const basePrice = isEther
//     ? makeBigNumber(this.web3.toWei(startAmount, 'ether')).round()
//     : WyvernProtocol.toBaseUnitAmount(makeBigNumber(startAmount), token.decimals)

//   const extra = isEther
//     ? makeBigNumber(this.web3.toWei(priceDiff, 'ether')).round()
//     : WyvernProtocol.toBaseUnitAmount(makeBigNumber(priceDiff), token.decimals)

//   const reservePrice = englishAuctionReservePrice
//     ? isEther
//       ? makeBigNumber(this.web3.toWei(englishAuctionReservePrice, 'ether')).round()
//       : WyvernProtocol.toBaseUnitAmount(makeBigNumber(englishAuctionReservePrice), token.decimals)
//     : undefined

//   return { basePrice, extra, paymentToken, reservePrice }
// }

export function _makeMatchingOrder({
  accountAddress,
  order,
  recipientAddress
}: {
  // UnsignedOrder;
  accountAddress: string
  order: Order
  recipientAddress: string
}): UnsignedOrder {
  accountAddress = ethers.utils.getAddress(accountAddress)
  recipientAddress = ethers.utils.getAddress(recipientAddress)

  const computeOrderParams = () => {
    if ('asset' in order.metadata) {
      // const schema = this._getSchema(order.metadata.schema)
      const schema = schemaMap[order.metadata.schema]
      return order.side === NftOrderSide.Buy
        ? encodeSell(schema, order.metadata.asset, recipientAddress)
        : encodeBuy(schema, order.metadata.asset, recipientAddress)
    }
    // BUNDLE NOT SUPPORTED
    // if ('bundle' in order.metadata) {
    //   // We're matching a bundle order
    //   const { bundle } = order.metadata
    //   const orderedSchemas = bundle.schemas
    //     ? bundle.schemas.map((schemaName) => this._getSchema(schemaName))
    //     : // Backwards compat:
    //       bundle.assets.map(() =>
    //         this._getSchema('schema' in order.metadata ? order.metadata.schema : undefined)
    //       )
    //   const atomicized =
    //     order.side == NftOrderSide.Buy
    //       ? encodeAtomicizedSell(
    //           orderedSchemas,
    //           order.metadata.bundle.assets,
    //           recipientAddress,
    //           this._wyvernProtocol,
    //           this._networkName
    //         )
    //       : encodeAtomicizedBuy(
    //           orderedSchemas,
    //           order.metadata.bundle.assets,
    //           recipientAddress,
    //           this._wyvernProtocol,
    //           this._networkName
    //         )
    //   return {
    //     calldata: atomicized.calldata,
    //     replacementPattern: atomicized.replacementPattern,
    //     target: WyvernProtocol.getAtomicizerContractAddress(this._networkName)
    //   }
    // }
    throw new Error('Invalid order metadata')
  }
  const { calldata, replacementPattern, target } = computeOrderParams() as Exclude<
    ReturnType<typeof computeOrderParams>,
    Error
  >

  const times = _getTimeParameters(0)
  // Compat for matching buy orders that have fee recipient still on them
  const feeRecipient = order.feeRecipient === NULL_ADDRESS ? OPENSEA_FEE_RECIPIENT : NULL_ADDRESS

  const matchingOrder: UnhashedOrder = {
    basePrice: new BigNumber(order.basePrice),
    calldata,
    exchange: order.exchange,
    expirationTime: times.expirationTime,
    extra: new BigNumber(0),
    feeMethod: order.feeMethod,
    feeRecipient,
    howToCall: order.howToCall,
    listingTime: times.listingTime,
    maker: accountAddress,
    makerProtocolFee: new BigNumber(order.makerProtocolFee),
    makerReferrerFee: new BigNumber(order.makerReferrerFee),
    makerRelayerFee: new BigNumber(order.makerRelayerFee),
    metadata: order.metadata,
    paymentToken: order.paymentToken,
    quantity: order.quantity,
    replacementPattern,
    saleKind: NftSaleKind.FixedPrice,
    // @ts-ignore
    salt: generatePseudoRandomSalt(),
    side: (order.side + 1) % 2,
    staticExtradata: '0x',
    staticTarget: NULL_ADDRESS,
    taker: order.maker,
    takerProtocolFee: new BigNumber(order.takerProtocolFee),
    takerRelayerFee: new BigNumber(order.takerRelayerFee),
    target,
    waitingForBestCounterOrder: false
  }

  return {
    ...matchingOrder,
    hash: getOrderHash(matchingOrder)
  }
}

/**
 * Compute the fees for an order
 * @param param0 __namedParameters
 * @param asset Asset to use for fees. May be blank ONLY for multi-collection bundles.
 * @param side The side of the order (buy or sell)
 * @param accountAddress The account to check fees for (useful if fees differ by account, like transfer fees)
 * @param extraBountyBasisPoints The basis points to add for the bounty. Will throw if it exceeds the assets' contract's OpenSea fee.
 */
async function computeFees({
  asset,
  extraBountyBasisPoints = 0,
  side
}: {
  asset?: NftAsset
  extraBountyBasisPoints?: number
  side: NftOrderSide
}): Promise<ComputedFees> {
  let openseaBuyerFeeBasisPoints = DEFAULT_BUYER_FEE_BASIS_POINTS
  let openseaSellerFeeBasisPoints = DEFAULT_SELLER_FEE_BASIS_POINTS
  let devBuyerFeeBasisPoints = 0
  let devSellerFeeBasisPoints = 0
  let transferFee = makeBigNumber(0)
  let transferFeeTokenAddress = null
  let maxTotalBountyBPS = DEFAULT_MAX_BOUNTY

  if (asset) {
    openseaBuyerFeeBasisPoints = +asset.asset_contract.opensea_buyer_fee_basis_points
    openseaSellerFeeBasisPoints = +asset.asset_contract.opensea_seller_fee_basis_points
    devBuyerFeeBasisPoints = +asset.asset_contract.dev_buyer_fee_basis_points
    devSellerFeeBasisPoints = +asset.asset_contract.dev_seller_fee_basis_points

    maxTotalBountyBPS = openseaSellerFeeBasisPoints
  }

  // Compute transferFrom fees
  if (side === NftOrderSide.Sell && asset) {
    // Server-side knowledge
    transferFee = asset.transfer_fee ? makeBigNumber(asset.transfer_fee) : transferFee
    transferFeeTokenAddress = asset.transfer_fee_payment_token
      ? asset.transfer_fee_payment_token
      : transferFeeTokenAddress
  }

  // Compute bounty
  const sellerBountyBasisPoints = side === NftOrderSide.Sell ? extraBountyBasisPoints : 0

  // Check that bounty is in range of the opensea fee
  const bountyTooLarge =
    sellerBountyBasisPoints + OPENSEA_SELLER_BOUNTY_BASIS_POINTS > maxTotalBountyBPS
  if (sellerBountyBasisPoints > 0 && bountyTooLarge) {
    let errorMessage = `Total bounty exceeds the maximum for this asset type (${
      maxTotalBountyBPS / 100
    }%).`
    if (maxTotalBountyBPS >= OPENSEA_SELLER_BOUNTY_BASIS_POINTS) {
      errorMessage += ` Remember that OpenSea will add ${
        OPENSEA_SELLER_BOUNTY_BASIS_POINTS / 100
      }% for referrers with OpenSea accounts!`
    }
    throw new Error(errorMessage)
  }

  return {
    devBuyerFeeBasisPoints,
    devSellerFeeBasisPoints,
    openseaBuyerFeeBasisPoints,
    openseaSellerFeeBasisPoints,
    sellerBountyBasisPoints,
    totalBuyerFeeBasisPoints: openseaBuyerFeeBasisPoints + devBuyerFeeBasisPoints,
    totalSellerFeeBasisPoints: openseaSellerFeeBasisPoints + devSellerFeeBasisPoints,
    transferFee,
    transferFeeTokenAddress
  }
}

/**
 * Compute the `basePrice` and `extra` parameters to be used to price an order.
 * Also validates the expiration time and auction type.
 * @param tokenAddress Address of the ERC-20 token to use for trading.
 * Use the null address for ETH
 * @param expirationTime When the auction expires, or 0 if never.
 * @param startAmount The base value for the order, in the token's main units (e.g. ETH instead of wei)
 * @param endAmount The end value for the order, in the token's main units (e.g. ETH instead of wei). If unspecified, the order's `extra` attribute will be 0
 */
async function _getPriceParameters(
  orderSide: NftOrderSide,
  tokenAddress: string,
  expirationTime: number,
  startAmount: number,
  endAmount?: number,
  waitingForBestCounterOrder = false,
  englishAuctionReservePrice?: number
) {
  const priceDiff = endAmount != null ? startAmount - endAmount : 0
  const paymentToken = tokenAddress.toLowerCase()
  const isEther = tokenAddress === NULL_ADDRESS
  // const { tokens } = await this.api.getPaymentTokens({ address: paymentToken })
  // const token = tokens[0]

  // Validation
  if (Number.isNaN(startAmount) || startAmount == null || startAmount < 0) {
    throw new Error(`Starting price must be a number >= 0`)
  }
  // if (!isEther && !token) {
  //   throw new Error(`No ERC-20 token found for '${paymentToken}'`)
  // }
  if (isEther && waitingForBestCounterOrder) {
    throw new Error(`English auctions must use wrapped ETH or an ERC-20 token.`)
  }
  if (isEther && orderSide === NftOrderSide.Buy) {
    throw new Error(`Offers must use wrapped ETH or an ERC-20 token.`)
  }
  if (priceDiff < 0) {
    throw new Error('End price must be less than or equal to the start price.')
  }
  if (priceDiff > 0 && expirationTime === 0) {
    throw new Error('Expiration time must be set if order will change in price.')
  }
  if (englishAuctionReservePrice && !waitingForBestCounterOrder) {
    throw new Error('Reserve prices may only be set on English auctions.')
  }
  if (englishAuctionReservePrice && englishAuctionReservePrice < startAmount) {
    throw new Error('Reserve price must be greater than or equal to the start amount.')
  }

  // to-do: implement all of the below values for other types of tokens (as commented out)
  // Note: WyvernProtocol.toBaseUnitAmount(makeBigNumber(startAmount), token.decimals)
  // will fail if too many decimal places, so special-case ether
  // const basePrice = isEther
  //   ? (ethers.utils.parseEther(startAmount.toString())
  //   : WyvernProtocol.toBaseUnitAmount(makeBigNumber(startAmount), token.decimals)

  // const extra = isEther
  //   ? makeBigNumber(this.web3.toWei(priceDiff, 'ether')).round()
  //   : WyvernProtocol.toBaseUnitAmount(makeBigNumber(priceDiff), token.decimals)

  // const reservePrice = englishAuctionReservePrice
  //   ? isEther
  //     ? makeBigNumber(this.web3.toWei(englishAuctionReservePrice, 'ether')).round()
  //     : WyvernProtocol.toBaseUnitAmount(makeBigNumber(englishAuctionReservePrice), token.decimals)
  //   : undefined
  const basePrice = ethers.utils.parseEther(startAmount.toString())
  const extra = ethers.utils.parseEther(priceDiff.toString())
  const reservePrice = englishAuctionReservePrice
    ? ethers.utils.parseEther(englishAuctionReservePrice.toString())
    : undefined
  return { basePrice, extra, paymentToken, reservePrice }
}

/**
 * Checks whether a given address contains any code
 * @param web3 Web3 instance
 * @param address input address
 */
export async function isContractAddress(address: string): Promise<boolean> {
  const provider = ethers.getDefaultProvider()
  const code = await provider.getCode(address)
  return code !== '0x'
}

/**
 * Instead of signing an off-chain order, you can approve an order
 * with on on-chain transaction using this method
 * @param order Order to approve
 * @returns Transaction hash of the approval transaction
 */
async function _approveOrder(order: UnsignedOrder, signer: Signer) {
  const accountAddress = order.maker
  const includeInOrderBook = true
  const wyvernExchangeContract = new ethers.Contract(order.exchange, wyvernExchange_ABI, signer)

  const transactionHash = await wyvernExchangeContract.approveOrder_(
    [
      order.exchange,
      order.maker,
      order.taker,
      order.feeRecipient,
      order.target,
      order.staticTarget,
      order.paymentToken
    ],
    [
      order.makerRelayerFee,
      order.takerRelayerFee,
      order.makerProtocolFee,
      order.takerProtocolFee,
      order.basePrice,
      order.extra,
      order.listingTime,
      order.expirationTime,
      order.salt
    ],
    order.feeMethod,
    order.side,
    order.saleKind,
    order.howToCall,
    order.calldata,
    order.replacementPattern,
    order.staticExtradata,
    includeInOrderBook,
    { from: accountAddress }
  )
  console.log(`sending approval transaction`)
  const receipt = await transactionHash.wait()
  console.log(receipt)
  return transactionHash
}

export async function _authorizeOrder(
  order: UnsignedOrder,
  signer: Signer
): Promise<ECSignature | null> {
  const message = order.hash
  const signerAddress = order.maker
  const makerIsSmartContract = await isContractAddress(signerAddress)

  try {
    if (makerIsSmartContract) {
      // The web3 provider is probably a smart contract wallet.
      // Fallback to on-chain approval.
      await _approveOrder(order, signer)
      return null
    }
    const signatureDataHex = await signer.signMessage(message)
    const { r, s, v } = ethers.utils.splitSignature(signatureDataHex)
    return { r, s, v }
  } catch (error) {
    console.error('failed to create signature')
    throw error
  }
}

function _getSellFeeParameters(
  totalBuyerFeeBasisPoints: number,
  totalSellerFeeBasisPoints: number,
  waitForHighestBid: boolean,
  sellerBountyBasisPoints = 0
) {
  // to-do:reimplement this validation
  // _validateFees(totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints)
  // Use buyer as the maker when it's an English auction, so Wyvern sets prices correctly
  const feeRecipient = waitForHighestBid ? NULL_ADDRESS : OPENSEA_FEE_RECIPIENT

  // Swap maker/taker fees when it's an English auction,
  // since these sell orders are takers not makers
  const makerRelayerFee = waitForHighestBid
    ? makeBigNumber(totalBuyerFeeBasisPoints)
    : makeBigNumber(totalSellerFeeBasisPoints)
  const takerRelayerFee = waitForHighestBid
    ? makeBigNumber(totalSellerFeeBasisPoints)
    : makeBigNumber(totalBuyerFeeBasisPoints)

  return {
    feeMethod: FeeMethod.SplitFee,
    feeRecipient,
    makerProtocolFee: makeBigNumber(0),
    makerReferrerFee: makeBigNumber(sellerBountyBasisPoints),
    makerRelayerFee,
    takerProtocolFee: makeBigNumber(0),
    takerRelayerFee
  }
}

// Creating the most basic sell order structure (selling for fixed price, ETH as payment currency, no time limit on order)
export async function _makeSellOrder({
  accountAddress,
  asset,
  buyerAddress,
  endAmount,
  englishAuctionReservePrice = 0,
  expirationTime,
  extraBountyBasisPoints = 0,
  listingTime,
  paymentTokenAddress,
  quantity,
  startAmount,
  waitForHighestBid
}: {
  accountAddress: string
  asset: NftAsset
  buyerAddress: string
  endAmount?: number
  englishAuctionReservePrice?: number
  expirationTime: number
  extraBountyBasisPoints: number
  listingTime?: number
  paymentTokenAddress: string
  quantity: number
  startAmount: number
  waitForHighestBid: boolean
}): Promise<UnhashedOrder> {
  // todo: re-implement this later:
  // accountAddress = validateAndFormatWalletAddress(this.web3, accountAddress)
  // const schema = _getSchema(asset.schemaName)
  // const quantityBN = toBaseUnitAmount(makeBigNumber(quantity), asset.decimals || 0)
  // const { sellerBountyBasisPoints, totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints } =
  //   await computeFees({ asset, extraBountyBasisPoints, side: NftOrderSide.Sell })
  // Temporary hard-coded test values
  const { sellerBountyBasisPoints, totalBuyerFeeBasisPoints, totalSellerFeeBasisPoints } =
    await computeFees({
      asset,
      extraBountyBasisPoints,
      side: NftOrderSide.Sell
    })

  const schema = await schemaMap[asset.asset_contract.schema_name ?? WyvernSchemaName.ERC721]
  // const wyAsset = getWyvernAsset(schema, asset)
  const { calldata, replacementPattern, target } = encodeSell(schema, asset, accountAddress)
  const orderSaleKind =
    endAmount != null && endAmount !== startAmount
      ? NftSaleKind.DutchAuction
      : NftSaleKind.FixedPrice
  const { basePrice, extra, paymentToken, reservePrice } = await _getPriceParameters(
    NftOrderSide.Sell,
    paymentTokenAddress,
    expirationTime,
    startAmount,
    endAmount,
    waitForHighestBid,
    englishAuctionReservePrice
  )
  const times = _getTimeParameters(0, Math.round(Date.now() / 1000))
  const {
    feeMethod,
    feeRecipient,
    makerProtocolFee,
    makerReferrerFee,
    makerRelayerFee,
    takerProtocolFee,
    takerRelayerFee
  } = _getSellFeeParameters(
    totalBuyerFeeBasisPoints,
    totalSellerFeeBasisPoints,
    waitForHighestBid,
    sellerBountyBasisPoints
  )
  // to-do implement the dyanmic configuration of these values:
  const staticTarget = NULL_ADDRESS
  const staticExtradata = '0x'
  if (!asset.asset_contract) {
    throw new Error('contract address not defined within asset')
  }
  return {
    basePrice: new BigNumber(basePrice.toString()),
    calldata,
    englishAuctionReservePrice: reservePrice ? new BigNumber(reservePrice.toString()) : undefined,
    exchange: '0x7Be8076f4EA4A4AD08075C2508e481d6C946D12b',
    expirationTime: times.expirationTime,
    extra: new BigNumber(extra.toString()),
    feeMethod,
    feeRecipient,
    howToCall: HowToCall.Call,
    listingTime: times.listingTime,
    maker: accountAddress,
    makerProtocolFee,
    makerReferrerFee,
    makerRelayerFee,
    metadata: {
      asset: {
        address: asset.asset_contract.address.toLowerCase(),
        id: asset.token_id.toLowerCase() || NULL_ADDRESS,
        quantity: new BigNumber(1).toString()
      },
      schema: schema.name as WyvernSchemaName
    },
    paymentToken,
    quantity: new BigNumber(quantity),
    replacementPattern,
    saleKind: orderSaleKind,
    // FIX: Put in a rmakeMaeal salt
    // @ts-ignore
    salt: generatePseudoRandomSalt(),
    side: NftOrderSide.Sell,
    staticExtradata,
    staticTarget,
    taker: buyerAddress,
    takerProtocolFee,
    takerRelayerFee,
    target,
    waitingForBestCounterOrder: waitForHighestBid
  }
}

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

async function _getProxy(signer, retries = 0): Promise<string | null> {
  const wyvernProxyRegistry = new ethers.Contract(
    '0xa5409ec958C83C3f309868babACA7c86DCB077c1',
    proxyRegistry_ABI,
    signer
  )
  let proxyAddress: string | null = await wyvernProxyRegistry.proxies(signer.getAddress())

  if (proxyAddress === '0x') {
    throw new Error(
      "Couldn't retrieve your account from the blockchain - make sure you're on the correct Ethereum network!"
    )
  }

  if (!proxyAddress || proxyAddress === NULL_ADDRESS) {
    if (retries > 0) {
      await delay(1000)
      return _getProxy(signer, retries - 1)
    }
    proxyAddress = null
  }
  return proxyAddress
}

async function _initializeProxy(signer): Promise<string> {
  const accountAddress = await signer.getAddress()
  console.log(`Initializing proxy for account: ${accountAddress}`)

  const wyvernProxyRegistry = new ethers.Contract(
    '0xa5409ec958C83C3f309868babACA7c86DCB077c1',
    proxyRegistry_ABI,
    signer
  )
  const gasPrice = await signer.getGasPrice()
  const gasLimit = await wyvernProxyRegistry.estimateGas.registerProxy([])
  const txnData = {
    from: accountAddress,
    gasLimit: parseInt(gasLimit._hex),
    gasPrice: parseInt(gasPrice._hex)
  }

  const transactionHash = await wyvernProxyRegistry.registerProxy([], txnData)
  const receipt = await transactionHash.wait()
  console.log(receipt)
  const proxyAddress = await _getProxy(signer, 10)
  if (!proxyAddress) {
    throw new Error(
      'Failed to initialize your account :( Please restart your wallet/browser and try again!'
    )
  }

  return proxyAddress
}

async function getAssetBalance(
  { accountAddress, asset, signer }: { accountAddress: string; asset: Asset; signer: Signer },
  retries = 1
): Promise<BigNumber> {
  const schema = schemaMap[asset.schemaName ?? WyvernSchemaName.ERC721]
  if (!asset.tokenId) {
    throw new Error('Token ID Required.')
  }
  const wyAsset = {
    address: asset.tokenAddress.toLowerCase(),
    id: asset.tokenId.toLowerCase(),
    quantity: new BigNumber(1).toString()
  }

  if (schema.functions.countOf) {
    // ERC20 or ERC1155 (non-Enjin)
    const erc1155Contract = new ethers.Contract(wyAsset.address, ERC1155_ABI, signer)
    const count = await erc1155Contract.balanceOf(accountAddress, wyAsset.id)
    if (count !== undefined) {
      return new BigNumber(parseInt(count._hex))
    }
  } else if (schema.functions.ownerOf) {
    // ERC721 asset
    // const abi = schema.functions
    const erc721Contract = new ethers.Contract(wyAsset.address, ERC721_ABI, signer)
    const owner = await erc721Contract.ownerOf(wyAsset.id)
    if (owner) {
      return owner.toLowerCase() === accountAddress.toLowerCase()
        ? new BigNumber(1)
        : new BigNumber(0)
    }
  } else {
    // Missing ownership call - skip check to allow listings
    // by default
    throw new Error('Missing ownership schema for this asset type')
  }

  if (retries <= 0) {
    throw new Error('Unable to get current owner from smart contract')
  } else {
    await delay(500)
    // Recursively check owner again
    return getAssetBalance({ accountAddress, asset, signer }, retries - 1)
  }
}

export async function _ownsAssetOnChain({
  accountAddress,
  proxyAddress,
  schemaName,
  signer,
  wyAsset
}: {
  accountAddress: string
  proxyAddress?: string | null
  schemaName: WyvernSchemaName
  signer: Signer
  wyAsset: WyvernAsset
}): Promise<boolean> {
  const asset: Asset = {
    schemaName,
    tokenAddress: wyAsset.address,
    tokenId: wyAsset.id || null
  }

  const minAmount = new BigNumber('quantity' in wyAsset ? wyAsset.quantity : 1)

  const accountBalance = await getAssetBalance({ accountAddress, asset, signer })
  if (accountBalance.isGreaterThanOrEqualTo(minAmount)) {
    return true
  }

  proxyAddress = proxyAddress || (await _getProxy(accountAddress))
  if (proxyAddress) {
    const proxyBalance = await getAssetBalance({ accountAddress: proxyAddress, asset, signer })
    if (proxyBalance.isGreaterThanOrEqualTo(minAmount)) {
      return true
    }
  }

  return false
}

// async function getNonCompliantApprovalAddress(
//   erc721Contract: any,
//   tokenId: string,
//   accountAddress: string
// ): Promise<string | undefined> {
//   const results = await Promise.all([
//     // CRYPTOKITTIES check
//     promisifyCall<string>((c) => erc721Contract.kittyIndexToApproved.call(tokenId, c)),
//     // Etherbots check
//     promisifyCall<string>((c) => erc721Contract.partIndexToApproved.call(tokenId, c))
//   ])

//   return _.compact(results)[0]
// }

/**
 * Approve a non-fungible token for use in trades.
 * Requires an account to be initialized first.
 * Called internally, but exposed for dev flexibility.
 * Checks to see if already approved, first. Then tries different approval methods from best to worst.
 * @param param0 __namedParamters Object
 * @param tokenId Token id to approve, but only used if approve-all isn't
 *  supported by the token contract
 * @param tokenAddress The contract address of the token being approved
 * @param accountAddress The user's wallet address
 * @param proxyAddress Address of the user's proxy contract. If not provided,
 *  will attempt to fetch it from Wyvern.
 * @param tokenAbi ABI of the token's contract. Defaults to a flexible ERC-721
 *  contract.
 * @param skipApproveAllIfTokenAddressIn an optional list of token addresses that, if a token is approve-all type, will skip approval
 * @param schemaName The Wyvern schema name corresponding to the asset type
 * @returns Transaction hash if a new transaction was created, otherwise null
 */
async function approveSemiOrNonFungibleToken({
  tokenId,
  tokenAddress,
  accountAddress,
  proxyAddress,
  tokenAbi = ERC721_ABI,
  schemaName = WyvernSchemaName.ERC721,
  signer,
  skipApproveAllIfTokenAddressIn = new Set()
}: {
  accountAddress: string
  proxyAddress?: string
  schemaName?: WyvernSchemaName
  signer: Signer
  skipApproveAllIfTokenAddressIn?: Set<string>
  tokenAbi?: PartialReadonlyContractAbi
  tokenAddress: string
  tokenId: string
}): Promise<string | null> {
  let txHash
  // const schema = schemaMap[schemaName]
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer)

  if (!proxyAddress) {
    proxyAddress = (await _getProxy(accountAddress)) || undefined
    if (!proxyAddress) {
      throw new Error('Uninitialized account')
    }
  }

  const approvalAllCheck = async () => {
    console.log('Performing approve all check')
    // NOTE:
    // Use this long way of calling so we can check for method existence on a bool-returning method.
    const isApprovedForAll = await tokenContract.isApprovedForAll(accountAddress, proxyAddress)
    console.log(isApprovedForAll)
    return parseInt(isApprovedForAll)
  }
  const isApprovedForAll = await approvalAllCheck()

  if (isApprovedForAll === 1) {
    // Supports ApproveAll
    console.log('Already approved proxy for all tokens')
    return null
  }

  if (isApprovedForAll === 0) {
    // Supports ApproveAll
    //  not approved for all yet

    if (skipApproveAllIfTokenAddressIn.has(tokenAddress)) {
      console.log('Already approving proxy for all tokens in another transaction')
      return null
    }
    skipApproveAllIfTokenAddressIn.add(tokenAddress)

    try {
      txHash = await tokenContract.setApprovalForAll(proxyAddress, true)
      if (txHash === null) {
        throw new Error('Failed sending approval transaction')
      }
      const receipt = await txHash.wait()
      if (receipt.status) {
        console.log(
          `Transaction receipt : https://www.etherscan.io/tx/${receipt.logs[1].transactionHash}\n`
        )
        const approvalCheck = await approvalAllCheck()
        if (approvalCheck !== 1) {
          return null
        }
      }
    } catch (error) {
      console.error(error)
      throw new Error(
        "Couldn't get permission to approve these tokens for trading. Their contract might not be implemented correctly. Please contact the developer!"
      )
    }
  }
  // to-do: implement the logic for ERC721 assets
  // // Does not support ApproveAll (ERC721 v1 or v2)
  // console.log('Contract does not support Approve All')

  // const approvalOneCheck = async () => {
  //   // Note: approvedAddr will be '0x' if not supported
  //   let approvedAddr = await tokenContract.getApproved.call(tokenId)
  //   if (approvedAddr === proxyAddress) {
  //     console.log('Already approved proxy for this token')
  //     return true
  //   }
  //   console.log(`Approve response: ${approvedAddr}`)

  //   // SPECIAL CASING non-compliant contracts
  //   if (!approvedAddr) {
  //     approvedAddr = await getNonCompliantApprovalAddress(contract, tokenId, accountAddress)
  //     if (approvedAddr == proxyAddress) {
  //       this.logger('Already approved proxy for this item')
  //       return true
  //     }
  //     this.logger(`Special-case approve response: ${approvedAddr}`)
  //   }
  //   return false
  // }

  // const isApprovedForOne = await approvalOneCheck()
  // if (isApprovedForOne) {
  //   return null
  // }

  // // Call `approve`

  // try {
  //   this._dispatch(EventType.ApproveAsset, {
  //     accountAddress,
  //     asset: getWyvernAsset(schema, { tokenAddress, tokenId }),
  //     proxyAddress
  //   })

  //   const txHash = await sendRawTransaction(
  //     this.web3,
  //     {
  //       data: contract.approve.getData(proxyAddress, tokenId),
  //       from: accountAddress,
  //       to: contract.address
  //     },
  //     (error) => {
  //       this._dispatch(EventType.TransactionDenied, { accountAddress, error })
  //     }
  //   )

  //   await this._confirmTransaction(
  //     txHash,
  //     EventType.ApproveAsset,
  //     'Approving single token for trading',
  //     approvalOneCheck
  //   )
  //   return txHash
  // } catch (error) {
  //   console.error(error)
  //   throw new Error(
  //     "Couldn't get permission to approve this token for trading. Its contract might not be implemented correctly. Please contact the developer!"
  //   )
  // }
  return txHash
}

async function _approveAll({
  proxyAddress,
  schemaNames,
  signer,
  wyAssets
}: {
  proxyAddress?: string
  schemaNames: WyvernSchemaName[]
  signer: Signer
  wyAssets: WyvernAsset[]
}) {
  proxyAddress = proxyAddress || (await _getProxy(signer)) || undefined
  if (!proxyAddress) {
    proxyAddress = await _initializeProxy(signer)
  }
  const contractsWithApproveAll: Set<string> = new Set()
  const accountAddress = await signer.getAddress()

  return Promise.all(
    wyAssets.map(async (wyAsset, i) => {
      const schemaName = schemaNames[i]
      // Verify that the taker owns the asset
      let isOwner
      try {
        isOwner = await _ownsAssetOnChain({
          accountAddress,
          proxyAddress,
          schemaName,
          signer,
          wyAsset
        })
      } catch (error) {
        // let it through for assets we don't support yet
        isOwner = true
      }
      if (!isOwner) {
        const minAmount = 'quantity' in wyAsset ? wyAsset.quantity : 1
        console.error(
          `Failed on-chain ownership check: ${accountAddress} on ${schemaName}:`,
          wyAsset
        )
        throw new Error(
          `You don't own enough to do that (${minAmount} base units of ${wyAsset.address}${
            wyAsset.id ? ` token ${wyAsset.id}` : ''
          })`
        )
      }
      switch (schemaName) {
        case WyvernSchemaName.ERC721:
        case WyvernSchemaName.ERC1155:
        case WyvernSchemaName.LegacyEnjin:
        case WyvernSchemaName.ENSShortNameAuction:
          // Handle NFTs and SFTs
          const wyNFTAsset = wyAsset as WyvernNFTAsset
          return approveSemiOrNonFungibleToken({
            accountAddress,
            proxyAddress,
            schemaName,
            signer,
            skipApproveAllIfTokenAddressIn: contractsWithApproveAll,
            tokenAddress: wyNFTAsset.address,
            tokenId: wyNFTAsset.id
          })
        // to-do: Implement for fungible tokens
        // case WyvernSchemaName.ERC20:
        //   // Handle FTs
        //   const wyFTAsset = wyAsset as WyvernFTAsset
        //   if (contractsWithApproveAll.has(wyFTAsset.address)) {
        //     // Return null to indicate no tx occurred
        //     return null
        //   }
        //   contractsWithApproveAll.add(wyFTAsset.address)
        //   return await this.approveFungibleToken({
        //     accountAddress,
        //     proxyAddress,
        //     tokenAddress: wyFTAsset.address
        //   })
        // For other assets, including contracts:
        // Send them to the user's proxy
        // if (where != WyvernAssetLocation.Proxy) {
        //   return this.transferOne({
        //     schemaName: schema.name,
        //     asset: wyAsset,
        //     isWyvernAsset: true,
        //     fromAddress: accountAddress,
        //     toAddress: proxy
        //   })
        // }
        // return true
        default:
          throw new Error('Unkown Schema')
      }
    })
  )
}

async function validateOrderParameters({
  order,
  signer
}: {
  order: UnhashedOrder
  signer: Signer
}): Promise<boolean> {
  const wyvernExchangeContract = new ethers.Contract(order.exchange, wyvernExchange_ABI, signer)
  const orderValid = await wyvernExchangeContract.validateOrderParameters_(
    [
      order.exchange,
      order.maker,
      order.taker,
      order.feeRecipient,
      order.target,
      order.staticTarget,
      order.paymentToken
    ],
    [
      order.makerRelayerFee.toNumber(),
      order.takerRelayerFee.toNumber(),
      order.makerProtocolFee.toNumber(),
      order.takerProtocolFee.toNumber(),
      order.basePrice.toString(),
      order.extra.toNumber(),
      order.listingTime.toNumber(),
      order.expirationTime.toNumber(),
      order.salt
    ],
    order.feeMethod,
    order.side,
    order.saleKind,
    order.howToCall,
    order.calldata,
    order.replacementPattern,
    order.staticExtradata
  )
  if (!orderValid) {
    console.error(order)
    throw new Error(`Failed to validate order parameters. Make sure you're on the right network!`)
  }
  return orderValid
}
// to-do: once the order validation is working, make sure the approvals are all working correctly and then finish implementing this function.
export async function _sellOrderValidationAndApprovals({
  order,
  signer
}: {
  order: UnhashedOrder
  signer: Signer
}) {
  const wyAssets =
    'bundle' in order.metadata
      ? order.metadata.bundle.assets
      : order.metadata.asset
      ? [order.metadata.asset]
      : []

  const schemaNames =
    'bundle' in order.metadata && 'schemas' in order.metadata.bundle
      ? order.metadata.bundle.schemas
      : 'schema' in order.metadata
      ? [order.metadata.schema]
      : []

  await _approveAll({ schemaNames, signer, wyAssets })

  // // For fulfilling bids,
  // // need to approve access to fungible token because of the way fees are paid
  // // This can be done at a higher level to show UI
  // if (tokenAddress !== NULL_ADDRESS) {
  //   const minimumAmount = makeBigNumber(order.basePrice)
  //   await this.approveFungibleToken({ accountAddress, minimumAmount, tokenAddress })
  // }

  // to-do: sell parameters validation
  // // Check sell parameters
  return validateOrderParameters({ order, signer })
}
