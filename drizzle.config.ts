import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

const databaseUrl = process.env.DATABASE_URL

export default defineConfig({
  schema: './src/adapters/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
})
