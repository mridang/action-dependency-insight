/**
 * Registers every dependency checker and selects the ones that apply to a
 * project based on the manifest files present in its root.
 * @file
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
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

/**
 * Returns the checkers whose manifest file exists in the given project.
 * @param projectPath - The absolute path to the project's root directory.
 * @returns The applicable checkers, in registration order.
 * @example
 * const checkers = getCheckersForProject('/workspace/my-app');
 */
export function getCheckersForProject(
  projectPath: string,
): IDependencyChecker[] {
  return allCheckers.filter((checker) =>
    // eslint-disable-next-line n/no-sync -- the checker contract is synchronous, so discovery stays synchronous
    existsSync(path.join(projectPath, checker.manifestFile)),
  );
}
