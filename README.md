<img src="docs/res/icon.svg" alt="Syfol Icon" width="100"/>

# Syfol

Syfol is a script that allows any Twitter user to gain followers by temporarily following others.

## Features
* Follows users posting tweets matching specified search criteria
* Skips any users that have been followed before
* Permits configurable limits, see under config
* Never crashes, all exceptions caught
* Adheres to Twitter's rate limiting

## Usage
Syfol can be used as a NPM package but is designed primarily to be used as a script. See NPM usage below.

1. Clone the repo
2. Run `npm install` inside the directory
3. Run `npm build` inside the directory
4. Add your env file (see config below)
5. Execute the `dist/script.js` file (forever or PM2 is recommended)

Logging is done by the [debug](https://www.npmjs.com/package/debug) module. To see the logs, change the `DEBUG` parameter when executing the script. The best options are `DEBUG=*` and slightly less verbose `DEBUG='syfol:main'`. The debug module will then log to `stderr`.

## Config
Configuration is done via an env file. The default configuration path is `~/.syfol` but this can be changed by setting the `ENV_PATH` global. Ensure the path is absolute.

This is an example file minus keys which you need to get from Twitter.

```
SEARCH_QUERY='candy'           # The query for the search
BATCH_INTERVAL=3600000         # The interval between batches
BATCH_QUANTITY=50              # Users to follow per batch
FOLLOW_PERIOD=21600000         # Period of time to follow a user
FOLLOWER_LIMIT=500             # Max following count from syfol
EXCLUDE_USERS='12,775,6231,4'  # User IDs to exclude

TWITTER_CONSUMER_KEY=''
TWITTER_CONSUMER_SECRET=''
TWITTER_ACCESS_TOKEN_KEY=''
TWITTER_ACCESS_TOKEN_SECRET=''
```


## NPM Usage
You can also use this module as an NPM module.

Install from npm

`npm install syfol`

Then use in code in the following way:

```js
import { setup, cancel, changeEnvPath } from 'syfol'

/* Setup env variables */

// via a file at ~/.syfol

// or via a file at a different path
changeEnvPath('/Users/user/path/to/syfol.env')

// or set manually
process.env.KEY_NAME = 'some value'

/* Enable debugging / logging */

// optionally set `DEBUG` variable to see logs
process.env.DEBUG = '*' // or 'syfol:main'

/* Start by calling setup() */
setup()

/* End by calling cancel() */
setTimeout(cancel, 86400 * 1000) // ends after one day
```

