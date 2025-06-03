'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Ranking {
  id: string;
  name: string;
  description: string;
  images: string[];
  count: number;
}

export default function RankingsPage() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'visited' | 'wantToVisit'>('visited');

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/attractions/rankings?type=${type}`);
        if (!response.ok) {
          throw new Error('Failed to fetch rankings');
        }
        const data = await response.json();
        setRankings(data);
      } catch (err) {
        setError('获取排行榜失败');
        console.error('Error fetching rankings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [type]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">景点排行榜</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setType('visited')}
            className={`px-4 py-2 rounded-md ${
              type === 'visited'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            到访人数排行
          </button>
          <button
            onClick={() => setType('wantToVisit')}
            className={`px-4 py-2 rounded-md ${
              type === 'wantToVisit'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            想去人数排行
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {rankings.map((attraction, index) => (
          <Link
            key={attraction.id}
            href={`/attractions/${attraction.id}`}
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white text-xl font-bold rounded-full mr-4">
                {index + 1}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">{attraction.name}</h2>
                <p className="text-gray-600 line-clamp-2 mb-2">{attraction.description}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span>
                    {type === 'visited' ? '到访人数：' : '想去人数：'}
                    {attraction.count}
                  </span>
                </div>
              </div>
              <div className="relative w-24 h-24 ml-4">
                <Image
                  src={attraction.images[0] || '/placeholder.jpg'}
                  alt={attraction.name}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 