import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

async function runMigration() {
    console.log('Starting migration...');

    // Load connection string
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is not set in environment.');
        process.exit(1);
    }

    const sql = postgres(connectionString);

    try {
        const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260130133000_add_admin_column.sql');
        console.log(`Reading migration file: ${migrationPath}`);

        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing SQL...');
        await sql.unsafe(migrationSql);

        console.log('Migration applied successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

runMigration();
