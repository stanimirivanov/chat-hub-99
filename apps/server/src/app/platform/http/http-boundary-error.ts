/** Safe, stable problem information carried from a transport boundary failure. */
export interface HttpProblemDescriptor {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly detail: string;
  readonly code: string;
  readonly authenticate?: boolean;
}

/** Internal exception whose public payload contains no provider details. */
export class HttpBoundaryError extends Error {
  override readonly name = 'HttpBoundaryError';

  constructor(readonly problem: HttpProblemDescriptor) {
    super(problem.detail);
  }
}

export const authenticationRequired = (): HttpBoundaryError =>
  new HttpBoundaryError({
    status: 401,
    type: 'https://omoikane.dev/problems/authentication-required',
    title: 'Authentication is required',
    detail: 'A valid bearer access token is required.',
    code: 'authentication_required',
    authenticate: true,
  });

export const authenticationUnavailable = (): HttpBoundaryError =>
  new HttpBoundaryError({
    status: 503,
    type: 'https://omoikane.dev/problems/dependency-unavailable',
    title: 'A required service is unavailable',
    detail:
      'The request cannot be completed while authentication is unavailable.',
    code: 'dependency_unavailable',
  });
