import { createAiWorker } from './create-ai-worker';

const bootstrap = async (): Promise<void> => {
  const worker = createAiWorker();
  let stopping = false;
  const stop = (): void => {
    if (stopping) {
      return;
    }
    stopping = true;
    void worker
      .stop()
      .catch((cause: unknown) => {
        console.error(
          cause instanceof Error
            ? cause.message
            : 'Unknown AI worker shutdown failure.'
        );
        process.exitCode = 1;
      })
      .finally(() => {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
      });
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  await worker.start();
};

void bootstrap().catch((cause: unknown) => {
  console.error(
    cause instanceof Error
      ? cause.message
      : 'Unknown AI worker startup failure.'
  );
  process.exitCode = 1;
});
