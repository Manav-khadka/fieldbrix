import { IsIn, IsString } from 'class-validator';
export class PermissionGrantDto { @IsString() key!: string; @IsIn(['own', 'team', 'branch', 'all']) scope!: 'own' | 'team' | 'branch' | 'all'; }
