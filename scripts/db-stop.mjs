#!/usr/bin/env node
/** Arrête Supabase local (miroir ~/jumelo-db). Usage : npm run db:stop */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const MIRROR = resolve(process.env.HOME || '~', 'jumelo-db');
const r = spawnSync('supabase', ['stop'], { cwd: MIRROR, stdio: 'inherit' });
process.exit(r.status ?? 1);
