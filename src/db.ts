import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'

const adapter = new FileSync('db.json')

const db = low(adapter)
  .defaults({ users: [] })

interface User {
  id: string
  following: boolean
  followTime: Date
  unfollowTime?: Date
}

export const users: low.LoDashExplicitSyncWrapper<User[]> = db.get('users')