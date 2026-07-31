import { Injectable } from '@angular/core';
import { Effect, Either } from 'effect';
import {
  getCurrentProfile,
  listCurrentProfiles,
  type GetCurrentProfileError,
  type ListCurrentProfilesError,
} from '@chat-hub/application/profile';
import type { Profile, ProfileId } from '@chat-hub/domain/profile';
import { applicationRuntime } from '../effect/application-runtime';

/**
 * Angular execution boundary for current-profile application programs.
 *
 * The service owns Effect execution only. Profile validation, lookup, and
 * failure semantics remain in the application and infrastructure libraries.
 */
@Injectable({
  providedIn: 'root',
})
export class ProfileApplicationService {
  /**
   * Loads the profile belonging to an authenticated session user.
   *
   * The session identifier enters the use case as unknown boundary data and is
   * validated before repository access. Expected failures are returned as an
   * `Either`, so the feature store does not handle rejected Promises.
   */
  getCurrentProfile(
    userId: string
  ): Promise<Either.Either<Profile, GetCurrentProfileError>> {
    return applicationRuntime.runPromise(
      getCurrentProfile({ userId }).pipe(Effect.either)
    );
  }

  /**
   * Loads current profiles for message-author identities in one batch.
   *
   * RLS may omit identities that are not visible to the current session.
   */
  listCurrentProfiles(
    profileIds: readonly ProfileId[]
  ): Promise<Either.Either<readonly Profile[], ListCurrentProfilesError>> {
    return applicationRuntime.runPromise(
      listCurrentProfiles({ profileIds }).pipe(Effect.either)
    );
  }
}
