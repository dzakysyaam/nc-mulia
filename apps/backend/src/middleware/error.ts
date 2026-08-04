import type { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  errors?: Record<string, string[]>;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Mask Prisma / database connector errors — never expose internals to client
  const isConnectorError = err.message?.includes('prisma.') ||
    err.message?.includes('ConnectorError') ||
    err.message?.includes('Data truncated') ||
    err.message?.includes('MySQL Error') ||
    err.message?.includes('QueryError') ||
    err.message?.includes('Unique constraint') ||
    err.message?.includes('Foreign key constraint');

  if (isConnectorError) {
    console.error('[error] DB error:', err.message?.slice(0, 200));
    res.status(500).json({
      success: false,
      message: 'Data BMI belum berhasil disimpan. Silakan coba kembali.',
    });
    return;
  }

  res.status(err.statusCode ?? 500).json({
    success: false,
    message: err.message ?? 'Internal server error',
    errors: err.errors,
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Resource not found.' });
}

export function parseErrors(err: unknown): Record<string, string[]> | undefined {
  if (err instanceof Error && 'issues' in err) {
    const issues = (err as { issues: { path: string[]; message: string }[] }).issues;
    return Object.fromEntries(issues.map(i => [i.path.join('.'), [i.message]]));
  }
  return undefined;
}
