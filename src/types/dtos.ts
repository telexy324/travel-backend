import { z } from 'zod';

// 景点相关 DTO
export const attractionSchema = z.object({
  name: z.string().min(1, '景点名称不能为空'),
  description: z.string().min(1, '景点描述不能为空'),
  images: z.array(z.string()).min(1, '至少需要一张图片'),
  address: z.string().min(1, '地址不能为空'),
  city: z.string().min(1, '城市不能为空'),
  province: z.string().min(1, '省份不能为空'),
  country: z.string().min(1, '国家不能为空'),
  category: z.string().min(1, '分类不能为空'),
  price: z.number().min(0, '价格不能为负数'),
  location: z.object({
    geo: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }).optional(),
  openingHours: z.string().optional(),
  contact: z.string().optional(),
  website: z.string().url('网站URL格式不正确').optional(),
});

export const updateAttractionSchema = attractionSchema.partial();

export type AttractionFormData = z.infer<typeof attractionSchema>;
export type UpdateAttractionData = z.infer<typeof updateAttractionSchema>;

// 景点查询 DTO
export const attractionQuerySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  minPrice: z.string().transform((val) => parseFloat(val)).optional(),
  maxPrice: z.string().transform((val) => parseFloat(val)).optional(),
  search: z.string().optional(),
  lat: z.string().transform((val) => parseFloat(val)).optional(),
  lng: z.string().transform((val) => parseFloat(val)).optional(),
  radius: z.string().transform((val) => parseFloat(val)).optional(),
  page: z.string().transform((val) => parseInt(val)).optional(),
  limit: z.string().transform((val) => parseInt(val)).optional(),
});

export type AttractionQueryParams = z.infer<typeof attractionQuerySchema>;

// 评论相关 DTO
export const commentSchema = z.object({
  rating: z.number().min(1).max(5),
  content: z.string().min(1, '评论内容不能为空'),
  images: z.array(z.string()).optional(),
});

export type CommentFormData = z.infer<typeof commentSchema>;

// 评论查询 DTO
export const commentQuerySchema = z.object({
  attractionId: z.string(),
  page: z.string().transform((val) => parseInt(val)).optional(),
  limit: z.string().transform((val) => parseInt(val)).optional(),
  sortBy: z.enum(['createdAt', 'rating']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CommentQueryParams = z.infer<typeof commentQuerySchema>;