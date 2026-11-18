import { demoSettings } from '~/lib/demo-data'
import { isDemoMode } from '~/lib/services'

// the single seam between pages & identity. Every page & server action asks this for the userId,
// so when Auth.js (or whatever ADR 0002 picks) lands, only this function changes.
export async function getCurrentUserId(): Promise<string> {
  if (isDemoMode()) return demoSettings.userId

  // until sign-in exists, local development borrows a fixed user. I refuse it in production
  // so an unauthenticated deploy can't quietly expose a real logbook.
  const developmentUserId = process.env.DEV_USER_ID
  if (developmentUserId && process.env.NODE_ENV !== 'production') return developmentUserId

  throw new Error('No signed-in user. Set DEV_USER_ID in .env.local for local development, or DATA_SOURCE=demo to use sample data.')
}
