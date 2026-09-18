/**
 * Output buffer ceiling for the child processes the checkers shell out to.
 *
 * Node's `execSync` defaults `maxBuffer` to 1 MiB. When a checker's stdout
 * exceeds that, Node kills the child and reports `ENOBUFS`, which surfaces here
 * as an opaque "Execution failed for <tool>: spawnSync /bin/sh ENOBUFS" rather
 * than anything the caller can act on. Generated SDKs routinely run to
 * thousands of files, and a JSON report over a tree that size clears 1 MiB
 * easily, so the default turns a healthy repository into a hard CI failure
 * purely on size.
 *
 * 64 MiB is far above any report these tools realistically emit while still
 * bounding a runaway process. The buffer is allocated lazily by Node, so a
 * generous ceiling costs nothing for the common small-output case.
 */
export const MAX_OUTPUT_BUFFER = 64 * 1024 * 1024;
