import { BadRequestException } from '@nestjs/common';
import { WorkflowDraftService } from './workflow-draft.service';
import type { WorkflowDraftRepository } from './workflow-draft.repository';
import type { CreateFieldDto } from './workflow.dto';

function makeService(existingFields: Array<Record<string, unknown>> = []) {
  const repo = {
    findById: jest.fn().mockResolvedValue({
      id: 'workflow-1',
      revision: 1,
      schema: { fields: existingFields },
    }),
    addToSchema: jest
      .fn()
      .mockImplementation(
        (
          _id: string,
          _key: string,
          value: Record<string, unknown>,
          rev: number,
        ) => Promise.resolve({ ...value, revision: rev }),
      ),
  } as unknown as WorkflowDraftRepository;
  return { service: new WorkflowDraftService(repo), repo };
}

describe('WorkflowDraftService.addField', () => {
  it('rejects a field key that already exists on the workflow', async () => {
    const { service } = makeService([{ key: 'arrival_note', type: 'TEXT' }]);
    const dto: CreateFieldDto = {
      key: 'arrival_note',
      type: 'TEXT',
      label: 'Arrival note',
    };
    await expect(service.addField('workflow-1', dto)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.addField('workflow-1', dto)).rejects.toThrow(
      /DUPLICATE_FIELD_KEY/,
    );
  });

  it('rejects a label longer than 200 characters', async () => {
    const { service } = makeService();
    const dto: CreateFieldDto = {
      key: 'note',
      type: 'TEXT',
      label: 'x'.repeat(201),
    };
    await expect(service.addField('workflow-1', dto)).rejects.toThrow(
      /FIELD_LABEL_TOO_LONG/,
    );
  });

  it('rejects help text longer than 1000 characters', async () => {
    const { service } = makeService();
    const dto: CreateFieldDto = {
      key: 'note',
      type: 'TEXT',
      label: 'Note',
      help: 'x'.repeat(1001),
    };
    await expect(service.addField('workflow-1', dto)).rejects.toThrow(
      /FIELD_HELP_TOO_LONG/,
    );
  });

  it('rejects duplicate option values for a choice field', async () => {
    const { service } = makeService();
    const dto: CreateFieldDto = {
      key: 'status',
      type: 'SINGLE_CHOICE',
      label: 'Status',
      config: {
        options: [
          { value: 'ok', label: 'OK' },
          { value: 'ok', label: 'Also OK' },
        ],
      },
    };
    await expect(service.addField('workflow-1', dto)).rejects.toThrow(
      /DUPLICATE_FIELD_OPTION_VALUE/,
    );
  });

  it('accepts a well-formed choice field with unique option values', async () => {
    const { service, repo } = makeService();
    const dto: CreateFieldDto = {
      key: 'status',
      type: 'SINGLE_CHOICE',
      label: 'Status',
      config: {
        options: [
          { value: 'ok', label: 'OK' },
          { value: 'broken', label: 'Broken' },
        ],
      },
    };
    await service.addField('workflow-1', dto);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock, not a bound instance method
    expect(repo.addToSchema).toHaveBeenCalledWith(
      'workflow-1',
      'fields',
      expect.objectContaining({ key: 'status' }),
      1,
    );
  });
});
