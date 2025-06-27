import * as fs from 'fs';
import * as path from 'path';
import { IDependencyChecker } from '../interfaces.js';
import { KnipChecker } from './knip.js';
import { ComposerUnusedChecker } from './composer.js';
import { FawltyDepsChecker } from './fawltydeps.js';
import { PackageJsonDeducer } from '../deducers/package-json.js';
import { ComposerJsonDeducer } from '../deducers/composer-json.js';
import { PyprojectTomlDeducer } from '../deducers/pyproject-toml.js';
import { MavenChecker } from './maven.js';
import { PomXmlDeducer } from '../deducers/pom-xml.js';

const allCheckers: IDependencyChecker[] = [
  new KnipChecker(new PackageJsonDeducer()),
  new ComposerUnusedChecker(new ComposerJsonDeducer()),
  new FawltyDepsChecker(new PyprojectTomlDeducer()),
  new MavenChecker(new PomXmlDeducer()),
];

export function getCheckersForProject(
  projectPath: string,
): IDependencyChecker[] {
  return allCheckers.filter((checker) =>
    fs.existsSync(path.join(projectPath, checker.manifestFile)),
  );
}
