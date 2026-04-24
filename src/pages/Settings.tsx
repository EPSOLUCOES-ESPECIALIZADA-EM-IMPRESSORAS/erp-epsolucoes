/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Plus, 
  Trash2, 
  Settings as SettingsIcon,
  Printer,
  Tag,
  Palette,
  GripVertical
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useFirestoreCollection, useFirestoreActions } from '@/hooks/useFirestore';
import { SystemSetting } from '@/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { data: settings, loading } = useFirestoreCollection<SystemSetting>('settings');
  const { add, remove } = useFirestoreActions('settings');

  const getItems = (category: string) => 
    settings
      .filter(s => s.category === category)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleAddItem = async (category: string, value: string) => {
    if (!value.trim()) return;
    try {
      await add({
        category,
        value: value.trim(),
        active: true,
        order: settings.filter(s => s.category === category).length + 1
      });
      toast.success('Adicionado com sucesso!');
    } catch (err) {
      toast.error('Erro ao adicionar.');
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      await remove(id, 'Configuração removida');
      toast.success('Removido com sucesso!');
    } catch (err) {
      toast.error('Erro ao remover.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-main">Configurações</h2>
        <p className="text-sm text-text-muted">Personalize os parâmetros do sistema.</p>
      </div>

      <Tabs defaultValue="equipment-types" className="w-full">
        <ScrollArea orientation="horizontal" className="w-full mb-8">
          <TabsList className="bg-slate-100/50 border border-border p-1 rounded-xl inline-flex w-full md:w-auto">
            <TabsTrigger value="equipment-types" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold text-xs uppercase tracking-wider">
              <Printer className="w-4 h-4" /> Tipos de Equipamento
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold text-xs uppercase tracking-wider">
              <Tag className="w-4 h-4" /> Marcas
            </TabsTrigger>
            <TabsTrigger value="colors" className="gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold text-xs uppercase tracking-wider">
              <Palette className="w-4 h-4" /> Cores
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <TabsContent value="equipment-types">
              <SettingsSection 
                title="Tipos de Equipamento" 
                category="EQUIPMENT_TYPE"
                description="Defina as categorias de máquinas que você atende."
                placeholder="Ex: Multifuncional Laser, Impressora Jato de Tinta..."
                items={getItems('EQUIPMENT_TYPE')}
                onAdd={(val) => handleAddItem('EQUIPMENT_TYPE', val)}
                onRemove={handleRemoveItem}
              />
            </TabsContent>

            <TabsContent value="brands">
              <SettingsSection 
                title="Marcas" 
                category="BRAND"
                description="Gerencie as marcas de fabricantes suportadas."
                placeholder="Ex: Xerox, HP, Epson, Brother..."
                items={getItems('BRAND')}
                onAdd={(val) => handleAddItem('BRAND', val)}
                onRemove={handleRemoveItem}
              />
            </TabsContent>

            <TabsContent value="colors">
              <SettingsSection 
                title="Cores" 
                category="COLOR"
                description="Cores comuns para facilitar o cadastro de equipamentos."
                placeholder="Ex: Branco, Preto, Cinza, Azul..."
                items={getItems('COLOR')}
                onAdd={(val) => handleAddItem('COLOR', val)}
                onRemove={handleRemoveItem}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function SettingsSection({ title, description, placeholder, items, onAdd, onRemove }: { 
  title: string; 
  category: string;
  description: string; 
  placeholder: string;
  items: SystemSetting[];
  onAdd: (value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [newValue, setNewValue] = React.useState('');

  const handleAdd = () => {
    onAdd(newValue);
    setNewValue('');
  };

  return (
    <Card className="card-professional">
      <CardHeader className="p-0 pb-6">
        <CardTitle className="text-lg font-bold text-text-main">{title}</CardTitle>
        <CardDescription className="text-sm text-text-muted">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-8">
        <div className="flex gap-3">
          <Input 
            placeholder={placeholder} 
            className="max-w-md border-border focus:ring-primary h-11" 
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button className="btn-professional-primary h-11" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <Separator className="bg-border" />

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-border hover:bg-slate-50 transition-all group">
              <div className="flex items-center gap-4">
                <GripVertical className="w-4 h-4 text-text-muted/30 cursor-grab group-hover:text-text-muted transition-colors" />
                <span className="text-sm font-semibold text-text-main">{item.value}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-text-muted hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-text-muted italic text-center py-4">Nenhum item cadastrado.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
