
export interface Attraction {
  id: string;
  name: string;
  description: string;
  images: string[];
  address: string;
  city: string;
  province: string;
  country: string;
  category: string;
  price: number;
  openingHours?: string | null;
  contact?: string | null;
  website?: string | null;
  createdAt: Date;
  updatedAt: Date;
  location: {
    geo: {
      latitude: number;
      longitude: number;
    };
  } | null;
  _count: {
    visitedBy: number;
    wantToVisitBy: number;
  };
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

// 定义位置数据的类型
interface LocationData {
  geo: {
    latitude: number;
    longitude: number;
  };
}

// 定义景点数据的类型
type AttractionWithLocation = {
  id: string;
  name: string;
  description: string;
  images: string[];
  address: string;
  city: string;
  province: string;
  country: string;
  category: string;
  price: number;
  openingHours?: string | null;
  contact?: string | null;
  website?: string | null;
  createdAt: Date;
  updatedAt: Date;
  location: LocationData | null;
  _count: {
    visitedBy: number;
    wantToVisitBy: number;
  };
  createdBy: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

// 定义原始SQL查询返回的位置数据类型
interface LocationQueryResult {
  id: string;
  location: LocationData;
}
