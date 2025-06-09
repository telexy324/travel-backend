'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AttractionFormData, attractionSchema } from '@/types/dtos';
import { Attraction } from '@/types/responses';

interface AttractionFormProps {
  attraction?: Attraction;
  onSuccess: () => void;
}

export function AttractionForm({ attraction, onSuccess }: AttractionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<AttractionFormData>({
    resolver: zodResolver(attractionSchema),
    defaultValues: attraction ? {
      ...attraction,
      price: attraction.price.toString(),
      images: attraction.images.join(','),
      location: attraction.location ? {
        lat: attraction.location.geo.latitude.toString(),
        lng: attraction.location.geo.longitude.toString(),
      } : undefined,
    } : undefined,
  });

  const onSubmit = async (data: AttractionFormData) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(
        attraction ? `/api/attractions/${attraction.id}` : '/api/attractions',
        {
          method: attraction ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            images: data.images.split(',').map((url: string) => url.trim()),
          }),
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
    <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl mx-auto">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">纬度</label>
            <Input type="number" step="0.000001" {...register('location.geo.latitude')} />
            {errors.location?.geo?.latitude && (
              <p className="text-red-500 text-sm mt-1">{errors.location.geo.latitude.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">经度</label>
            <Input type="number" step="0.000001" {...register('location.geo.longitude')} />
            {errors.location?.geo?.longitude && (
              <p className="text-red-500 text-sm mt-1">{errors.location.geo.longitude.message}</p>
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
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? '提交中...' : attraction ? '更新' : '创建'}
          </Button>
        </div>
      </form>
    </div>
  );
} 