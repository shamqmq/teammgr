import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../config/database'; 

await migrate(db, { migrationsFolder: './src/db/migrations' });
console.log('Migrations done');
process.exit(0);
