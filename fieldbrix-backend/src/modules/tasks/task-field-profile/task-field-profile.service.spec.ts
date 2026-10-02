import { TaskFieldProfileService } from './task-field-profile.service';
import type { TaskFieldProfileRepository } from './task-field-profile.repository';

function makeService() {
  const repository = {
    upsert: jest.fn().mockImplementation((payload) => Promise.resolve(payload)),
    upsertForVersion: jest
      .fn()
      .mockImplementation((payload) => Promise.resolve(payload)),
    list: jest.fn().mockResolvedValue({ items: [] }),
  } as unknown as TaskFieldProfileRepository;
  return { service: new TaskFieldProfileService(repository), repository };
}

describe('TaskFieldProfileService', () => {
  it('stores a user-facing vocabulary, reusable mapping, and safe visible columns', async () => {
    const { service, repository } = makeService();
    await service.upsert({
      customerId: 'customer-1',
      workflowId: 'workflow-1',
      entityLabel: ' Work order ',
      columnMapping: {
        externalReferenceId: ' Ticket No. ',
        unknownBackendField: 'Do not save',
      },
      fields: [
        {
          key: 'contract_tier',
          sourceColumn: 'Contract Tier',
          label: ' Contract tier ',
          dataType: 'text',
          searchable: true,
          filterable: true,
        },
      ],
      visibleColumns: ['description', 'contract_tier', 'not_a_real_field'],
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entityLabel: 'Work order',
        columnMapping: { externalReferenceId: 'Ticket No.' },
        visibleColumns: ['number', 'description', 'contract_tier'],
      }),
    );
  });

  it('rejects duplicate custom keys instead of creating an ambiguous dashboard schema', () => {
    const { service } = makeService();
    expect(() =>
      service.upsert({
        customerId: 'customer-1',
        workflowId: 'workflow-1',
        entityLabel: 'Task',
        columnMapping: {},
        fields: [
          {
            key: 'same',
            sourceColumn: 'A',
            label: 'A',
            dataType: 'text',
            searchable: true,
            filterable: false,
          },
          {
            key: 'same',
            sourceColumn: 'B',
            label: 'B',
            dataType: 'text',
            searchable: true,
            filterable: false,
          },
        ],
        visibleColumns: ['number'],
      }),
    ).toThrow('DUPLICATE_TASK_FIELD');
  });
});
