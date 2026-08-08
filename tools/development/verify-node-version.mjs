const minimumMinorVersion = 15;
const [majorVersion, minorVersion] = process.versions.node
  .split('.')
  .map(Number);

const isSupported = majorVersion === 24 && minorVersion >= minimumMinorVersion;

if (!isSupported) {
  console.error(
    [
      `Unsupported Node.js version: ${process.version}.`,
      'Omoikane requires Node.js >=24.15.0 <25.',
      'Use the version declared in .node-version for the reference environment.',
    ].join(' ')
  );
  process.exitCode = 1;
}
