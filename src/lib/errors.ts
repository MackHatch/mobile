export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const data = body as { error?: { code?: string; message?: string; details?: unknown } };
    const err = data?.error;
    return new ApiError(
      status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? `Request failed with status ${status}`,
      err?.details
    );
  }
}
