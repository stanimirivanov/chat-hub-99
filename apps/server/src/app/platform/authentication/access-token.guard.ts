import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Either } from 'effect';
import {
  validateAccessToken,
  type AccessTokenValidationError,
} from '@omoikane/application/authentication';
import { ServerEffectRuntime } from '../effect-runtime/server-effect-runtime.service';
import {
  authenticationRequired,
  authenticationUnavailable,
} from '../http/http-boundary-error';
import { PUBLIC_ROUTE } from '../http/public-route';
import {
  attachRequestIdentity,
  type RequestWithIdentity,
} from './request-identity';

interface ResponseHeaders {
  readonly header: (name: string, value: string) => unknown;
}

const bearerToken = (
  header: string | readonly string[] | undefined
): string | undefined => {
  if (typeof header !== 'string') {
    return undefined;
  }

  const match = /^Bearer\s+(\S+)$/iu.exec(header.trim());
  return match?.[1];
};

const mapValidationFailure = (error: AccessTokenValidationError): never => {
  if (error._tag === 'InvalidAccessTokenError') {
    throw authenticationRequired();
  }

  throw authenticationUnavailable();
};

/** Deny-by-default HTTP boundary that establishes one immutable request identity. */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly runtime: ServerEffectRuntime
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithIdentity>();
    const token = bearerToken(request.headers['authorization']);
    const result = await this.runtime.runRequestEither(
      request,
      'authentication.validate',
      validateAccessToken(token)
    );

    const identity = Either.match(result, {
      onLeft: mapValidationFailure,
      onRight: (value) => value,
    });

    attachRequestIdentity(request, identity);
    context
      .switchToHttp()
      .getResponse<ResponseHeaders>()
      .header('Cache-Control', 'private, no-store');
    return true;
  }
}
