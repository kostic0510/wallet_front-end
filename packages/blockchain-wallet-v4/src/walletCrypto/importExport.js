import BigInteger from 'bigi'
import * as Bitcoin from 'bitcoinjs-lib'
import Base58 from 'bs58'
import scrypt from 'scrypt-js'

import * as utils from '../utils'
import * as WalletCrypto from './utils'

const {
  crypto: { hash256 }
} = Bitcoin

export const parseBIP38toECPair = function (base58Encrypted, passphrase, network) {
  import('unorm').then((Unorm) => {
    let hex

    // Unicode NFC normalization
    passphrase = Unorm.nfc(passphrase)

    try {
      hex = Base58.decode(base58Encrypted)
    } catch (e) {
      throw new Error('Invalid Private Key')
    }

    if (hex.length !== 43) {
      throw new Error('Invalid Private Key')
    } else if (hex[0] !== 0x01) {
      throw new Error('Invalid Private Key')
    }

    const expChecksum = hex.slice(-4)
    hex = hex.slice(0, -4)

    let checksum = hash256(hex)

    if (
      checksum[0] !== expChecksum[0] ||
      checksum[1] !== expChecksum[1] ||
      checksum[2] !== expChecksum[2] ||
      checksum[3] !== expChecksum[3]
    ) {
      throw new Error('Invalid Private Key')
    }

    let isCompPoint = false
    let isECMult = false
    let hasLotSeq = false
    if (hex[1] === 0x42) {
      if (hex[2] === 0xe0) {
        isCompPoint = true
      } else if (hex[2] !== 0xc0) {
        throw new Error('Invalid Private Key')
      }
    } else if (hex[1] === 0x43) {
      isECMult = true
      isCompPoint = (hex[2] & 0x20) !== 0
      hasLotSeq = (hex[2] & 0x04) !== 0
      if ((hex[2] & 0x24) !== hex[2]) {
        throw new Error('Invalid Private Key')
      }
    } else {
      throw new Error('Invalid Private Key')
    }
    let decrypted
    const AESopts = { mode: WalletCrypto.AES.ECB, padding: WalletCrypto.NoPadding }

    const verifyHashAndReturn = function () {
      const tmpkey = Bitcoin.ECPair.fromPrivateKey(decrypted, null, {
        compressed: isCompPoint,
        network
      })

      const base58Address = utils.btc.keyPairToAddress(tmpkey)

      checksum = hash256(base58Address)

      if (
        checksum[0] !== hex[3] ||
        checksum[1] !== hex[4] ||
        checksum[2] !== hex[5] ||
        checksum[3] !== hex[6]
      ) {
        throw new Error('wrong_bip38_pass')
      }
      return tmpkey
    }

    if (!isECMult) {
      const addresshash = Buffer.from(hex.slice(3, 7), 'hex')

      const derivedBytes = scrypt(passphrase, addresshash, 16384, 8, 8, 64)
      var k = derivedBytes.slice(32, 32 + 32)

      const decryptedBytes = WalletCrypto.AES.decrypt(
        Buffer.from(hex.slice(7, 7 + 32), 'hex'),
        k,
        null,
        AESopts
      )
      for (let x = 0; x < 32; x++) {
        decryptedBytes[x] ^= derivedBytes[x]
      }
      decrypted = decryptedBytes

      return verifyHashAndReturn()
    }
    const ownerentropy = hex.slice(7, 7 + 8)
    const ownersalt = Buffer.from(!hasLotSeq ? ownerentropy : ownerentropy.slice(0, 4), 'hex')

    const prefactorA = scrypt(passphrase, ownersalt, 16384, 8, 8, 32)
    let passfactor

    if (!hasLotSeq) {
      passfactor = prefactorA
    } else {
      const prefactorB = Buffer.concat([prefactorA, Buffer.from(ownerentropy, 'hex')])
      passfactor = hash256(prefactorB)
    }

    const passpoint = Bitcoin.ECPair.fromPrivateKey(passfactor).publicKey

    const encryptedpart2 = Buffer.from(hex.slice(23, 23 + 16), 'hex')

    const addresshashplusownerentropy = Buffer.from(hex.slice(3, 3 + 12), 'hex')

    const derived = scrypt(passpoint, addresshashplusownerentropy, 1024, 1, 1, 64)
    k = derived.slice(32)

    const unencryptedpart2Bytes = WalletCrypto.AES.decrypt(encryptedpart2, k, null, AESopts)

    for (let i = 0; i < 16; i++) {
      unencryptedpart2Bytes[i] ^= derived[i + 16]
    }

    const encryptedpart1 = Buffer.concat([
      Buffer.from(hex.slice(15, 15 + 8), 'hex'),
      Buffer.from(unencryptedpart2Bytes.slice(0, 0 + 8), 'hex')
    ])

    const unencryptedpart1Bytes = WalletCrypto.AES.decrypt(encryptedpart1, k, null, AESopts)

    for (let ii = 0; ii < 16; ii++) {
      unencryptedpart1Bytes[ii] ^= derived[ii]
    }

    const seedb = Buffer.concat([
      Buffer.from(unencryptedpart1Bytes.slice(0, 0 + 16), 'hex'),
      Buffer.from(unencryptedpart2Bytes.slice(8, 8 + 8), 'hex')
    ])

    const factorb = hash256(seedb)

    // secp256k1: N
    const N = BigInteger.fromHex('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141')

    decrypted = BigInteger.fromBuffer(passfactor)
      .multiply(BigInteger.fromBuffer(factorb))
      .remainder(N)

    return verifyHashAndReturn()
  })
}
