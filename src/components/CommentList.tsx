'use client';

import { useQuery } from '@tanstack/react-query';
import { CommentResponse, CommentsResponse } from '@/types/responses';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CommentListProps {
  attractionId: string;
}

export function CommentList({ attractionId }: CommentListProps) {
  const { data, isLoading } = useQuery<CommentsResponse>({
    queryKey: ['comments', attractionId],
    queryFn: async () => {
      const response = await fetch(`/api/attractions/${attractionId}/comments`);
      if (!response.ok) {
        throw new Error('获取评论失败');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return <div>加载中...</div>;
  }

  const comments = data?.data.items ?? [];

  if (comments.length === 0) {
    return <div className="text-center text-gray-500 py-8">暂无评论</div>;
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}

function CommentItem({ comment }: { comment: CommentResponse }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {comment.user.image ? (
            <img
              src={comment.user.image}
              alt={comment.user.name ?? '用户头像'}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">
                {(comment.user.name ?? '用户')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <div className="font-medium">{comment.user.name ?? '匿名用户'}</div>
            <div className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: zhCN,
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-yellow-500">★</span>
          <span>{comment.rating}</span>
        </div>
      </div>
      <div className="mt-3 text-gray-700">{comment.content}</div>
      {comment.images && comment.images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {comment.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`评论图片 ${index + 1}`}
              className="w-full h-24 object-cover rounded"
            />
          ))}
        </div>
      )}
    </div>
  );
} 