import Bull from 'bull';
import { bullRedisConfig } from './src/config/redis.config.js';

const testQueue = new Bull('bull-test-queue', bullRedisConfig);

// Processor

testQueue.process(async (job) => {
  console.log('>>> TEST JOB PICKED UP:', job.id, job.data);
  return { result: 'success', data: job.data };
});

testQueue.on('completed', (job, result) => {
  console.log('>>> TEST JOB COMPLETED:', job.id, result);
});

testQueue.on('failed', (job, err) => {
  console.error('>>> TEST JOB FAILED:', job.id, err);
});

testQueue.on('error', (err) => {
  console.error('>>> TEST QUEUE ERROR:', err);
});

// Add a test job
(async () => {
  console.log('>>> Adding test job...');
  await testQueue.add({ foo: 'bar', time: Date.now() });
})();
