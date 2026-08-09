import type { AuthenticatedRequestIdentity } from '@omoikane/application/authentication';

const REQUEST_IDENTITY = Symbol('REQUEST_IDENTITY');

export interface RequestWithIdentity {
  readonly headers: Readonly<
    Record<string, string | readonly string[] | undefined>
  >;
  readonly [REQUEST_IDENTITY]?: AuthenticatedRequestIdentity;
}

/** Attaches a validated identity as immutable, non-enumerable request state. */
export const attachRequestIdentity = (
  request: RequestWithIdentity,
  identity: AuthenticatedRequestIdentity
): void => {
  Object.defineProperty(request, REQUEST_IDENTITY, {
    value: Object.freeze({ ...identity }),
    enumerable: false,
    configurable: false,
    writable: false,
  });
};

/** Retrieves the identity previously established by the global guard. */
export const getRequestIdentity = (
  request: RequestWithIdentity
): AuthenticatedRequestIdentity | undefined => request[REQUEST_IDENTITY];
