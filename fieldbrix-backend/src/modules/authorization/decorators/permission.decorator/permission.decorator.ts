import { applyDecorators, SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'fieldbrix:permission';
export const PERMISSION_SCOPE_KEY = 'fieldbrix:permission-scope';
export type PermissionScope = 'own' | 'team' | 'branch' | 'all';
export const Permission = (
  permission: string,
  scope: PermissionScope = 'all',
) =>
  applyDecorators(
    SetMetadata(PERMISSION_KEY, permission),
    SetMetadata(PERMISSION_SCOPE_KEY, scope),
  );
