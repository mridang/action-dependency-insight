import * as fs from 'fs';
import * as path from 'path';
import { IDependencyChecker } from '../interfaces.js';
import { KnipChecker } from './knip.js';
import { ComposerUnusedChecker } from './composer.js';
import { FawltyDepsChecker } from './fawltydeps.js';

const allCheckers: IDependencyChecker[] = [
  new KnipChecker(),
  new ComposerUnusedChecker(),
  new FawltyDepsChecker(),
];

export function getCheckersForProject(
  projectPath: string,
): IDependencyChecker[] {
  return allCheckers.filter((checker) =>
    fs.existsSync(path.join(projectPath, checker.manifestFile)),
  );
}
