import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import { getEnv } from './env';

const adapter = new FileSync('db.json')

const db = (() => {
  const db = low(adapter)
  if (!db.has('users').value()) {
    db.set('users', [])
      .write()
  }
  return db
})()

/** The schema for user objects in the lowdb database. */
interface User {
  id: string
  following: boolean
  followTime: string | Date
  unfollowTime?: string | Date
}

/** The typed lowdb collection for users. */
export const users: low.LoDashExplicitSyncWrapper<User[]> = db.get('users')

/** Gets the number of active follows created by syfol. */
export function getActiveFollowCount () {
  return users.filter({ following: true }).value().length
}

/** Inserts a new record for the given id saying they've been followed. */
export function insertFollow (id: string) {
  users
    .push({ id, following: true, followTime: new Date() })
    .write()
}

/** Updates the database for the given id saying they've been unfollwed. */
export function patchUnfollow (id: string) {
  users
    .find({ id })
    .assign({ following: false, unfollowTime: new Date() })
    .write()
}

/** Gets a list of ids whose follow has expired and should be unfollowed. */
export function getExpiredIds () {
  const { FOLLOW_PERIOD } = getEnv()
  // follows created before this time have expired
  const expiryTime = Date.now() - Number(FOLLOW_PERIOD)

  return users
    .filter({ following: true })
    .filter(x => new Date(x.followTime).getTime() < expiryTime)
    .sort((a, b) => a.followTime > b.followTime ? 1 : -1) // sort by oldest follow
    .map(x => x.id)
    .value()
}
