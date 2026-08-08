import {
  commandFailure,
  dockerCommand,
  expectedPnpmVersion,
  pnpmCommand,
  runCommand,
  verifyNodeVersionPath,
} from './local-toolchain.mjs';

let isReady = true;

const report = (state, service, detail) => {
  console.log(`[${state}] ${service}: ${detail}`);
};

console.log('Omoikane local platform status');

const nodeResult = runCommand(process.execPath, [verifyNodeVersionPath]);
if (nodeResult.status === 0) {
  report('ok', 'Node.js', `${process.version} is supported`);
} else {
  isReady = false;
  report('error', 'Node.js', commandFailure(nodeResult));
}

const pnpmResult = runCommand(pnpmCommand, ['--version']);
const actualPnpmVersion = (pnpmResult.stdout ?? '').trim();
if (pnpmResult.status === 0 && actualPnpmVersion === expectedPnpmVersion) {
  report('ok', 'pnpm', actualPnpmVersion);
} else {
  isReady = false;
  report(
    'error',
    'pnpm',
    pnpmResult.status === 0
      ? `expected ${expectedPnpmVersion}, found ${actualPnpmVersion}`
      : commandFailure(pnpmResult)
  );
}

const dockerResult = runCommand(dockerCommand, [
  'version',
  '--format',
  '{{.Server.Version}}',
]);
const dockerVersion = (dockerResult.stdout ?? '').trim();
if (dockerResult.status === 0 && dockerVersion.length > 0) {
  report('ok', 'Docker', `engine ${dockerVersion}`);

  const supabaseResult = runCommand(pnpmCommand, [
    'exec',
    'supabase',
    'status',
  ]);
  if (supabaseResult.status === 0) {
    report('ok', 'Supabase', 'local stack is running');
  } else {
    isReady = false;
    report('error', 'Supabase', 'local stack is not running');
  }
} else {
  isReady = false;
  report('error', 'Docker', commandFailure(dockerResult));
  report('skip', 'Supabase', 'Docker engine is unavailable');
}

if (!isReady) {
  console.error(
    'Local platform is not ready. Resolve the errors above and run pnpm dev:status again.'
  );
  process.exitCode = 1;
}
