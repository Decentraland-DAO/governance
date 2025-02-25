import React, { useMemo } from 'react'

import { useLocation } from '@reach/router'
import Head from 'decentraland-gatsby/dist/components/Head/Head'
import NotFound from 'decentraland-gatsby/dist/components/Layout/NotFound'
import { Header } from 'decentraland-ui/dist/components/Header/Header'

import Link from '../components/Common/Typography/Link'
import ContentLayout, { ContentSection } from '../components/Layout/ContentLayout'
import LoadingView from '../components/Layout/LoadingView'
import UpdateComments from '../components/Updates/UpdateComments'
import UpdateMarkdownView from '../components/Updates/UpdateMarkdownView'
import { getUpdateNumber } from '../entities/Updates/utils'
import useFormatMessage from '../hooks/useFormatMessage'
import useProposal from '../hooks/useProposal'
import useProposalUpdate from '../hooks/useProposalUpdate'
import useProposalUpdates from '../hooks/useProposalUpdates'
import locations from '../utils/locations'

import './update.css'

export default function UpdateDetail() {
  const t = useFormatMessage()
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const updateId = params.get('id')
  const { update, isLoadingUpdate, isErrorOnUpdate } = useProposalUpdate(updateId)
  const { proposal, isErrorOnProposal, isLoadingProposal } = useProposal(update?.proposal_id)
  const {
    publicUpdates,
    isLoading: isLoadingPublicUpdates,
    isError: isErrorOnPublicUpdates,
  } = useProposalUpdates(update?.proposal_id)

  if (isErrorOnUpdate || isErrorOnProposal || isErrorOnPublicUpdates) {
    return (
      <ContentLayout>
        <NotFound />
      </ContentLayout>
    )
  }

  if (!update || !publicUpdates || isLoadingUpdate || isLoadingPublicUpdates || isLoadingProposal) {
    return <LoadingView />
  }

  const index = getUpdateNumber(publicUpdates, updateId)
  const proposalHref = locations.proposal(update.proposal_id)

  return (
    <>
      <Head
        title={t('page.update_detail.page_title', { title: proposal?.title, index })}
        description={update?.introduction}
        image="https://decentraland.org/images/decentraland.png"
      />
      <ContentLayout navigateHref={proposalHref} small>
        <ContentSection className="UpdateDetail__Header">
          <span className="UpdateDetail__ProjectTitle">
            {t('page.update_detail.project_title', { title: <Link href={proposalHref}>{proposal?.title}</Link> })}
          </span>
          <Header size="huge">{t('page.update_detail.title', { index })}</Header>
        </ContentSection>
        {update && (
          <>
            <UpdateMarkdownView update={update} author={update.author} />
            <UpdateComments update={update} />
          </>
        )}
      </ContentLayout>
    </>
  )
}
