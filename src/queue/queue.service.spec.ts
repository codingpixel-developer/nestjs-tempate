import { QueueService } from './queue.service';

describe('QueueService', () => {
  let queue: { add: jest.Mock };
  let service: QueueService;

  beforeEach(() => {
    queue = { add: jest.fn().mockResolvedValue({ id: '1' }) };
    service = new QueueService(queue as never);
  });

  it('enqueues a job with its name and data', async () => {
    await service.enqueue('send-email', { to: 'a@b.c' });
    expect(queue.add).toHaveBeenCalledWith(
      'send-email',
      { to: 'a@b.c' },
      undefined,
    );
  });

  it('passes job options through', async () => {
    await service.enqueue('report', { id: 1 }, { delay: 1000 });
    expect(queue.add).toHaveBeenCalledWith(
      'report',
      { id: 1 },
      { delay: 1000 },
    );
  });
});
