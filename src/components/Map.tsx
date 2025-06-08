'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useQuery } from '@tanstack/react-query';

interface Location {
  geo: {
    latitude: number;
    longitude: number;
  };
}

interface Attraction {
  id: string;
  name: string;
  description: string;
  images: string[];
  location: Location;
  _count: {
    visitedBy: number;
    wantToVisitBy: number;
  };
}

interface AttractionsResponse {
  success: boolean;
  message?: string;
  data: {
    items: Attraction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface MapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
}

// 获取景点数据的函数
async function fetchAttractions(): Promise<Attraction[]> {
  try {
    const response = await fetch('/api/attractions');
    if (!response.ok) {
      throw new Error('获取景点数据失败');
    }
    const data: AttractionsResponse = await response.json();
    if (!data.success || !data.data?.items) {
      throw new Error('景点数据格式错误');
    }
    return data.data.items;
  } catch (error) {
    console.error('获取景点数据失败:', error);
    return [];
  }
}

export function Map({ initialCenter = [116.397428, 39.90923], initialZoom = 12 }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // 使用 React Query 获取景点数据
  const { data: attractions = [], error } = useQuery<Attraction[]>({
    queryKey: ['attractions'],
    queryFn: fetchAttractions,
  });

  useEffect(() => {
    if (!mapContainer.current) return;

    // 初始化地图
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/basic/style.json?key=HGQGbAPTH9olP2dorNgi', // 使用 MapLibre 的演示样式
      center: initialCenter,
      zoom: initialZoom,
    });

    // 添加导航控件
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // 清理函数
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [initialCenter, initialZoom]);

  // 添加景点标记
  useEffect(() => {
    if (!map.current) return;

    // 清除现有标记
    const markers = document.getElementsByClassName('marker');
    while (markers[0]) {
      markers[0].remove();
    }

    // 添加新标记
    attractions.forEach((attraction) => {
      const { location, name, id, description, images, _count } = attraction;
      
      // 检查 location 是否存在
      if (!location?.geo) {
        console.warn(`Missing location data for attraction: ${name}`);
        return;
      }

      const coordinates: [number, number] = [location.geo.longitude, location.geo.latitude];

      // 创建标记元素
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundImage = 'url(/marker.png)';
      el.style.backgroundSize = 'cover';
      el.style.cursor = 'pointer';

      // 创建弹出框内容
      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold text-lg">${name}</h3>
          ${images[0] ? `<img src="${images[0]}" alt="${name}" class="w-full h-32 object-cover my-2 rounded">` : ''}
          <p class="text-sm text-gray-600 mb-2">${description}</p>
          <div class="flex justify-between text-sm text-gray-500">
            <span>已访问: ${_count.visitedBy}</span>
            <span>想去: ${_count.wantToVisitBy}</span>
          </div>
          <a href="/attractions/${id}" class="block text-center mt-2 text-blue-500 hover:underline">查看详情</a>
        </div>
      `;

      // 创建弹出框
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupContent);

      // 添加标记
      new maplibregl.Marker(el)
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [attractions]);

  // 显示错误信息
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-500">
        加载景点数据失败
      </div>
    );
  }

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
} 