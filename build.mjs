import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'dist');
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'polish.css', 'app.js']) {
  await cp(resolve(root, file), resolve(output, file));
}
await cp(resolve(root, 'public'), resolve(output, 'public'), { recursive: true, force: true });
console.log(`Static production files copied to ${output}`);
