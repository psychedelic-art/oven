import 'dotenv/config';
import './proxy-bootstrap';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT current_database() as db, current_user as usr`;
  console.log(rows);
  const extRows = await sql`SELECT extname FROM pg_extension ORDER BY extname`;
  console.log('extensions:', (extRows as Array<{ extname: string }>).map((r) => r.extname).join(', '));
  const tableRows = (await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `) as Array<{ tablename: string }>;
  console.log(`public tables (${tableRows.length}):`, tableRows.map((r) => r.tablename).join(', '));
}

main().catch((e) => {
  console.error('db-check failed:', e);
  process.exit(1);
});
