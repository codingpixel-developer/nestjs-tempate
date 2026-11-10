import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function countIn(file: string, marker: string): number {
  return readFileSync(join(root, file), 'utf-8').split(marker).length - 1;
}

describe('create-fullstack-app add-on markers', () => {
  it.each([
    ['src/app.module.ts', '// cfsa:imports'],
    ['src/app.module.ts', '// cfsa:modules'],
    ['src/app.module.ts', '// cfsa:providers'],
    ['src/config/env.validation.ts', '/* cfsa:env */'],
    ['.env.example', '# cfsa:env'],
  ])('%s contains %s exactly once', (file, marker) => {
    expect(countIn(file, marker)).toBe(1);
  });
});
