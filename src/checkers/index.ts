/**
 * Registers every dependency checker and selects the ones that apply to a
 * project based on the manifest files present in its root.
 * @file
 */
import { pathExists } from './path-exists.js';
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
 * @returns A promise of the applicable checkers, in registration order.
 * @example
 * const checkers = await getCheckersForProject('/workspace/my-app');
 */
export async function getCheckersForProject(
  projectPath: string,
): Promise<IDependencyChecker[]> {
  const present = await Promise.all(
    allCheckers.map((checker) =>
      pathExists(path.join(projectPath, checker.manifestFile)),
    ),
  );
  return allCheckers.filter((_, index) => present[index]);
}
