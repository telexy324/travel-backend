'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { attractionFormSchema } from '@/types/dtos';

// 定义 API 数据类型
type AttractionApiData = {
  name: string;
  description: string;
  images: string[];
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  category?: string;
  price?: number;
  openingHours?: string;
  contact?: string;
  website?: string;
  location: {
    lat: number;
    lng: number;
  };
};

type AttractionFormData = z.infer<typeof attractionFormSchema>;

interface AttractionFormProps {
  attraction?: {
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
    location: {
      geo: {
        latitude: number;
        longitude: number;
      };
    } | null;
  };
  onSuccess: () => void;
}

export function AttractionForm({ attraction, onSuccess }: AttractionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<AttractionFormData>({
    resolver: zodResolver(attractionFormSchema),
    defaultValues: attraction ? {
      name: attraction.name,
      description: attraction.description,
      images: attraction.images.join(','),
      address: attraction.address,
      city: attraction.city,
      province: attraction.province,
      country: attraction.country,
      category: attraction.category,
      price: attraction.price.toString(),
      openingHours: attraction.openingHours || undefined,
      contact: attraction.contact || undefined,
      website: attraction.website || undefined,
      location: attraction.location ? {
        lat: attraction.location.geo.latitude.toString(),
        lng: attraction.location.geo.longitude.toString(),
      } : undefined,
    } : undefined,
  });

  const onSubmit = async (data: AttractionFormData) => {
    try {
      setIsSubmitting(true);

      // 转换表单数据为 API 数据
      const apiData: AttractionApiData = {
        name: data.name,
        description: data.description,
        images: data.images.split(',').map(url => url.trim()),
        location: {
          lat: parseFloat(data.location.lat),
          lng: parseFloat(data.location.lng),
        },
      };

      // 添加可选字段
      if (data.address) apiData.address = data.address;
      if (data.city) apiData.city = data.city;
      if (data.province) apiData.province = data.province;
      if (data.country) apiData.country = data.country;
      if (data.category) apiData.category = data.category;
      if (data.price) apiData.price = parseFloat(data.price);
      if (data.openingHours) apiData.openingHours = data.openingHours;
      if (data.contact) apiData.contact = data.contact;
      if (data.website) apiData.website = data.website;

      const response = await fetch(
        attraction ? `/api/attractions/${attraction.id}` : '/api/attractions',
        {
          method: attraction ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        }
      );

      if (!response.ok) {
        throw new Error(attraction ? '更新景点失败' : '创建景点失败');
      }

      toast.success(attraction ? '更新成功' : '创建成功');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[calc(90vh-8rem)] overflow-y-auto pr-4">
      <div>
        <label className="block text-sm font-medium mb-1">景点名称</label>
        <Input {...register('name')} />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">描述</label>
        <Textarea {...register('description')} className="min-h-[100px]" />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">图片URL（用逗号分隔）</label>
        <Input {...register('images')} />
        {errors.images && (
          <p className="text-red-500 text-sm mt-1">{errors.images.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">地址</label>
        <Input {...register('address')} />
        {errors.address && (
          <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">省份</label>
          <Input {...register('province')} />
          {errors.province && (
            <p className="text-red-500 text-sm mt-1">{errors.province.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">城市</label>
          <Input {...register('city')} />
          {errors.city && (
            <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">国家</label>
          <Input {...register('country')} />
          {errors.country && (
            <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">分类</label>
          <Input {...register('category')} />
          {errors.category && (
            <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">价格</label>
          <Input type="number" step="0.01" {...register('price')} />
          {errors.price && (
            <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">纬度</label>
          <Input type="number" step="0.000001" {...register('location.lat')} />
          {errors.location?.lat && (
            <p className="text-red-500 text-sm mt-1">{errors.location.lat.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">经度</label>
          <Input type="number" step="0.000001" {...register('location.lng')} />
          {errors.location?.lng && (
            <p className="text-red-500 text-sm mt-1">{errors.location.lng.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">营业时间</label>
        <Input {...register('openingHours')} />
        {errors.openingHours && (
          <p className="text-red-500 text-sm mt-1">{errors.openingHours.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">联系方式</label>
        <Input {...register('contact')} />
        {errors.contact && (
          <p className="text-red-500 text-sm mt-1">{errors.contact.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">网站</label>
        <Input {...register('website')} />
        {errors.website && (
          <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
        )}
      </div>

      <div className="pt-4">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '提交中...' : attraction ? '更新' : '创建'}
        </Button>
      </div>
    </form>
  );
} 