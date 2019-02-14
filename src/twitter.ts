import Debug from 'debug'
const debug = Debug('syfol:twitter')
import Twitter from 'twitter'
const Limiter = require('jimlim')
import { getEnv } from './env'
import { compareNumbers } from './misc'

const client = getClient()
function getClient () {
  const env = getEnv()

  debug('Instantiating the Twitter client')

  return new Twitter({
    consumer_key: env.TWITTER_CONSUMER_KEY,
    consumer_secret: env.TWITTER_CONSUMER_SECRET,
    access_token_key: env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: env.TWITTER_ACCESS_TOKEN_SECRET
  })
}

/** Gets an array of unique user ids by searching for the specified query. */
export async function getUserIdsFromSearch (query: string, quantity: number): Promise<string[]> {
  debug(`Searching Twitter for ${query}`)

  const userIds: string[] = []
  const limiter = new Limiter(180, 15 * 60 * 1000, 'twitter:search')
  let lastMax: string = ''
  let max: string = ''
  
  // continue getting the following page until at capacity or rate limit reached
  let counter: number = 0
  while (userIds.length < quantity && !limiter.limitReached) {
    // prevent infinite loop and getting the same tweets
    if (!!max && max === lastMax) {
      debug('Tweet ID used for max has been repeated, finishing')
      break
    }
    lastMax = max

    debug(`Getting page ${++counter} using ${max ? 'a max of '+max : 'no max'}`)

    try {
      const result = await limiter.execute(() =>
        client.get('search/tweets.json', {
          q: query,
          result_type: 'mixed',
          include_entities: false,
          max_id: max,
          count: 100
        })
      )

      if (!result.statuses.length) {
        debug('Received page with no tweets, finishing')
        break
      }

      debug(`Received page with ${result.statuses.length} tweets`)
  
      const sizeBefore = userIds.length
      result.statuses.forEach((tweet: any) => {
        // add usernames to the set
        const userId = tweet.user.id_str
        if (!userIds.includes(userId)) {
          userIds.push(userId)
        }

        // `max` should contain the minimum tweetId
        const tweetId = tweet.id_str
        if (!max || compareNumbers(max, tweetId) === 1) {
          max = tweetId
        }
      })
      debug(`Added ${userIds.length - sizeBefore} users to the list`)

    } catch (err) {
      // break in the case of any error
      // includes errors received from the API
      debug(`Error occured when searching, breaking`)
      debug(err)
      break
    }
  }

  if (userIds.length > quantity) {
    const diff = userIds.length - quantity
    userIds.splice(-diff, diff)
    debug(`Removed ${diff} users from list to not exceed requested quantity`)
  }

  debug(`Finished forming a list of ${userIds.length} users`)

  return userIds
}

/** Follows or unfollows the provided user. Rejects on an error or when rate limit has been reached. */
export async function follow (user_id: string, unfollow: boolean = false) {
  debug(`${unfollow ? 'Unfollowing' : 'Following'} user ${user_id}`)

  let promise

  if (!unfollow) {
    const limiter = new Limiter(200, 4 * 60 * 60 * 1000, 'twitter:follow')
    promise = limiter.execute(() => client.post('friendships/create.json', {
      user_id,
      follow: false // this option is for notifications
    }))
  } else {
    const limiter = new Limiter(100, 4 * 60 * 60 * 1000, 'twitter:unfollow')
    promise = limiter.execute(() => client.post('friendships/destroy', {
      user_id
    }))
  }

  await promise
}
