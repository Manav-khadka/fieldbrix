import { WorkflowDraftService } from './workflow-draft.service';
import type { WorkflowDraftRepository } from './workflow-draft.repository';

describe('WorkflowDraftService.duplicate', () => {
  it('gives every section, field, and rule a fresh ID and rewrites section references', async () => {
    const source = {
      id: 'source-id',
      name: 'Preventive HVAC Visit',
      description: 'Original',
      revision: 3,
      schema: {
        sections: [{ id: 'sec-1', title: 'Arrival', position: 0 }],
        fields: [
          {
            id: 'field-1',
            key: 'arrival_note',
            sectionId: 'sec-1',
            type: 'TEXT',
          },
        ],
        rules: [
          {
            id: 'rule-1',
            priority: 0,
            conditions: [{ fieldKey: 'arrival_note', operator: 'is_empty' }],
            actions: [{ type: 'set_required', fieldKey: 'arrival_note' }],
          },
        ],
      },
    };
    let createdPayload: Record<string, unknown> | undefined;
    const repo = {
      findById: jest.fn().mockResolvedValue(source),
      create: jest
        .fn()
        .mockImplementation((payload: Record<string, unknown>) => {
          createdPayload = payload;
          return Promise.resolve({ id: 'new-id', ...payload });
        }),
    } as unknown as WorkflowDraftRepository;

    const service = new WorkflowDraftService(repo);
    const result = await service.duplicate('source-id', 'Copy name');

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock, not a bound instance method
    expect(repo.findById).toHaveBeenCalledWith('source-id');
    expect(createdPayload?.name).toBe('Copy name');
    const schema = createdPayload?.schema as {
      sections: Array<{ id: string }>;
      fields: Array<{ id: string; sectionId: string; key: string }>;
      rules: Array<{ id: string }>;
    };
    expect(schema.sections[0].id).not.toBe('sec-1');
    expect(schema.fields[0].id).not.toBe('field-1');
    expect(schema.fields[0].sectionId).toBe(schema.sections[0].id);
    expect(schema.fields[0].key).toBe('arrival_note');
    expect(schema.rules[0].id).not.toBe('rule-1');
    expect(result.id).toBe('new-id');
  });

  it('defaults the name to "<source name> copy" when none is given', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({
        id: 'source-id',
        name: 'Preventive HVAC Visit',
        description: '',
        schema: {},
      }),
      create: jest
        .fn()
        .mockImplementation((payload: Record<string, unknown>) =>
          Promise.resolve({ id: 'new-id', ...payload }),
        ),
    } as unknown as WorkflowDraftRepository;

    const service = new WorkflowDraftService(repo);
    await service.duplicate('source-id');

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock, not a bound instance method
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Preventive HVAC Visit copy' }),
    );
  });
});
