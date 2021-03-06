import Debug from 'debug'
const debug = Debug('syfol:env')
import * as joi from 'joi'
const dotenv = require('dotenv')

/** The schema for `process.env`. Only contains keys used in the program. */
interface Env {
  SEARCH_QUERY: string,
  BATCH_INTERVAL: string,
  BATCH_QUANTITY: string,
  FOLLOW_PERIOD: string,
  FOLLOWER_LIMIT: string,
  EXCLUDE_USERS: string,

  TWITTER_CONSUMER_KEY: string,
  TWITTER_CONSUMER_SECRET: string,
  TWITTER_ACCESS_TOKEN_KEY: string,
  TWITTER_ACCESS_TOKEN_SECRET: string
}

/** The path to the env file. File must be created unless environment variables are set at runtime. */
let envPath = process.env.ENV_PATH || (process.env.HOME + '/.syfol')
/** Indicated whether the environment variables have been loaded and validated. */
let processedEnv: boolean = false

/** Used externally to set the env path. Alternatively, set `process.env.ENV_PATH`. */
export function changeEnvPath (path: string) {
  if (processedEnv) {
    throw new Error('The env file has already been read')
  }

  envPath = path
}

/** Gets a typed `process.env`. Loads from the env path and validates on first call. */
export function getEnv (): Env {
  if (!processedEnv) {
    debug(`Loading environment variables from '${envPath}'`)
    const result = dotenv.config({ path: envPath })
    result.error ?
      debug('Failed to load from file') :
      debug('Loaded successfully from file')
      
    validateEnv()
    processedEnv = true
  }

  return process.env as any
}

/** Tests `process.env` to ensure all necessary properties have been set. */
function validateEnv () {
  debug('Checking environment variables')

  const def = (k: keyof Env, v: any) => 
    process.env[k] = process.env[k] || String(v)
  
  def('BATCH_INTERVAL', 60 * 60 * 1000)
  def('FOLLOW_PERIOD', 12 * 60 * 60 * 1000)
  def('EXCLUDE_USERS', '12')
  def('FOLLOWER_LIMIT', 1000)

  const schema: { [k in keyof Env]: joi.Schema } = {
    SEARCH_QUERY: joi.string().min(1),
    BATCH_INTERVAL: joi.string().regex(/^\d+$/),
    BATCH_QUANTITY: joi.string().regex(/^\d+$/),
    FOLLOW_PERIOD: joi.string().regex(/^\d+$/),
    FOLLOWER_LIMIT: joi.string().regex(/^\d+$/),
    EXCLUDE_USERS: joi.string().regex(/^(\d+(\,\d+)*)?$/),

    TWITTER_CONSUMER_KEY: joi.string().min(20).max(35),
    TWITTER_CONSUMER_SECRET: joi.string().min(45).max(60),
    TWITTER_ACCESS_TOKEN_KEY: joi.string().min(45).max(60),
    TWITTER_ACCESS_TOKEN_SECRET: joi.string().min(40).max(55)
  }

  joi.assert(process.env, joi.object(schema).unknown(true))

  // TODO test twitter keys

  debug('Environment variables are valid')
}