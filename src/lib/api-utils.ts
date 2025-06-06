import { NextResponse } from 'next/server';
import { BaseResponse, baseResponseSchema } from '@/types/responses';
import { ZodError } from 'zod';

export function successResponse<T>(data: T, message?: string): NextResponse<BaseResponse & { data: T }> {
  return NextResponse.json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(message: string, status = 400): NextResponse<BaseResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse<BaseResponse> {
  if (error instanceof ZodError) {
    return errorResponse(error.errors.map(e => e.message).join(', '));
  }

  if (error instanceof Error) {
    return errorResponse(error.message);
  }

  return errorResponse('未知错误');
}

export function validateResponse<T>(data: unknown, schema: any): T {
  return schema.parse(data);
} 