import {
  commandFailure,
  dockerCommand,
  expectedPnpmVersion,
  pnpmCommand,
  runCommand,
  verifyNodeVersionPath,
} from './local-toolchain.mjs';

const fail = (service, detail) => {
  console.error(`[error] ${service}: ${detail}`);
  process.exit(1);
};

const runStep = (description, command, args) => {
  console.log(`\n${description}`);
  const result = runCommand(command, args, 'inherit');

  if (result.status !== 0) {
    fail(
      description,
      result.error?.message ?? `exited with status ${result.status}`
    );
  }
};

/**
 * Supabase project identities used by this repository before rebranding.
 *
 * Their containers may still own the standard local ports after a developer
 * updates an existing clone. Stopping those exact stacks is recoverable and
 * preserves their Docker volumes; unrelated containers are never touched.
 */
const legacySupabaseProjectIds = ['chat-hub-99'];

const stopLegacySupabaseStacks = () => {
  const containersResult = runCommand(dockerCommand, [
    'ps',
    '--all',
    '--format',
    '{{.Names}}',
  ]);

  if (containersResult.status !== 0) {
    fail('Inspecting Docker containers', commandFailure(containersResult));
  }

  const containerNames = (containersResult.stdout ?? '')
    .split(/\r?\n/u)
    .map((name) => name.trim())
    .filter(Boolean);

  for (const projectId of legacySupabaseProjectIds) {
    const suffix = `_${projectId}`;
    const ownsContainers = containerNames.some(
      (name) => name.startsWith('supabase_') && name.endsWith(suffix)
    );

    if (ownsContainers) {
      runStep(
        `Stopping legacy local Supabase project ${projectId}`,
        pnpmCommand,
        ['exec', 'supabase', 'stop', '--project-id', projectId]
      );
    }
  }
};

console.log('Bootstrapping the Omoikane local platform');

const nodeResult = runCommand(process.execPath, [verifyNodeVersionPath]);
if (nodeResult.status !== 0) {
  fail('Node.js', commandFailure(nodeResult));
}
console.log(`[ok] Node.js: ${process.version} is supported`);

const pnpmResult = runCommand(pnpmCommand, ['--version']);
const actualPnpmVersion = (pnpmResult.stdout ?? '').trim();
if (pnpmResult.status !== 0) {
  fail('pnpm', commandFailure(pnpmResult));
}
if (actualPnpmVersion !== expectedPnpmVersion) {
  fail(
    'pnpm',
    `expected ${expectedPnpmVersion}, found ${actualPnpmVersion || 'unknown'}`
  );
}
console.log(`[ok] pnpm: ${actualPnpmVersion}`);

const dockerResult = runCommand(dockerCommand, [
  'version',
  '--format',
  '{{.Server.Version}}',
]);
const dockerVersion = (dockerResult.stdout ?? '').trim();
if (dockerResult.status !== 0 || dockerVersion.length === 0) {
  fail('Docker', commandFailure(dockerResult));
}
console.log(`[ok] Docker: engine ${dockerVersion}`);

stopLegacySupabaseStacks();

runStep('Installing locked dependencies', pnpmCommand, [
  'install',
  '--frozen-lockfile',
]);
runStep('Starting local infrastructure', pnpmCommand, ['dev:up']);

console.log(
  '\nOmoikane is bootstrapped. Run pnpm dev:status, then pnpm start.'
);
