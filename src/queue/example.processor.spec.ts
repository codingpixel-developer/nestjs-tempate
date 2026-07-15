import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ExampleProcessor } from './example.processor';

describe('ExampleProcessor', () => {
  it('logs the job it processes', async () => {
    const processor = new ExampleProcessor();
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await processor.process({ name: 'send-email', id: '42' } as unknown as Job);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('send-email'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('42'));
  });
});
