import { abi as BadgesAbi } from '@otterspace-xyz/contracts/out/Badges.sol/Badges.json'
import logger from 'decentraland-gatsby/dist/entities/Development/logger'
import { ethers } from 'ethers'

import { POLYGON_BADGES_CONTRACT_ADDRESS, RAFT_OWNER_PK, TRIMMED_OTTERSPACE_RAFT_ID } from '../../constants'
import { ActionStatus, BadgeCreationResult, GAS_MULTIPLIER, GasConfig } from '../../entities/Badges/types'
import RpcService from '../../services/RpcService'
import { AirdropJobStatus, AirdropOutcome } from '../types/AirdropJob'

const TRANSACTION_UNDERPRICED_ERROR_CODE = -32000

function checksumAddresses(addresses: string[]): string[] {
  return addresses.map((address) => ethers.utils.getAddress(address))
}

function getBadgesSignerAndContract() {
  const provider = RpcService.getPolygonProvider()
  const signer = new ethers.Wallet(RAFT_OWNER_PK, provider)
  const contract = new ethers.Contract(POLYGON_BADGES_CONTRACT_ADDRESS, BadgesAbi, signer)
  return { signer, contract }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function estimateGas(estimateFunction: (...args: any[]) => Promise<any>): Promise<GasConfig> {
  const provider = RpcService.getPolygonProvider()
  const gasLimit = await estimateFunction()
  const gasPrice = await provider.getGasPrice()
  const adjustedGasPrice = gasPrice.mul(GAS_MULTIPLIER)
  return {
    gasPrice: adjustedGasPrice,
    gasLimit,
  }
}

export async function airdrop(badgeCid: string, recipients: string[], shouldPumpGas = false) {
  const { signer, contract } = getBadgesSignerAndContract()
  const ipfsAddress = `ipfs://${badgeCid}/metadata.json`
  const formattedRecipients = checksumAddresses(recipients)
  logger.log(`Airdropping, pumping gas ${shouldPumpGas}`)
  let txn
  if (shouldPumpGas) {
    const gasConfig = await estimateGas(async () => contract.estimateGas.airdrop(formattedRecipients, ipfsAddress))
    txn = await contract.connect(signer).airdrop(formattedRecipients, ipfsAddress, gasConfig)
  } else {
    txn = await contract.connect(signer).airdrop(formattedRecipients, ipfsAddress)
  }
  await txn.wait()
  logger.log('Airdropped badge with txn hash:', txn.hash)
  return txn.hash
}

export async function reinstateBadge(badgeId: string) {
  const { signer, contract } = getBadgesSignerAndContract()
  const gasConfig = await estimateGas(async () => {
    return contract.estimateGas.reinstateBadge(TRIMMED_OTTERSPACE_RAFT_ID, badgeId)
  })

  const txn = await contract.connect(signer).reinstateBadge(TRIMMED_OTTERSPACE_RAFT_ID, badgeId, gasConfig)
  await txn.wait()
  logger.log('Reinstated badge with txn hash:', txn.hash)
  return txn.hash
}

export async function revokeBadge(badgeId: string, reason: number) {
  const { signer, contract } = getBadgesSignerAndContract()

  const gasConfig = await estimateGas(async () => {
    return contract.estimateGas.revokeBadge(TRIMMED_OTTERSPACE_RAFT_ID, badgeId, reason)
  })

  const txn = await contract.connect(signer).revokeBadge(TRIMMED_OTTERSPACE_RAFT_ID, badgeId, reason, gasConfig)
  await txn.wait()
  logger.log('Revoked badge with txn hash:', txn.hash)
  return txn.hash
}

export async function checkBalance() {
  const { signer } = getBadgesSignerAndContract()
  const balance = await signer.getBalance()
  const balanceInEther = ethers.utils.formatEther(balance)
  const balanceBigNumber = ethers.BigNumber.from(balance)
  console.log(`Balance of ${signer.address}: ${balanceInEther} ETH = ${balanceBigNumber}`)
}

export function trimOtterspaceId(rawId: string) {
  const parts = rawId.split(':')
  if (parts.length === 2) {
    return parts[1]
  }
  return ''
}

export function getIpfsAddress(badgeCid: string) {
  return `ipfs://${badgeCid}/metadata.json`
}

export async function createSpec(badgeCid: string) {
  const { signer, contract } = getBadgesSignerAndContract()
  const ipfsAddress = `ipfs://${badgeCid}/metadata.json`

  const gasConfig = await estimateGas(async () => {
    return contract.estimateGas.createSpec(ipfsAddress, TRIMMED_OTTERSPACE_RAFT_ID)
  })

  const txn = await contract.connect(signer).createSpec(ipfsAddress, TRIMMED_OTTERSPACE_RAFT_ID, gasConfig)
  await txn.wait()
  logger.log('Create badge spec with txn hash:', txn.hash)
  return txn.hash
}

export async function airdropWithRetry(
  badgeCid: string,
  recipients: string[],
  retries = 3,
  shouldPumpGas = false
): Promise<AirdropOutcome> {
  try {
    await airdrop(badgeCid, recipients, shouldPumpGas)
    return { status: AirdropJobStatus.FINISHED, error: '' }
  } catch (error: any) {
    if (retries > 0) {
      logger.log(`Retrying airdrop... Attempts left: ${retries}`, error)
      const shouldPumpGas = isTransactionUnderpricedError(error)
      return await airdropWithRetry(badgeCid, recipients, retries - 1, shouldPumpGas)
    } else {
      logger.error('Airdrop failed after maximum retries', error)
      return { status: AirdropJobStatus.FAILED, error: JSON.stringify(error) }
    }
  }
}

export async function createSpecWithRetry(badgeCid: string, retries = 3): Promise<BadgeCreationResult> {
  try {
    await createSpec(badgeCid)
    return { status: ActionStatus.Success, badgeCid }
  } catch (error: any) {
    if (retries > 0) {
      logger.log(`Retrying create spec... Attempts left: ${retries}`, error)
      return await createSpecWithRetry(badgeCid, retries - 1)
    } else {
      logger.error('Create spec failed after maximum retries', error)
      return { status: ActionStatus.Failed, error, badgeCid }
    }
  }
}

export function isTransactionUnderpricedError(error: any) {
  try {
    const errorParsed = JSON.parse(error.body)
    const errorCode = errorParsed?.error?.code
    return errorCode === TRANSACTION_UNDERPRICED_ERROR_CODE
  } catch (e) {
    return false
  }
}
