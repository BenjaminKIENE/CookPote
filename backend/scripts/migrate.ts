/**
 * Run database migrations.
 * Usage: npm run migrate
 *        npm run migrate -- --down   (rollback one step)
 */
import 'dotenv/config';
import { MigrationProvider, Migrator, Migration } from 'kysely';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { db } from '../src/db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFolder = path.resolve(__dirname, '../src/db/migrations');

// Windows-compatible provider: uses pathToFileURL for dynamic imports
const provider: MigrationProvider = {
  async getMigrations(): Promise<Record<string, Migration>> {
    const migrations: Record<string, Migration> = {};
    const files = await fs.readdir(migrationFolder);
    for (const fileName of files.filter(f => f.endsWith('.js'))) {
      const filePath = path.join(migrationFolder, fileName);
      const mod = await import(pathToFileURL(filePath).href);
      const migrationKey = fileName.replace(/\.js$/, '');
      migrations[migrationKey] = mod;
    }
    return migrations;
  },
};

const migrator = new Migrator({ db, provider });

const direction = process.argv.includes('--down') ? 'down' : 'up';

async function run() {
  const result =
    direction === 'down'
      ? await migrator.migrateDown()
      : await migrator.migrateToLatest();

  const { error, results } = result;

  if (results?.length === 0) {
    console.log('✅ No pending migrations.');
  }

  results?.forEach((it) => {
    const icon = it.status === 'Success' ? '✅' : it.status === 'NotExecuted' ? '⏭️' : '❌';
    console.log(`${icon} [${it.direction}] ${it.migrationName}`);
  });

  if (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  await db.destroy();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
