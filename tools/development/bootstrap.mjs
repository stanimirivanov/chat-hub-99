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

runStep('Installing locked dependencies', pnpmCommand, [
  'install',
  '--frozen-lockfile',
]);
runStep('Starting local infrastructure', pnpmCommand, ['dev:up']);

console.log(
  '\nOmoikane is bootstrapped. Run pnpm dev:status, then pnpm start.'
);
