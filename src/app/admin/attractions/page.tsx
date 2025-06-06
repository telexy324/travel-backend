'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AttractionForm } from '@/components/AttractionForm';
import { Attraction, AttractionsResponse } from '@/types/responses';
import { Loader2 } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function AttractionsAdminPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const queryClient = useQueryClient();

  // 获取景点列表
  const { data, isLoading, error } = useQuery<AttractionsResponse>({
    queryKey: ['attractions', page, search, category],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(search && { search }),
        ...(category && { category }),
      });
      const response = await fetch(`/api/attractions?${params}`);
      if (!response.ok) {
        throw new Error('获取景点列表失败');
      }
      return response.json();
    },
  });

  const attractions = data?.data.items ?? [];
  const totalPages = data?.data.totalPages ?? 1;

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

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // 处理分类筛选
  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-red-500">
          <p>加载失败：{error.message}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['attractions'] })}
          >
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">景点管理</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>添加景点</Button>
          </DialogTrigger>
          <DialogContent>
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

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="搜索景点..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-[180px] rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">全部分类</option>
          <option value="自然风光">自然风光</option>
          <option value="人文古迹">人文古迹</option>
          <option value="主题乐园">主题乐园</option>
          <option value="博物馆">博物馆</option>
          <option value="其他">其他</option>
        </select>
      </div>

      <div className="rounded-md border">
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">加载中...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : attractions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              attractions.map((attraction) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={page === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
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