'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// 设置 Mapbox token
maplibregl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface Location {
  latitude: number;
  longitude: number;
}

interface Attraction {
  id: string;
  name: string;
  location: Location;
}

interface MapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
}

export function Map({ initialCenter = [116.397428, 39.90923], initialZoom = 12 }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [attractions, setAttractions] = useState<Attraction[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // 初始化地图
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json', // 使用 MapLibre 的演示样式
      center: initialCenter,
      zoom: initialZoom,
    });

    // 添加导航控件
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // 获取景点数据
    const fetchAttractions = async () => {
      try {
        const response = await fetch('/api/attractions');
        const data = await response.json();
        setAttractions(data);
      } catch (error) {
        console.error('Error fetching attractions:', error);
      }
    };

    fetchAttractions();

    // 清理函数
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [initialCenter, initialZoom]);

  // 添加景点标记
  useEffect(() => {
    if (!map.current || !attractions.length) return;

    // 清除现有标记
    const markers = document.getElementsByClassName('marker');
    while (markers[0]) {
      markers[0].remove();
    }

    // 添加新标记
    attractions.forEach((attraction) => {
      const { location, name, id } = attraction;
      
      // 检查 location 是否存在
      if (!location?.latitude || !location?.longitude) {
        console.warn(`Missing location data for attraction: ${name}`);
        return;
      }

      const coordinates: [number, number] = [location.longitude, location.latitude];

      // 创建标记元素
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundImage = 'url(/marker.png)';
      el.style.backgroundSize = 'cover';
      el.style.cursor = 'pointer';

      // 创建弹出框
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <h3 class="font-bold">${name}</h3>
        <a href="/attractions/${id}" class="text-blue-500 hover:underline">查看详情</a>
      `);

      // 添加标记
      new maplibregl.Marker(el)
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [attractions]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
} 