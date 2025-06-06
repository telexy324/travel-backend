import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { Comment, CommentsResponse } from '@/types/responses';
import { commentSchema } from '@/types/dtos';
import { auth } from '@/auth';

type PrismaComment = {
  id: string;
  content: string;
  rating: number;
  images: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  attractionId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  attraction: {
    id: string;
    name: string;
  };
};

type CommentRating = {
  rating: number;
};

function formatComment(comment: PrismaComment): Comment {
  return {
    id: comment.id,
    content: comment.content,
    rating: comment.rating,
    images: comment.images ? comment.images.split(',') : [],
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    user: comment.user,
    attraction: comment.attraction,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '10');
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { attractionId: params.id },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          attraction: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }) as Promise<PrismaComment[]>,
      prisma.comment.count({
        where: { attractionId: params.id },
      }),
    ]);

    const formattedComments = comments.map(formatComment);

    const response: CommentsResponse = {
      success: true,
      data: {
        items: formattedComments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    return successResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return errorResponse('未授权', 401);
    }

    const attraction = await prisma.attraction.findUnique({
      where: { id: params.id },
    });

    if (!attraction) {
      return errorResponse('景点不存在', 404);
    }

    const json = await request.json();
    const data = commentSchema.parse(json);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comment = await prisma.$transaction(async (tx: any) => {
      const newComment = await tx.comment.create({
        data: {
          ...data,
          images: data.images ? data.images.join(',') : null,
          attractionId: params.id,
          userId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          attraction: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 更新景点的平均评分
      const comments = await tx.comment.findMany({
        where: { attractionId: params.id },
        select: { rating: true },
      }) as CommentRating[];

      const averageRating = comments.reduce((acc: number, curr: CommentRating) => acc + curr.rating, 0) / comments.length;

      await tx.attraction.update({
        where: { id: params.id },
        data: { rating: averageRating },
      });

      return newComment;
    }) as PrismaComment;

    return successResponse(formatComment(comment), '评论成功');
  } catch (error) {
    return handleApiError(error);
  }
} 