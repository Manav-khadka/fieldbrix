import { normalizeTaskRow } from './imports.service';

describe('normalizeTaskRow — explicit dynamic task mapping', () => {
  const mapping = {
    externalReferenceId: 'Ticket No.',
    contactPhone: 'Primary Mobile',
    latitude: 'GPS Y',
    longitude: 'GPS X',
    description: 'Complaint Summary',
  };

  it('maps only the selected core fields and preserves every other heading in customFields', () => {
    const result = normalizeTaskRow(
      {
        customerId: 'customer-1',
        workflowVersionId: 'version-1',
        'Ticket No.': 'T-9001',
        'Primary Mobile': 96890000000,
        'GPS Y': '23.588',
        'GPS X': '58.3829',
        'Complaint Summary': 'Water leak',
        'Account Name': 'Al Noor',
        'Contract Tier': 'Gold',
      },
      mapping,
    );

    expect(result).toEqual(
      expect.objectContaining({
        customerId: 'customer-1',
        workflowVersionId: 'version-1',
        externalReferenceId: 'T-9001',
        contactPhone: '96890000000',
        latitude: 23.588,
        longitude: 58.3829,
        description: 'Water leak',
      }),
    );
    expect(result.customFields).toEqual({
      'Account Name': 'Al Noor',
      'Contract Tier': 'Gold',
    });
  });

  it('uses field definitions to retain typed JSON values under stable keys', () => {
    const result = normalizeTaskRow(
      {
        'Ticket No.': 'T-1',
        'Primary Mobile': '9000',
        'GPS Y': 23,
        'GPS X': 58,
        'Asset Count': '12',
        'VIP Customer': 'yes',
      },
      mapping,
      [
        {
          key: 'asset_count',
          sourceColumn: 'Asset Count',
          label: 'Assets',
          dataType: 'number',
          searchable: true,
          filterable: true,
        },
        {
          key: 'vip_customer',
          sourceColumn: 'VIP Customer',
          label: 'VIP',
          dataType: 'boolean',
          searchable: false,
          filterable: true,
        },
      ],
    );

    expect(result.customFields).toEqual({
      asset_count: 12,
      vip_customer: true,
    });
  });

  it('keeps alias detection as a backward-compatible fallback for direct API callers', () => {
    const result = normalizeTaskRow({
      task_id: 'LEGACY-1',
      mobile: '9000',
      lat: 23,
      lng: 58,
      legacy_note: 'preserved',
    });
    expect(result.externalReferenceId).toBe('LEGACY-1');
    expect(result.customFields).toEqual({ legacy_note: 'preserved' });
  });
});
