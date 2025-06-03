import { Map } from '@/components/Map';
import { AttractionsList } from '@/components/AttractionsList';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 flex">
        {/* 左侧地图区域 */}
        <div className="flex-1 relative">
          <Map />
        </div>
        
        {/* 右侧景点列表 */}
        <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
          <AttractionsList />
        </div>
      </div>
    </main>
  );
}
