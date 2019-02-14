import Debug from 'debug'
const debug = Debug('syfol:index')
import { getEnv } from './env'
import { users } from './db'
import { follow, getUserIdsFromSearch } from './twitter'

let timerId: NodeJS.Timeout | null

export function setup () {
  if (timerId) {
    throw new Error('Setup has already been called.')
  }

  const { BATCH_INTERVAL } = getEnv()

  // call first tick
  tick()

  // schedule later ticks
  const interval = Number(BATCH_INTERVAL)
  timerId = setInterval(tick, interval)
}

export function cancel () {
  if (!timerId) return
  
  clearInterval(timerId)
  timerId = null
}

async function tick () {
  debug('Tick has been called')

  try { await processUnfollowing() } catch { }
  try { await processFollowing() } catch { }

  debug('This tick iteration has finished')
  debug(`Next tick at ${new Date(Date.now() + Number(process.env.BATCH_INTERVAL))}`)
}

async function processUnfollowing () {
  const { FOLLOW_PERIOD } = getEnv()

  debug('--- Starting to unfollow users ---')

  const expiryTime = Date.now() - Number(FOLLOW_PERIOD)
  const unfollowList: string[] =
    users
      .filter(x => x.followTime.getTime() < expiryTime && x.following)
      .map(x => x.id)
      .value()
  
  if (!unfollowList.length) {
    debug('No users to unfollow, moving on...')
    return
  }

  debug(`Planning to unfollow ${unfollowList.length} users`)

  for (let id of unfollowList) {
    // try to unfollow
    try {
      await follow(id, true)

      users
        .find({ id })
        .assign({ following: false, unfollowTime: new Date() })
        .write()
    } catch (err) {
      debug(`Error occured while unfollowing user, breaking`)
      debug(err)
      break
    }
  }
}

async function processFollowing () {
  debug('--- Starting to follow users ---')

  const { SEARCH_QUERY, EXCLUDE_USERS, BATCH_QUANTITY, FOLLOWER_LIMIT } = getEnv()
  const excludedIds = EXCLUDE_USERS.split(',')

  const userIds = (await getUserIdsFromSearch(SEARCH_QUERY, Number(BATCH_QUANTITY)))
    .filter(id => {
      // check whether the id is excluded
      if (excludedIds.includes(id)) {
        debug(`User ${id} is on the excluded list, skipping`)
        return false
      }

      // check the user hasn't been followed before
      const existing = users.find({ id }).value()
      if (existing) {
        debug(`User ${id} has been followed before, skipping`)
        return false
      }

      return true
    })
  
  const activeCount = users
    .filter({ following: true })
    .toLength()
    .value()
  const followsRemaining = Number(FOLLOWER_LIMIT) - activeCount

  debug(`Currently following ${activeCount} users`)
  debug(`Able to follow ${followsRemaining} more users before reaching limit of ${followsRemaining}`)

  if (followsRemaining <= 0) {
    debug('Follower limit has been reached, ending follow process')
    return
  } else if (userIds.length > followsRemaining) {
    const diff = userIds.length - followsRemaining
    userIds.splice(-diff, diff)
    debug(`Removed ${diff} users to match follower limit of ${FOLLOWER_LIMIT}`)
  }
  
  debug(`Attempting to follow ${userIds.length} users`)
  
  // attempt to follow each
  for (let id of userIds) {
    try {
      await follow(id)

      users
        .push({ id, following: true, followTime: new Date() })
        .write()
    } catch (err) {
      console.log('caught')
      debug(`Error occured while following user, breaking`)
      debug(err)
      break
    }
  }

}
