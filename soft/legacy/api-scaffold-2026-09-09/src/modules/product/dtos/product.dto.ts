import { Transform } from 'class-transformer';
import { trimIfString } from '../../../common/utils/trim-if-string.js';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ProductDto {
  @Transform(trimIfString)
  @IsString({ message: 'VALIDATION_EMAIL_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'VALIDATION_EMAIL_REQUIRED' })
  @MaxLength(254, { message: 'VALIDATION_EMAIL_MAX_LENGTH' })
  name!: string;

  @IsString({ message: 'VALIDATION_PASSWORD_MUST_BE_STRING' })
  @IsNotEmpty({ message: 'VALIDATION_PASSWORD_REQUIRED' })
  @MinLength(8, { message: 'VALIDATION_PASSWORD_MIN_LENGTH' })
  @MaxLength(72, { message: 'VALIDATION_PASSWORD_MAX_LENGTH' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'VALIDATION_PASSWORD_INVALID',
  })
  password!: string;
}
