'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Attraction {
  id: string;
  name: string;
  description: string;
  images: string[];
  _count: {
    visitedBy: number;
    wantToVisitBy: number;
  };
}

// 缓存数据
let cachedAttractions: Attraction[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export function AttractionsList() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttractions = useCallback(async () => {
    // 检查缓存是否有效
    const now = Date.now();
    if (cachedAttractions && now - lastFetchTime < CACHE_DURATION) {
      setAttractions(cachedAttractions);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/attractions');
      if (!response.ok) {
        throw new Error('Failed to fetch attractions');
      }
      const data = await response.json();
      // 更新缓存
      cachedAttractions = data;
      lastFetchTime = now;
      setAttractions(data);
    } catch (err) {
      setError('获取景点列表失败');
      console.error('Error fetching attractions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttractions();
  }, [fetchAttractions]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={fetchAttractions}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {attractions.map((attraction) => (
        <Link
          key={attraction.id}
          href={`/attractions/${attraction.id}`}
          className="block p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="relative h-48 mb-3 rounded-lg overflow-hidden">
            <Image
              src={attraction.images[0] || '/placeholder.jpg'}
              alt={attraction.name}
              fill
              className="object-cover"
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{attraction.name}</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{attraction.description}</p>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span className="mr-4">
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
        </Link>
      ))}
    </div>
  );
} 