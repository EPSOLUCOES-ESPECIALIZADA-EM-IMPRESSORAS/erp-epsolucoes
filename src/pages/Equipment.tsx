/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Plus, 
  Search, 
  Printer, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  History,
  Loader2,
  TriangleAlert,
  ClipboardList
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { WARRANTY_LABELS } from '@/constants';
import { Equipment, Client, ServiceOrder } from '@/types';
import { useFirestoreCollection, useFirestoreActions } from '@/hooks/useFirestore';
import { cn, toUpperCase } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EquipmentPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingEquipment, setEditingEquipment] = React.useState<Equipment | null>(null);
  const [duplicateEquipWarning, setDuplicateEquipWarning] = React.useState<{ field: string; value: string } | null>(null);
  const [isDuplicateEquipDialogOpen, setIsDuplicateEquipDialogOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    clientId: '',
    brand: '',
    model: '',
    serialNumber: '',
    color: '',
    type: '',
    warrantyStatus: 'OUT_WARRANTY' as any,
    notes: '',
    arrivalDate: '',
    estimatedDeliveryDate: ''
  });

  const { data: equipment, loading: loadingEquipment } = useFirestoreCollection<Equipment>('equipment');
  const { data: clients } = useFirestoreCollection<Client>('clients');
  const { data: orders } = useFirestoreCollection<ServiceOrder>('orders');
  
  const { add, update, remove } = useFirestoreActions('equipment');
  const { add: addOrder } = useFirestoreActions('orders');
  const { update: updateEquipment } = useFirestoreActions('equipment');

  const [savedEquipmentId, setSavedEquipmentId] = React.useState<string | null>(null);
  const [isOSConfirmDialogOpen, setIsOSConfirmDialogOpen] = React.useState(false);
  const [osDescription, setOsDescription] = React.useState('');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId');
    if (clientId) {
      resetForm();
      setFormData(prev => ({ ...prev, clientId }));
      setIsDialogOpen(true);
      
      // Limpar os parâmetros da URL sem recarregar a página
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const [isSerialWarningAccepted, setIsSerialWarningAccepted] = React.useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'serialNumber') {
      setIsSerialWarningAccepted(false);
    }
    setFormData(prev => ({ ...prev, [name]: toUpperCase(value) }));
  };

  const handleSerialBlur = () => {
    if (!formData.serialNumber || isSerialWarningAccepted) return;
    
    const duplicate = equipment.find(eq => {
      if (editingEquipment && eq.id === editingEquipment.id) return false;
      return eq.serialNumber === formData.serialNumber;
    });

    if (duplicate) {
      setDuplicateEquipWarning({ field: 'Número de Série', value: formData.serialNumber });
      setIsDuplicateEquipDialogOpen(true);
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      brand: '',
      model: '',
      serialNumber: '',
      color: '',
      type: '',
      warrantyStatus: 'OUT_WARRANTY',
      notes: '',
      arrivalDate: '',
      estimatedDeliveryDate: ''
    });
    setEditingEquipment(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: Equipment) => {
    setEditingEquipment(item);
    setFormData({
      clientId: item.clientId,
      brand: item.brand,
      model: item.model,
      serialNumber: item.serialNumber,
      color: item.color || '',
      type: item.type || '',
      warrantyStatus: item.warrantyStatus,
      notes: item.notes || '',
      arrivalDate: item.arrivalDate || '',
      estimatedDeliveryDate: item.estimatedDeliveryDate || ''
    });
    setIsDialogOpen(true);
  };

  const filteredEquipment = equipment.filter(e => {
    const client = clients.find(c => c.id === e.clientId);
    const clientName = client ? client.name.toLowerCase() : '';
    const term = searchTerm.toLowerCase();
    return (
      e.brand.toLowerCase().includes(term) ||
      e.model.toLowerCase().includes(term) ||
      e.serialNumber.toLowerCase().includes(term) ||
      clientName.includes(term)
    );
  });

  const handleSaveEquipment = async (e?: React.FormEvent, bypassCheck = false) => {
    if (e) e.preventDefault();
    if (!formData.clientId) return toast.error('Selecione um cliente');
    
    // Check for duplicates
    if (!bypassCheck && !isSerialWarningAccepted && formData.serialNumber) {
      const duplicate = equipment.find(eq => {
        if (editingEquipment && eq.id === editingEquipment.id) return false;
        return eq.serialNumber === formData.serialNumber;
      });

      if (duplicate) {
        setDuplicateEquipWarning({ field: 'Número de Série', value: formData.serialNumber });
        setIsDuplicateEquipDialogOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let id = editingEquipment?.id;
      if (editingEquipment) {
        await update(editingEquipment.id, formData);
        toast.success('Equipamento atualizado com sucesso!');
      } else {
        id = await add(formData);
        toast.success('Equipamento cadastrado com sucesso!');
      }
      
      setIsDialogOpen(false);
      
      // Trigger OS confirmation
      if (id) {
        setSavedEquipmentId(id);
        setIsOSConfirmDialogOpen(true);
        setOsDescription('');
      } else {
        resetForm();
      }
    } catch (error) {
      toast.error('Erro ao salvar equipamento.');
    } finally {
      setIsSubmitting(false);
      setIsDuplicateEquipDialogOpen(false);
      setDuplicateEquipWarning(null);
    }
  };

  const handleCreateOS = async () => {
    if (!savedEquipmentId) return;
    
    const equip = equipment.find(e => e.id === savedEquipmentId) || (editingEquipment?.id === savedEquipmentId ? editingEquipment : null);
    if (!equip) return;

    setIsSubmitting(true);
    try {
      // Generate sequential OS Number O.S.:001
      const lastOrder = [...orders]
        .filter(o => o.osNumber && o.osNumber.startsWith('O.S.:'))
        .sort((a, b) => b.osNumber.localeCompare(a.osNumber, undefined, { numeric: true, sensitivity: 'base' }))[0];
      
      let nextNum = 1;
      if (lastOrder) {
        const match = lastOrder.osNumber.match(/O\.S\.:(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      const osNumber = `O.S.:${nextNum.toString().padStart(3, '0')}`;

      await addOrder({
        clientId: formData.clientId || equip.clientId,
        equipmentId: savedEquipmentId,
        status: 'AGUARDANDO',
        priority: 3,
        description: osDescription || 'ABERTURA AUTOMÁTICA VIA CADASTRO DE EQUIPAMENTO',
        osNumber,
        trackingToken: Math.random().toString(36).substring(2, 10).toUpperCase(),
      });

      toast.success('Ordem de Serviço aberta na Fila Ativa!');
      setIsOSConfirmDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao abrir OS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (id: string, model: string) => {
    if (confirm(`Deseja excluir o equipamento ${model}?`)) {
      try {
        await remove(id, 'Exclusão manual');
        toast.success('Equipamento excluído!');
      } catch (error) {
        toast.error('Erro ao excluir.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-main">Equipamentos</h2>
          <p className="text-sm text-text-muted">Gerencie o parque de máquinas dos seus clientes.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger 
            render={
              <Button className="btn-professional-primary" onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Equipamento
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden max-h-[95vh] flex flex-col">
            <form onSubmit={handleSaveEquipment} className="flex flex-col h-full overflow-hidden">
              <DialogHeader className="p-6 pb-2 shrink-0">
                <DialogTitle>{editingEquipment ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}</DialogTitle>
                <DialogDescription>
                  {editingEquipment ? 'Atualize os dados do equipamento abaixo.' : 'Vincule um novo equipamento a um cliente da sua base.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto overflow-x-auto px-6">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Série</Label>
                    <Input 
                      name="serialNumber" 
                      className="col-span-3" 
                      value={formData.serialNumber} 
                      onChange={handleInputChange} 
                      onBlur={handleSerialBlur}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Cliente</Label>
                    <Select 
                      value={formData.clientId} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, clientId: val }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o cliente">
                          {clients.find(c => c.id === formData.clientId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Marca</Label>
                    <Input name="brand" className="col-span-3" value={formData.brand} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Modelo</Label>
                    <Input name="model" className="col-span-3" value={formData.model} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Tipo</Label>
                    <Input name="type" className="col-span-3" value={formData.type} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Cor</Label>
                    <Input name="color" className="col-span-3" value={formData.color} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Garantia</Label>
                    <Select 
                      value={formData.warrantyStatus} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, warrantyStatus: val as any }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Status da garantia">
                          {WARRANTY_LABELS[formData.warrantyStatus as keyof typeof WARRANTY_LABELS]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(WARRANTY_LABELS).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Chegada</Label>
                    <Input name="arrivalDate" type="date" className="col-span-3" value={formData.arrivalDate} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Previsão</Label>
                    <Input name="estimatedDeliveryDate" type="date" className="col-span-3" value={formData.estimatedDeliveryDate} onChange={handleInputChange} />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Notas</Label>
                    <textarea 
                      name="notes"
                      className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.notes}
                      onChange={handleInputChange}
                    />
                  </div>

                  {editingEquipment && (
                    <div className="pt-4 border-t border-border mt-2">
                      <div className="flex flex-col gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Ações Rápidas</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full justify-start gap-2 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-600 text-indigo-700"
                          onClick={() => {
                            setSavedEquipmentId(editingEquipment.id);
                            setIsOSConfirmDialogOpen(true);
                            setOsDescription('');
                          }}
                        >
                          <History className="w-4 h-4" />
                          Abrir Nova Ordem de Serviço para este Equipamento
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="p-6 pt-2 border-t border-border shrink-0">
                <Button type="submit" disabled={isSubmitting} className="btn-professional-primary w-full sm:w-auto">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingEquipment ? 'Atualizar Equipamento' : 'Salvar Equipamento'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-professional">
        <CardHeader className="p-0 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input 
                placeholder="Buscar por marca, modelo ou série..." 
                className="pl-9 border-border focus:ring-primary h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-border">
                  <TableHead className="w-[250px] text-text-muted font-bold text-[11px] uppercase tracking-wider">Equipamento</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Nº de Série</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Chegada / Previsão</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Tipo</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Garantia</TableHead>
                  <TableHead className="text-right text-text-muted font-bold text-[11px] uppercase tracking-wider">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingEquipment ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEquipment.length > 0 ? (
                  filteredEquipment.map((item) => {
                    const client = clients.find(c => c.id === item.clientId);
                    return (
                      <TableRow key={item.id} className="data-row-hover border-border">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100 text-text-muted">
                              <Printer className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-text-main font-semibold">{item.brand} {item.model}</span>
                              <span className="text-xs text-text-muted font-normal">{item.color}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-main text-sm font-medium">{client?.name || '---'}</TableCell>
                        <TableCell className="text-text-muted text-sm font-mono">{item.serialNumber}</TableCell>
                        <TableCell className="text-text-muted text-[11px]">
                          <div className="flex flex-col">
                            <span>{item.arrivalDate ? `Chegada: ${new Date(item.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR')}` : '---'}</span>
                            <span className="text-primary font-medium">{item.estimatedDeliveryDate ? `Prev: ${new Date(item.estimatedDeliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}` : '---'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-text-muted text-sm">{item.type}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "font-bold text-[10px] uppercase tracking-wider border-border",
                              item.warrantyStatus === 'IN_WARRANTY' ? "bg-green-50 text-success border-green-100" :
                              item.warrantyStatus === 'WARRANTY_RETURN' ? "bg-amber-50 text-amber-600 border-amber-100" :
                              "bg-slate-50 text-text-muted border-slate-100"
                            )}
                          >
                            {WARRANTY_LABELS[item.warrantyStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger 
                              render={
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-text-main">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(item)}>
                                <Edit2 className="w-4 h-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <History className="w-4 h-4" /> Histórico OS
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="gap-2 text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteEquipment(item.id, `${item.brand} ${item.model}`)}
                              >
                                <Trash2 className="w-4 h-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-text-muted italic">
                      Nenhum equipamento encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDuplicateEquipDialogOpen} onOpenChange={setIsDuplicateEquipDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <TriangleAlert className="w-5 h-5" />
              Equipamento Duplicado
            </DialogTitle>
            <DialogDescription className="py-2">
              Já existe um equipamento com o mesmo {duplicateEquipWarning?.field}: <strong>{duplicateEquipWarning?.value}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, serialNumber: '' }));
                setIsDuplicateEquipDialogOpen(false);
              }} 
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={() => {
                setIsSerialWarningAccepted(true);
                setIsDuplicateEquipDialogOpen(false);
              }} 
              className="flex-1 btn-professional-primary"
            >
              Aceitar e Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOSConfirmDialogOpen} onOpenChange={(open) => {
        setIsOSConfirmDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <ClipboardList className="w-5 h-5" />
              Abrir Ordem de Serviço?
            </DialogTitle>
            <DialogDescription className="py-2">
              Equipamento salvo com sucesso! Gostaria de abrir uma nova Ordem de Serviço para este equipamento agora na <strong>Fila Ativa</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Descrição do Defeito (Opcional)</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Ex: Não liga, papel atolado..."
                value={osDescription}
                onChange={(e) => setOsDescription(toUpperCase(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => {
                setIsOSConfirmDialogOpen(false);
                resetForm();
              }} 
              className="flex-1"
            >
              Não, apenas salvar
            </Button>
            <Button 
              type="button"
              disabled={isSubmitting}
              onClick={handleCreateOS} 
              className="flex-1 btn-professional-primary"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sim, Abrir OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

