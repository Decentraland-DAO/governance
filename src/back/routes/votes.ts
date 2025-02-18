import handleAPI from 'decentraland-gatsby/dist/entities/Route/handle'
import routes from 'decentraland-gatsby/dist/entities/Route/routes'
import { Request } from 'express'
import isNumber from 'lodash/isNumber'

import { SnapshotGraphql } from '../../clients/SnapshotGraphql'
import { SnapshotVote } from '../../clients/SnapshotTypes'
import ProposalModel from '../../entities/Proposal/model'
import { ProposalAttributes } from '../../entities/Proposal/types'
import VotesModel from '../../entities/Votes/model'
import { Vote, VoteAttributes } from '../../entities/Votes/types'
import { createVotes, toProposalIds } from '../../entities/Votes/utils'
import { ProposalService } from '../../services/ProposalService'
import { SnapshotService } from '../../services/SnapshotService'
import Time from '../../utils/date/Time'
import { VoteService } from '../services/vote'
import { validateAddress, validateDates, validateProposalId } from '../utils/validations'

export default routes((route) => {
  route.get('/proposals/:proposal/votes', handleAPI(getProposalVotes))
  route.get('/votes', handleAPI(getCachedVotes))
  route.get('/votes/:address', handleAPI(getAddressVotesWithProposals))
  route.post('/votes/top-voters', handleAPI(getTopVoters))
})

export async function getProposalVotes(req: Request<{ proposal: string }>) {
  const refresh = req.query.refresh === 'true'
  const id = validateProposalId(req.params.proposal)

  const proposal = await ProposalService.getProposal(id)
  const latestVotes = await VoteService.getVotes(id)

  if (!!latestVotes.hash && Time.date(proposal.finish_at).getTime() + Time.Hour < Date.now() && !refresh) {
    return latestVotes.votes
  }

  let snapshotVotes: SnapshotVote[]
  try {
    snapshotVotes = await SnapshotGraphql.get().getProposalVotes(proposal.snapshot_id)
  } catch (err) {
    return latestVotes?.votes || {}
  }

  const hash = VotesModel.hashVotes(snapshotVotes)
  if (latestVotes.hash === hash && !refresh) {
    return latestVotes.votes
  }

  return updateSnapshotProposalVotes(proposal, snapshotVotes)
}

export async function updateSnapshotProposalVotes(proposal: ProposalAttributes, snapshotVotes: SnapshotVote[]) {
  const now = new Date()
  const hash = VotesModel.hashVotes(snapshotVotes)
  const votes = createVotes(snapshotVotes)
  await VotesModel.update<VoteAttributes>(
    {
      hash,
      votes: JSON.stringify(votes),
      updated_at: now,
    },
    { proposal_id: proposal.id }
  )

  return votes
}

export async function getCachedVotes(req: Request) {
  const list = toProposalIds(req.query.id as string[])
  const scores = await VotesModel.findAny(list)
  return scores.reduce((result, vote) => {
    result[vote.proposal_id] = vote.votes
    return result
  }, {} as Record<string, Record<string, Vote>>)
}

async function getAddressVotesWithProposals(req: Request) {
  const address = validateAddress(req.params.address)
  const first = Number(req.query.first) || undefined
  const skip = Number(req.query.skip) || undefined

  const votes = await SnapshotService.getAddressesVotes([address], first, skip)

  if (votes.length === 0) {
    return []
  }

  const proposalIds = votes.map((vote) => vote.proposal!.id)
  const proposals = await ProposalModel.findFromSnapshotIds(proposalIds)

  const votesWithProposalData = []

  for (const vote of votes) {
    const currentProposal = proposals.find((item) => item.snapshot_id === vote.proposal!.id)
    if (!currentProposal) {
      continue
    }

    votesWithProposalData.push({
      ...vote,
      proposal: {
        ...vote.proposal,
        proposal_id: currentProposal?.id,
        status: currentProposal?.status,
        type: currentProposal?.type,
        author: currentProposal?.user,
        finish_at: currentProposal?.finish_at?.getTime(),
      },
    })
  }

  return votesWithProposalData.sort((a, b) => b.created - a.created)
}

async function getTopVoters(req: Request) {
  const { start, end, limit } = req.body
  const { validatedStart, validatedEnd } = validateDates(start, end)
  const validLimit = isNumber(limit) ? limit : undefined

  return await VoteService.getTopVoters(validatedStart, validatedEnd, validLimit)
}
