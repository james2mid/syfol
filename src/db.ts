import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import { getEnv } from './env';

const adapter = new FileSync('db.json')

const db = low(adapter)

if (!db.has('users')) {
  db.set('users', [])
    .write()
}

/** The schema for user objects in the lowdb database. */
interface User {
  id: string
  following: boolean
  followTime: Date
  unfollowTime?: Date
}

/** The typed lowdb collection for users. */
export const users: low.LoDashExplicitSyncWrapper<User[]> = db.get('users')

/** Gets the number of active follows created by syfol. */
export function getActiveFollowCount () {
  return users.find({ following: true }).toLength().value()
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
  const expiryTime = Date.now() - Number(FOLLOW_PERIOD)

  return users
    .filter(x => x.followTime.getTime() < expiryTime && x.following)
    .map(x => x.id)
    .value()
}
