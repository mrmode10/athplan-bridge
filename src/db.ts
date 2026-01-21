import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
// @ts-ignore: connectionString might be undefined, but we expect it to be set
const sql = postgres(connectionString);

export default sql;
