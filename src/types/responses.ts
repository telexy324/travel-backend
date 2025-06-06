import { z } from 'zod';

// 基础响应类型
export const baseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});

// 位置类型
export const locationSchema = z.object({
  geo: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

// 景点响应类型
export const attractionResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  address: z.string(),
  city: z.string(),
  province: z.string(),
  country: z.string(),
  category: z.string(),
  price: z.number(),
  openingHours: z.string().nullable(),
  contact: z.string().nullable(),
  website: z.string().nullable(),
  location: locationSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({
    visitedBy: z.number(),
    wantToVisitBy: z.number(),
  }),
  createdBy: userSchema,
});

// 景点列表响应类型
export const attractionsResponseSchema = baseResponseSchema.extend({
  data: paginationSchema.extend({
    items: z.array(attractionResponseSchema),
  }),
});

// 评论响应类型
export const commentSchema = z.object({
  id: z.string(),
  content: z.string(),
  rating: z.number(),
  images: z.array(z.string()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: userSchema,
  attraction: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export const commentsResponseSchema = baseResponseSchema.extend({
  data: paginationSchema.extend({
    items: z.array(commentSchema),
  }),
});

// 用户响应类型
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  emailVerified: z.string().nullable(),
});

// 统计响应类型
export const statsResponseSchema = baseResponseSchema.extend({
  data: z.object({
    totalAttractions: z.number(),
    totalComments: z.number(),
    totalUsers: z.number(),
    totalVisits: z.number(),
    totalWantToVisit: z.number(),
  }),
});

// 导出类型
export type BaseResponse = z.infer<typeof baseResponseSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type User = z.infer<typeof userSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Attraction = z.infer<typeof attractionResponseSchema>;
export type AttractionsResponse = z.infer<typeof attractionsResponseSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type CommentsResponse = z.infer<typeof commentsResponseSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;
