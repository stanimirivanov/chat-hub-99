import { Effect, Schema } from 'effect';

export type EmailRedirectRequestField = 'email' | 'redirectUrl';

const EmailSchema = Schema.Trim.pipe(Schema.nonEmptyString());
const RedirectUrlSchema = Schema.Trim.pipe(
  Schema.nonEmptyString(),
  Schema.pattern(/^https?:\/\/[^/\s?#]+(?:[/?#]\S*)?$/)
);

const readInputField = (
  input: unknown,
  field: EmailRedirectRequestField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

/**
 * Decodes the email and callback shared by outbound authentication emails.
 *
 * The helper owns only structural normalization. Each use case supplies its
 * own typed field failure so password recovery and account confirmation keep
 * distinct error vocabularies.
 */
export const decodeEmailRedirectRequest = <Error>(
  input: unknown,
  onInvalidField: (field: EmailRedirectRequestField) => Error
): Effect.Effect<
  { readonly email: string; readonly redirectUrl: string },
  Error
> =>
  Effect.gen(function* () {
    const email = yield* Schema.decodeUnknown(EmailSchema)(
      readInputField(input, 'email')
    ).pipe(Effect.mapError(() => onInvalidField('email')));
    const redirectUrl = yield* Schema.decodeUnknown(RedirectUrlSchema)(
      readInputField(input, 'redirectUrl')
    ).pipe(Effect.mapError(() => onInvalidField('redirectUrl')));

    return { email, redirectUrl };
  });
