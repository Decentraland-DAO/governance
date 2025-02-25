import React from 'react'

import Bold from 'decentraland-gatsby/dist/components/Text/Bold'

import { MINIMUM_VP_REQUIRED_TO_VOTE } from '../../../../entities/Votes/constants'
import { Vote } from '../../../../entities/Votes/types'
import useFormatMessage from '../../../../hooks/useFormatMessage'

interface VoteVotingPowerInfoProps {
  accountVotingPower: number
  hasEnoughToVote: boolean
  vote: Vote | null
}

const VoteVotingPowerInfo = ({ accountVotingPower, hasEnoughToVote, vote }: VoteVotingPowerInfoProps) => {
  const t = useFormatMessage()

  function vpLabel(value: number) {
    return <Bold>{t(`general.number`, { value: value })} VP</Bold>
  }

  return (
    <>
      {hasEnoughToVote &&
        (vote
          ? t('page.proposal_detail.voted_with', { vp: vpLabel(accountVotingPower) })
          : t('page.proposal_detail.voting_with', { vp: vpLabel(accountVotingPower) }))}
      {!hasEnoughToVote && t('page.proposal_detail.vp_needed', { vp: vpLabel(MINIMUM_VP_REQUIRED_TO_VOTE) })}
    </>
  )
}

export default VoteVotingPowerInfo
