import fs from 'node:fs';
import path from 'node:path';
// Optional exact-secret check; never require a plaintext local secret to build.
const localEnv = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
const key = process.env.OPENAI_API_KEY || localEnv.split('\n').find(line => line.startsWith('OPENAI_API_KEY='))?.slice(15);
let scanned = 0;
function scan(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) scan(file);
    else {
      const data = fs.readFileSync(file);
      if ((key && data.includes(Buffer.from(key))) || /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/.test(data.toString('utf8'))) {
        throw Error('Possible API credential detected in build output; publication blocked.');
      }
      scanned++;
    }
  }
}
scan('dist');
console.log(`PASS: ${scanned} build files scanned for credential patterns${key ? ' and exact configured secret' : ' (no local secret required)'}.`);
