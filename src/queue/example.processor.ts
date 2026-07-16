import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DEFAULT_QUEUE } from './queue.constants';

@Processor(DEFAULT_QUEUE)
export class ExampleProcessor extends WorkerHost {
  private readonly logger = new Logger(ExampleProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job "${job.name}" (${job.id})`);
    // Dispatch on job.name and handle job.data here.
    await Promise.resolve();
  }
}
