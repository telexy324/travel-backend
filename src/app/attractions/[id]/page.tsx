'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

interface Attraction {
  id: string;
  name: string;
  description: string;
  images: string[];
  location: {
    coordinates: [number, number];
  };
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      image: string;
    };
  }>;
  _count: {
    visitedBy: number;
    wantToVisitBy: number;
  };
}

export default function AttractionDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [attraction, setAttraction] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAttraction = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/attractions/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch attraction');
        }
        const data = await response.json();
        setAttraction(data);
      } catch (err) {
        setError('获取景点详情失败');
        console.error('Error fetching attraction:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttraction();
  }, [params.id]);

  const handleAction = async (action: 'visit' | 'wantToVisit') => {
    if (!session) {
      // 处理未登录状态
      return;
    }

    try {
      const response = await fetch(`/api/attractions/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // 刷新景点数据
      const updatedResponse = await fetch(`/api/attractions/${params.id}`);
      const updatedData = await updatedResponse.json();
      setAttraction(updatedData);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !comment.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/attractions/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: comment }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      // 刷新景点数据
      const updatedResponse = await fetch(`/api/attractions/${params.id}`);
      const updatedData = await updatedResponse.json();
      setAttraction(updatedData);
      setComment('');
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !attraction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error || '景点不存在'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* 图片轮播 */}
      <div className="relative h-96 mb-8 rounded-lg overflow-hidden">
        <Image
          src={attraction.images[0] || '/placeholder.jpg'}
          alt={attraction.name}
          fill
          className="object-cover"
        />
      </div>

      {/* 景点信息 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{attraction.name}</h1>
        <p className="text-gray-600 mb-4">{attraction.description}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>
            <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {attraction._count.visitedBy} 人到访
          </span>
          <span>
            <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {attraction._count.wantToVisitBy} 人想去
          </span>
        </div>
      </div>

      {/* 用户操作按钮 */}
      {session && (
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => handleAction('visit')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            标记为已到访
          </button>
          <button
            onClick={() => handleAction('wantToVisit')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            标记为想去
          </button>
        </div>
      )}

      {/* 评论区域 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">评论</h2>
        {session ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="写下你的评论..."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <button
              type="submit"
              disabled={submitting || !comment.trim()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '提交中...' : '发表评论'}
            </button>
          </form>
        ) : (
          <p className="text-gray-500 mb-6">请登录后发表评论</p>
        )}

        <div className="space-y-4">
          {attraction.comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 pb-4">
              <div className="flex items-center mb-2">
                <Image
                  src={comment.user.image || '/default-avatar.png'}
                  alt={comment.user.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <div className="ml-2">
                  <p className="font-medium">{comment.user.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-gray-700">{comment.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 