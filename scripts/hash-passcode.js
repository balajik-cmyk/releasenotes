#!/usr/bin/env node
// Generate ADMIN_PASSCODE_HASH + ADMIN_SESSION_SECRET for .env / Vercel.
// Usage: node scripts/hash-passcode.js "your-passcode"

import { randomBytes } from 'node:crypto';
import { hashPasscode } from '../api/_lib/auth.js';

const passcode = process.argv[2];
if (!passcode) {
  console.error('Usage: node scripts/hash-passcode.js "your-passcode"');
  process.exit(1);
}

const { packed } = hashPasscode(passcode);
const secret = randomBytes(32).toString('base64url');

console.log('# Add these to .env and Vercel (Production + Preview). Never commit the plaintext passcode.');
console.log(`ADMIN_PASSCODE_HASH=${packed}`);
console.log(`ADMIN_SESSION_SECRET=${secret}`);
