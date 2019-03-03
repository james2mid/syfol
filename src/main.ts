import Debug from 'debug'
const debug = Debug('syfol:main')
import { getEnv } from './env'
import { users, getActiveFollowCount, patchUnfollow, getExpiredIds, insertFollow } from './db'
import { follow, getUserIdsFromSearch } from './twitter'

let timerId: NodeJS.Timeout | null

/** Used externally to start the worker. */
export function setup () {
  if (timerId) {
    throw new Error('Setup has already been called.')
  }

  const { BATCH_INTERVAL } = getEnv()

  // call first tick
  work()

  // schedule later ticks
  const interval = Number(BATCH_INTERVAL)
  timerId = setInterval(work, interval)
}

/** Used externally to stop the worker. */
export function cancel () {
  if (!timerId) return
  
  clearInterval(timerId)
  timerId = null
}

/** A single iteration of work by calling other processor functions. */
async function work () {
  debug('Starting work')

  await processUnfollowing()
    .catch(err => {
      debug('Error occured in the unfollowing process')
      debug(err)
    })
  await processFollowing()
    .catch(err => {
      debug('Error occured in the following process')
      debug(err)
    })

  debug('This work has finished')
  debug(`Next working at ${new Date(Date.now() + Number(process.env.BATCH_INTERVAL))}`)
}

/** Attempts to unfollow all expired follows. */
async function processUnfollowing () {
  debug('--- Starting to unfollow users ---')
  
  const unfollowList: string[] = getExpiredIds()
  if (!unfollowList.length) {
    debug('No users to unfollow, moving on...')
    return
  }

  debug(`Planning to unfollow ${unfollowList.length} users`)

  const countBefore = getActiveFollowCount()
  for (let id of unfollowList) {
    // attempt unfollow at Twitter API
    try {
      await follow(id, true)
    } catch (err) {
      // user no longer exists
      if (err.some((x: any) => x.code == 34)) {
        debug('User deleted, skipping')
        patchUnfollow(id)
        continue
      }

      debug(`Error occured while unfollowing user, breaking`)
      debug(err)
      break
    }

    // mark in db that user has been unfollowed
    patchUnfollow(id)
  }
  const countAfter = getActiveFollowCount()
  debug(`Finished. Unfollowed ${countBefore - countAfter} users`)
}

/** Attempts to follow new users from search. */
async function processFollowing () {
  debug('--- Starting to follow users ---')

  const { FOLLOWER_LIMIT } = getEnv()
  
  const userIds = await getIdsToFollow()

  const countBefore = getActiveFollowCount()
  const followsRemaining = Number(FOLLOWER_LIMIT) - countBefore

  debug(`Currently following ${countBefore} users`)
  debug(`Able to follow ${followsRemaining} more before limit of ${FOLLOWER_LIMIT}`)

  if (followsRemaining <= 0) {
    debug('Follower limit has been reached, ending follow process')
    return
  } else if (userIds.length > followsRemaining) {
    const diff = userIds.length - followsRemaining
    userIds.splice(-diff, diff)
    debug(`Removed ${diff} users to match limit`)
  }
  
  debug(`Attempting to follow ${userIds.length} users`)
  
  // attempt following each new user
  for (let id of userIds) {
    try {
      await follow(id)
    } catch (err) {
      debug(`Error occured while following user, breaking`)
      debug(err)
      break
    }

    // insert new record into db
    insertFollow(id)
  }
  const countAfter = getActiveFollowCount()
  debug(`Finished. Followed ${countAfter - countBefore} users`)
}

/** Gets a list of user ids to follow. */
async function getIdsToFollow () {
  const { SEARCH_QUERY, EXCLUDE_USERS, BATCH_QUANTITY } = getEnv()

  const excludedIds = EXCLUDE_USERS.split(',')

  return (await getUserIdsFromSearch(SEARCH_QUERY, Number(BATCH_QUANTITY)))
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
}