import { z } from 'zod';

export const attractionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  images: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const commentSchema = z.object({
  id: z.string(),
  content: z.string(),
  userId: z.string(),
  attractionId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable(),
  image: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Attraction = z.infer<typeof attractionSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type User = z.infer<typeof userSchema>; 