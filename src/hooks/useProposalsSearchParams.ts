import { useMemo } from 'react'

import { SubtypeOptions, toGrantSubtype } from '../entities/Grant/types'
import { ProposalStatus, ProposalType, toProposalType } from '../entities/Proposal/types'
import { toProposalStatus } from '../entities/Proposal/utils'
import { toProposalListPage } from '../utils/locations'

import useURLSearchParams from './useURLSearchParams'

export type SearchParams = {
  type: ProposalType | undefined
  subtype: SubtypeOptions | undefined
  status: ProposalStatus | undefined
  search: string
  searching: boolean
  timeFrame: string
  order: 'ASC' | 'DESC' | undefined
  page: number
}

export function useProposalsSearchParams(): SearchParams {
  const params = useURLSearchParams()

  return useMemo(() => {
    const type = toProposalType(params.get('type')) ?? undefined
    const subtype = toGrantSubtype(params.get('subtype')) ?? undefined
    const status = toProposalStatus(params.get('status'), () => undefined)
    const search = params.get('search') || ''
    const timeFrame = params.get('timeFrame') || ''
    const order = params.get('order') ? (params.get('order') === 'ASC' ? 'ASC' : 'DESC') : undefined
    const searching = !!search && search.length > 0
    const page = toProposalListPage(params.get('page')) ?? undefined

    return { type, subtype, status, search, searching, timeFrame, order, page }
  }, [params])
}
