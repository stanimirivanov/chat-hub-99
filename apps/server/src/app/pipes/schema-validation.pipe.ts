import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Schema, Either } from 'effect';

@Injectable()
export class SchemaValidationPipe implements PipeTransform {
  constructor(private readonly schema: Schema.Schema<any, any>) {}

  transform(value: unknown) {
    const result = Schema.decodeUnknownEither(this.schema)(value);

    if (Either.isLeft(result)) {
      const errorDetails = JSON.stringify(result.left, null, 2);
      throw new BadRequestException({
        message: 'Payload validation failed',
        error: errorDetails,
      });
    }

    return result.right;
  }
}
