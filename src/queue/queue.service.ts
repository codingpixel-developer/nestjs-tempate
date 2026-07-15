import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job, JobsOptions, Queue } from 'bullmq';
import { DEFAULT_QUEUE } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(@InjectQueue(DEFAULT_QUEUE) private readonly queue: Queue) {}

  enqueue<T>(name: string, data: T, opts?: JobsOptions): Promise<Job> {
    return this.queue.add(name, data, opts);
  }
}
