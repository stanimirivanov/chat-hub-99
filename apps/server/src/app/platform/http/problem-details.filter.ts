import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  HttpBoundaryError,
  type HttpProblemDescriptor,
} from './http-boundary-error';
import { ServerTelemetry } from '../observability/server-telemetry.service';

interface HttpRequestProjection {
  readonly url?: string;
  readonly headers: Readonly<
    Record<string, string | readonly string[] | undefined>
  >;
}

interface HttpResponseProjection {
  status: (status: number) => HttpResponseProjection;
  header: (name: string, value: string) => HttpResponseProjection;
  type: (contentType: string) => HttpResponseProjection;
  send: (body: unknown) => void;
}

const requestPath = (url: string | undefined): string =>
  url?.split('?', 1)[0] ?? '';

const internalProblem: HttpProblemDescriptor = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  type: 'https://omoikane.dev/problems/internal-error',
  title: 'The server could not complete the request',
  detail: 'An unexpected server error occurred.',
  code: 'internal_error',
};

const fromHttpException = (
  exception: HttpException
): HttpProblemDescriptor => ({
  status: exception.getStatus(),
  type: 'https://omoikane.dev/problems/http-error',
  title: 'The HTTP request could not be completed',
  detail: 'The request could not be completed.',
  code: 'http_error',
});

/** Renders every server failure through one safe RFC 9457-shaped contract. */
@Injectable()
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  constructor(private readonly telemetry: ServerTelemetry) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<HttpRequestProjection>();
    const response = host.switchToHttp().getResponse<HttpResponseProjection>();
    const problem =
      exception instanceof HttpBoundaryError
        ? exception.problem
        : exception instanceof HttpException
          ? fromHttpException(exception)
          : internalProblem;

    if (problem === internalProblem) {
      const category =
        exception instanceof Error ? exception.name : typeof exception;
      this.logger.error(
        `Unhandled HTTP boundary failure (${category}). Sensitive exception data was omitted.`
      );
    }

    if (problem.authenticate) {
      response.header('WWW-Authenticate', 'Bearer');
    }

    this.telemetry.recordRequestFailure(request, problem.code);

    response
      .status(problem.status)
      .type('application/problem+json')
      .send({
        type: problem.type,
        title: problem.title,
        status: problem.status,
        detail: problem.detail,
        instance: requestPath(request.url),
        code: problem.code,
        requestId: this.telemetry.requestId(request) ?? '',
      });
  }
}
