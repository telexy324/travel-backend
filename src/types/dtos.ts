import { z } from 'zod';

// 定义景点查询参数的数据验证模式
export const querySchema = z.object({
  lat: z.string().optional(),
  lng: z.string().optional(),
  radius: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
});

// 定义评论创建的数据验证模式
const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(500, '评论内容不能超过500字'),
  rating: z.number().min(1).max(5), // 仅用于前端校验，不入库
});

// 定义表单数据类型
export const attractionBaseSchema = z.object({
  name: z.string().min(1, '景点名称不能为空'),
  description: z.string().min(1, '景点描述不能为空'),
  address: z.string().min(1, '地址不能为空').optional().or(z.literal('')),
  city: z.string().min(1, '城市不能为空').optional().or(z.literal('')),
  province: z.string().min(1, '省份不能为空').optional().or(z.literal('')),
  country: z.string().min(1, '国家不能为空').optional().or(z.literal('')),
  category: z.string().min(1, '分类不能为空').optional().or(z.literal('')),
  openingHours: z.string().optional().or(z.literal('')),
  contact: z.string().optional().or(z.literal('')),
  website: z.string().url('网站URL格式不正确').optional().or(z.literal('')),
  location: z.object({
    lat: z.string().min(1, '纬度不能为空'),
    lng: z.string().min(1, '经度不能为空'),
  }),
});

export const attractionFormSchema = attractionBaseSchema.extend({
  images: z.string().min(1, '至少需要一张图片'),
  price: z.string().min(1, '价格不能为空').optional().or(z.literal('')),
})

export const attractionBackendSchema = attractionBaseSchema.extend({
  images: z.array(z.string().url('图片URL格式不正确')),
  price: z.number().min(0, '价格不能为负数'),
})