'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CommentFormData, commentSchema } from '@/types/dtos';

interface CommentFormProps {
  attractionId: string;
  onSuccess: () => void;
}

export function CommentForm({ attractionId, onSuccess }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  });

  const onSubmit = async (data: CommentFormData) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/attractions/${attractionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('创建评论失败');
      }

      toast.success('评论成功');
      reset();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">评分</label>
        <Input
          type="number"
          min="1"
          max="5"
          step="1"
          {...register('rating', { valueAsNumber: true })}
        />
        {errors.rating && (
          <p className="text-red-500 text-sm mt-1">{errors.rating.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">评论内容</label>
        <Textarea
          {...register('content')}
          className="min-h-[100px]"
          placeholder="分享你的体验..."
        />
        {errors.content && (
          <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">图片URL（可选，用逗号分隔）</label>
        <Input {...register('images')} placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg" />
        {errors.images && (
          <p className="text-red-500 text-sm mt-1">{errors.images.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '提交中...' : '发表评论'}
      </Button>
    </form>
  );
} 