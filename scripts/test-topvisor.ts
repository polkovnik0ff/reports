// Quick smoke test for Topvisor API connectivity
// Usage: npx tsx scripts/test-topvisor.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';
import { createDecipheriv } from 'crypto';

function decryptToken(encrypted: string): string {
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const { rows } = await pool.query<{ topvisorUserId: string; topvisorApiKey: string }>(
    'SELECT "topvisorUserId", "topvisorApiKey" FROM "AccountSettings" LIMIT 1'
  );
  if (!rows[0]?.topvisorUserId) { console.log('No credentials'); return; }
  const userId = decryptToken(rows[0].topvisorUserId);
  const apiKey = decryptToken(rows[0].topvisorApiKey);
  console.log('userId:', userId.slice(0, 4) + '***');

  const resp = await fetch('https://api.topvisor.com/v2/json/get/projects_2/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-id': userId, 'authorization': 'bearer ' + apiKey },
    body: JSON.stringify({ fields: ['id', 'name', 'site'] }),
  });
  const data = await resp.json();
  if (data.errors) { console.log('Error:', data.errors); return; }
  console.log('Projects:', data.result?.length);

  // Test positions for first project
  const proj = data.result?.[0];
  const posResp = await fetch('https://api.topvisor.com/v2/json/get/positions_2/history', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-id': userId, 'authorization': 'bearer ' + apiKey },
    body: JSON.stringify({
      project_id: proj.id,
      regions_indexes: [1],
      type_range: 0,
      dates: [new Date().toISOString().slice(0, 10)],
      show_headers: true,
      show_tops: true,
    }),
  });
  const posData = await posResp.json();
  if (posData.errors) { console.log('Positions error:', posData.errors[0]?.string); return; }
  const kws = posData.result?.keywords ?? [];
  console.log(`${proj.name}: ${kws.length} keywords, dates: ${posData.result?.headers?.dates}`);

  await pool.end();
}

main().catch(console.error);
