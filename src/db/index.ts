import SqliteDb from 'better-sqlite3'
import {
  Dialect,
  Kysely,
  Migrator,
  PostgresDialect,
  SqliteDialect,
} from 'kysely'
import { DatabaseSchema } from './schema'
import { migrationProvider } from './migrations'
import { Pool } from 'pg'

export const createDb = (type: string, connString: string): Database => {
  let dialect: Dialect
  switch (type) {
    case 'sqlite':
      dialect = new SqliteDialect({
        database: new SqliteDb(connString),
      })
      break
    case 'postgres':
      dialect = new PostgresDialect({
        pool: new Pool({
          connectionString: connString,
          max: 10,
          ssl: {
            rejectUnauthorized: false,
            requestCert: true,
          },
        }),
      })
      break
    default:
      throw new Error(`Unsupported database type: ${type}`)
  }
  const db = new Kysely<DatabaseSchema>({
    dialect: dialect,
    log: ['query', 'error'],
  })
  return db
}

export const migrateToLatest = async (db: Database) => {
  const migrator = new Migrator({ db, provider: migrationProvider })
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

export type Database = Kysely<DatabaseSchema>
