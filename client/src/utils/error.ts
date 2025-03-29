import { AxiosError } from 'axios';

export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

export function isAxiosError(error: unknown): error is AxiosError {
  return error instanceof AxiosError;
}

export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
}

export function isUnauthorizedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 403;
}

export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

export function isValidationError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 422;
}

export function isServerError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status && error.response.status >= 500;
} 