import { IsString, MinLength } from 'class-validator';
export class DeviceRegistrationDto { @IsString() @MinLength(2) name!: string; }
