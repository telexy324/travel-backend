'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { AttractionForm } from '@/components/AttractionForm';

interface Attraction {
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

export default function AttractionsAdminPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const queryClient = useQueryClient();

  // 获取景点列表
  const { data: attractions = [], isLoading } = useQuery<Attraction[]>({
    queryKey: ['attractions'],
    queryFn: async () => {
      const response = await fetch('/api/attractions');
      if (!response.ok) {
        throw new Error('获取景点列表失败');
      }
      return response.json();
    },
  });

  // 删除景点
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/attractions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('删除景点失败');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attractions'] });
      toast.success('删除成功');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // 处理删除
  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个景点吗？')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // 处理编辑
  const handleEdit = (attraction: Attraction) => {
    setSelectedAttraction(attraction);
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">景点管理</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>添加景点</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加新景点</DialogTitle>
            </DialogHeader>
            <AttractionForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['attractions'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>城市</TableHead>
            <TableHead>分类</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>访问量</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attractions.map((attraction) => (
            <TableRow key={attraction.id}>
              <TableCell>{attraction.name}</TableCell>
              <TableCell>{attraction.city}</TableCell>
              <TableCell>{attraction.category}</TableCell>
              <TableCell>¥{attraction.price}</TableCell>
              <TableCell>{attraction._count.visitedBy}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(attraction)}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(attraction.id)}
                  >
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑景点</DialogTitle>
          </DialogHeader>
          {selectedAttraction && (
            <AttractionForm
              attraction={selectedAttraction}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['attractions'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 