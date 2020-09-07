import { RootState } from 'modules/root/types'
import { createSelector } from 'reselect'
import { AppState } from './reducer'
import { VOTING_APP } from './types'
import { getNetwork } from 'modules/wallet/selectors'

export const getState: (state: RootState) => AppState = state => state.app

export const getData: (state: RootState) => AppState['data'] = state => getState(state).data

export const getError: (state: RootState) => AppState['error'] = state => getState(state).error

export const getLoading = (state: RootState) => getState(state).loading

export const getApps = createSelector(
  getData,
  (apps) => Array.from(Object.values(apps))
)

export const getVotingApps = createSelector(
  getNetwork,
  getApps,
  (network, apps) => apps.filter(app => app.appName === VOTING_APP[network])
)
