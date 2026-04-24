/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  UserPlus,
  Building2,
  User,
  Loader2,
  Printer,
  TriangleAlert,
  ClipboardList,
  History
} from 'lucide-react';
import { motion } from 'motion/react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PRIORITY_LABELS, WARRANTY_LABELS } from '@/constants';
import { Client, ClientType, Equipment, ServiceOrder } from '@/types';
import { useFirestoreCollection, useFirestoreActions } from '@/hooks/useFirestore';
import { cn, maskCPF, maskCNPJ, maskPhone, maskCEP, toUpperCase, validateCPF, validateCNPJ } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function Clients() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<Client | null>(null);
  const [duplicateWarning, setDuplicateWarning] = React.useState<{ field: string; value: string } | null>(null);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = React.useState(false);
  const [duplicateEquipWarning, setDuplicateEquipWarning] = React.useState<{ field: string; value: string } | null>(null);
  const [isDuplicateEquipDialogOpen, setIsDuplicateEquipDialogOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: '',
    type: 'PF' as ClientType,
    document: '',
    phone: '',
    phone2: '',
    email: '',
    address: '',
    cep: '',
    notes: '',
    priority: '3',
    isRental: false,
    rentalModel: '',
    rentalSerialNumber: '',
    rentalId: '',
    rentalTotalPages: '0'
  });

  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = React.useState(false);
  const [isSubmittingEquip, setIsSubmittingEquip] = React.useState(false);
  const [equipFormData, setEquipFormData] = React.useState({
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
  const [editingEquipment, setEditingEquipment] = React.useState<Equipment | null>(null);

  const { data: clients, loading } = useFirestoreCollection<Client>('clients');
  const { data: allEquipment } = useFirestoreCollection<Equipment>('equipment');
  const { data: orders } = useFirestoreCollection<ServiceOrder>('orders');

  const { add, update, remove } = useFirestoreActions('clients');
  const { add: addEquip, update: updateEquip } = useFirestoreActions('equipment');
  const { add: addOrder } = useFirestoreActions('orders');

  const [savedEquipmentId, setSavedEquipmentId] = React.useState<string | null>(null);
  const [isOSConfirmDialogOpen, setIsOSConfirmDialogOpen] = React.useState(false);
  const [osDescription, setOsDescription] = React.useState('');

  const [isSerialWarningAccepted, setIsSerialWarningAccepted] = React.useState(false);

  const clientEquipment = editingClient 
    ? allEquipment.filter(e => e.clientId === editingClient.id)
    : [];

  const handleEquipInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'serialNumber') {
      setIsSerialWarningAccepted(false);
    }
    setEquipFormData(prev => ({ ...prev, [name]: toUpperCase(value) }));
  };

  const handleSerialBlur = () => {
    if (!equipFormData.serialNumber || isSerialWarningAccepted) return;
    
    const duplicate = allEquipment.find(eq => {
      if (editingEquipment && eq.id === editingEquipment.id) return false;
      return eq.serialNumber === equipFormData.serialNumber;
    });

    if (duplicate) {
      setDuplicateEquipWarning({ field: 'Número de Série', value: equipFormData.serialNumber });
      setIsDuplicateEquipDialogOpen(true);
    }
  };

  const handleSaveEquipment = async (e?: React.FormEvent, bypassCheck = false) => {
    if (e) e.preventDefault();
    if (!editingClient) return;
    
    if (!bypassCheck && !isSerialWarningAccepted && equipFormData.serialNumber) {
      const duplicate = allEquipment.find(eq => {
        if (editingEquipment && eq.id === editingEquipment.id) return false;
        return eq.serialNumber === equipFormData.serialNumber;
      });

      if (duplicate) {
        setDuplicateEquipWarning({ field: 'Número de Série', value: equipFormData.serialNumber });
        setIsDuplicateEquipDialogOpen(true);
        return;
      }
    }

    setIsSubmittingEquip(true);
    try {
      let id = editingEquipment?.id;
      if (editingEquipment) {
        await updateEquip(editingEquipment.id, equipFormData);
        toast.success('Equipamento atualizado com sucesso!');
      } else {
        id = await addEquip({
          ...equipFormData,
          clientId: editingClient.id
        });
        toast.success('Equipamento vinculado com sucesso!');
      }
      
      setIsEquipmentDialogOpen(false);
      
      // Trigger OS confirmation
      if (id) {
        setSavedEquipmentId(id);
        setIsOSConfirmDialogOpen(true);
        setOsDescription('');
      } else {
        setEditingEquipment(null);
      }
    } catch (error) {
      toast.error('Erro ao salvar equipamento.');
    } finally {
      setIsSubmittingEquip(false);
      setIsDuplicateEquipDialogOpen(false);
      setDuplicateEquipWarning(null);
    }
  };

  const handleCreateOS = async () => {
    if (!savedEquipmentId || !editingClient) return;
    
    const equip = allEquipment.find(e => e.id === savedEquipmentId) || (editingEquipment?.id === savedEquipmentId ? editingEquipment : null);
    if (!equip) return;

    setIsSubmittingEquip(true); // Using this for both
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
        clientId: editingClient.id,
        equipmentId: savedEquipmentId,
        status: 'AGUARDANDO',
        priority: 3,
        description: osDescription || 'ABERTURA AUTOMÁTICA VIA CADASTRO DE EQUIPAMENTO',
        osNumber,
        trackingToken: Math.random().toString(36).substring(2, 10).toUpperCase(),
      });

      toast.success('Ordem de Serviço aberta na Fila Ativa!');
      setIsOSConfirmDialogOpen(false);
      setEditingEquipment(null);
    } catch (error) {
      toast.error('Erro ao abrir OS.');
    } finally {
      setIsSubmittingEquip(false);
    }
  };

  const openEditEquipDialog = (equip: Equipment) => {
    setEditingEquipment(equip);
    setEquipFormData({
      brand: equip.brand,
      model: equip.model,
      serialNumber: equip.serialNumber,
      color: equip.color || '',
      type: equip.type || '',
      warrantyStatus: equip.warrantyStatus,
      notes: equip.notes || '',
      arrivalDate: equip.arrivalDate || '',
      estimatedDeliveryDate: equip.estimatedDeliveryDate || ''
    });
    setIsEquipmentDialogOpen(true);
  };

  const openAddEquipDialog = () => {
    setEditingEquipment(null);
    setEquipFormData({
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
    setIsEquipmentDialogOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue = toUpperCase(value);

    if (name === 'document') {
      newValue = formData.type === 'PF' ? maskCPF(value) : maskCNPJ(value);
    } else if (name === 'phone' || name === 'phone2') {
      newValue = maskPhone(value);
    } else if (name === 'cep') {
      newValue = maskCEP(value);
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const handleTypeChange = (value: ClientType) => {
    setFormData(prev => ({ ...prev, type: value, document: '' }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'PF',
      document: '',
      phone: '',
      phone2: '',
      email: '',
      address: '',
      cep: '',
      notes: '',
      priority: '3',
      isRental: false,
      rentalModel: '',
      rentalSerialNumber: '',
      rentalId: '',
      rentalTotalPages: '0'
    });
    setEditingClient(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      type: client.type,
      document: client.document,
      phone: client.phone,
      phone2: client.phone2 || '',
      email: client.email,
      address: client.address,
      cep: client.cep || '',
      notes: client.notes || '',
      priority: client.priority.toString(),
      isRental: client.isRental || false,
      rentalModel: client.rentalModel || '',
      rentalSerialNumber: client.rentalSerialNumber || '',
      rentalId: client.rentalId || '',
      rentalTotalPages: (client.rentalTotalPages || 0).toString()
    });
    setIsDialogOpen(true);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm)) ||
    (c.phone2 && c.phone2.includes(searchTerm))
  );

  const handleSaveClient = async (e?: React.FormEvent<HTMLFormElement>, bypassCheck = false) => {
    if (e) e.preventDefault();
    
    // Validate Document
    if (formData.document) {
      if (formData.type === 'PF' && !validateCPF(formData.document)) {
        toast.error('CPF inválido. Por favor, verifique.');
        return;
      }
      if (formData.type === 'PJ' && !validateCNPJ(formData.document)) {
        toast.error('CNPJ inválido. Por favor, verifique.');
        return;
      }
    }

    // Check for duplicates
    if (!bypassCheck) {
      const duplicate = clients.find(c => {
        if (editingClient && c.id === editingClient.id) return false;
        
        const docMatch = formData.document && c.document && c.document === formData.document;
        const phoneMatch = formData.phone && (c.phone === formData.phone || c.phone2 === formData.phone);
        const phone2Match = formData.phone2 && (c.phone === formData.phone2 || c.phone2 === formData.phone2);
        
        return docMatch || phoneMatch || phone2Match;
      });

      if (duplicate) {
        let field = '';
        let value = '';
        if (formData.document && duplicate.document === formData.document) {
          field = formData.type === 'PF' ? 'CPF' : 'CNPJ';
          value = formData.document;
        } else if (formData.phone && (duplicate.phone === formData.phone || duplicate.phone2 === formData.phone)) {
          field = 'Telefone';
          value = formData.phone;
        } else {
          field = 'Telefone 2';
          value = formData.phone2;
        }
        
        setDuplicateWarning({ field, value });
        setIsDuplicateDialogOpen(true);
        return;
      }
    }

    setIsSubmitting(true);
    
    const clientData = {
      ...formData,
      priority: parseInt(formData.priority),
      rentalTotalPages: parseInt(formData.rentalTotalPages) || 0,
    };

    try {
      if (editingClient) {
        await update(editingClient.id, clientData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await add(clientData);
        toast.success('Cliente cadastrado com sucesso!');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar cliente.');
    } finally {
      setIsSubmitting(false);
      setIsDuplicateDialogOpen(false);
      setDuplicateWarning(null);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${name}?`)) {
      try {
        await remove(id, 'Exclusão manual pelo usuário');
        toast.success('Cliente excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir cliente.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-main">Clientes</h2>
          <p className="text-sm text-text-muted">Gerencie sua base de clientes e contatos.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger 
            render={
              <Button className="btn-professional-primary" onClick={openAddDialog}>
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[95vh] flex flex-col">
            <form onSubmit={handleSaveClient} className="flex flex-col h-full overflow-hidden">
              <DialogHeader className="p-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center justify-between">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                  {editingClient?.createdAt && (
                    <Badge variant="outline" className="text-[10px] font-normal opacity-70">
                      Cadastrado em {new Date(editingClient.createdAt).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Atualize os dados do cliente abaixo.' : 'Preencha os dados abaixo para adicionar um novo cliente ao sistema.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto overflow-x-auto px-6">
                <div className="grid gap-6 py-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Informações Básicas</h3>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">Nome</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        className="col-span-3" 
                        required 
                        value={formData.name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="type" className="text-right">Tipo</Label>
                      <Select name="type" value={formData.type} onValueChange={handleTypeChange}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione o tipo">
                            {formData.type === 'PF' ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
                          <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="document" className="text-right">Documento</Label>
                      <Input 
                        id="document" 
                        name="document" 
                        className="col-span-3" 
                        placeholder={formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                        value={formData.document}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="priority" className="text-right">Prioridade</Label>
                      <Select 
                        name="priority" 
                        value={formData.priority} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, priority: val }))}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Selecione a prioridade">
                            {PRIORITY_LABELS[parseInt(formData.priority)]?.label}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_LABELS).map(([val, { label }]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Informações de Contato</h3>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone" className="text-right">Telefone 1</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        className="col-span-3" 
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="phone2" className="text-right">Telefone 2</Label>
                      <Input 
                        id="phone2" 
                        name="phone2" 
                        className="col-span-3" 
                        value={formData.phone2}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">Email</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        className="col-span-3" 
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Endereço</h3>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="cep" className="text-right">CEP</Label>
                      <Input 
                        id="cep" 
                        name="cep" 
                        className="col-span-3" 
                        value={formData.cep}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="address" className="text-right">Endereço</Label>
                      <Input 
                        id="address" 
                        name="address" 
                        className="col-span-3" 
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="notes" className="text-right pt-2">Observações</Label>
                      <textarea 
                        id="notes" 
                        name="notes" 
                        className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                        value={formData.notes}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Locação</h3>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Locador?</Label>
                      <div className="col-span-3 flex items-center gap-2">
                        <Switch 
                          checked={formData.isRental} 
                          onCheckedChange={(val) => setFormData(prev => ({ ...prev, isRental: val }))} 
                        />
                        <span className="text-xs text-text-muted">Este cliente possui contrato de locação</span>
                      </div>
                    </div>

                    {formData.isRental && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4 p-4 bg-slate-50 rounded-lg border border-border"
                      >
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rentalModel" className="text-right text-xs">Modelo</Label>
                          <Input 
                            id="rentalModel" 
                            name="rentalModel" 
                            className="col-span-3 h-8 text-xs" 
                            value={formData.rentalModel}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rentalSerialNumber" className="text-right text-xs">Nº Série</Label>
                          <Input 
                            id="rentalSerialNumber" 
                            name="rentalSerialNumber" 
                            className="col-span-3 h-8 text-xs" 
                            value={formData.rentalSerialNumber}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rentalId" className="text-right text-xs">ID Ident.</Label>
                          <Input 
                            id="rentalId" 
                            name="rentalId" 
                            className="col-span-3 h-8 text-xs" 
                            value={formData.rentalId}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rentalTotalPages" className="text-right text-xs">Total Págs</Label>
                          <Input 
                            id="rentalTotalPages" 
                            name="rentalTotalPages" 
                            type="number"
                            className="col-span-3 h-8 text-xs" 
                            value={formData.rentalTotalPages}
                            onChange={handleInputChange}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {editingClient && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Equipamentos Registrados</h3>
                        <Badge variant="secondary" className="text-[10px]">{clientEquipment.length} máquinas</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        {clientEquipment.length > 0 ? (
                          clientEquipment.map((equip) => (
                            <div key={equip.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-slate-100 text-text-muted">
                                  <Printer className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-text-main">{equip.brand} {equip.model}</span>
                                  <span className="text-[10px] text-text-muted font-mono">{equip.serialNumber}</span>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEditEquipDialog(equip);
                                }}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 border border-dashed border-border rounded-lg bg-slate-50/50">
                            <p className="text-xs text-text-muted italic">Nenhum equipamento vinculado.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="p-6 pt-2 border-t border-border flex flex-col sm:flex-row gap-2 shrink-0">
                {editingClient && (
                  <Dialog open={isEquipmentDialogOpen} onOpenChange={(open) => {
                    setIsEquipmentDialogOpen(open);
                    if (!open) setEditingEquipment(null);
                  }}>
                    <DialogTrigger 
                      render={
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full sm:w-auto border-primary text-primary hover:bg-primary/5"
                          onClick={openAddEquipDialog}
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Vincular Equipamento
                        </Button>
                      }
                    />
                    <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden max-h-[95vh] flex flex-col">
                      <form onSubmit={handleSaveEquipment} className="flex flex-col h-full overflow-hidden">
                        <DialogHeader className="p-6 pb-2 shrink-0">
                          <DialogTitle>{editingEquipment ? 'Editar Equipamento' : `Vincular Equipamento a ${editingClient.name}`}</DialogTitle>
                          <DialogDescription>
                            {editingEquipment ? 'Atualize os dados da máquina abaixo.' : 'Preencha os dados da máquina para vincular a este cliente.'}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-y-auto overflow-x-auto px-6">
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Série</Label>
                              <Input 
                                name="serialNumber" 
                                className="col-span-3" 
                                value={equipFormData.serialNumber} 
                                onChange={handleEquipInputChange} 
                                onBlur={handleSerialBlur}
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Marca</Label>
                              <Input name="brand" className="col-span-3" value={equipFormData.brand} onChange={handleEquipInputChange} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Modelo</Label>
                              <Input name="model" className="col-span-3" value={equipFormData.model} onChange={handleEquipInputChange} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Tipo</Label>
                              <Input name="type" className="col-span-3" value={equipFormData.type} onChange={handleEquipInputChange} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Cor</Label>
                              <Input name="color" className="col-span-3" value={equipFormData.color} onChange={handleEquipInputChange} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Garantia</Label>
                              <Select 
                                value={equipFormData.warrantyStatus} 
                                onValueChange={(val) => setEquipFormData(prev => ({ ...prev, warrantyStatus: val as any }))}
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Status da garantia">
                                    {WARRANTY_LABELS[equipFormData.warrantyStatus as keyof typeof WARRANTY_LABELS]}
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
                              <Input name="arrivalDate" type="date" className="col-span-3" value={equipFormData.arrivalDate} onChange={handleEquipInputChange} />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label className="text-right">Previsão</Label>
                              <Input name="estimatedDeliveryDate" type="date" className="col-span-3" value={equipFormData.estimatedDeliveryDate} onChange={handleEquipInputChange} />
                            </div>
                            <div className="grid grid-cols-4 items-start gap-4">
                              <Label className="text-right pt-2">Notas</Label>
                              <textarea 
                                name="notes"
                                className="col-span-3 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={equipFormData.notes}
                                onChange={handleEquipInputChange}
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
                          <Button type="submit" disabled={isSubmittingEquip} className="btn-professional-primary w-full sm:w-auto">
                            {isSubmittingEquip && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingEquipment ? 'Atualizar Equipamento' : 'Salvar Equipamento'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
                <div className="flex-1" />
                <Button type="submit" disabled={isSubmitting} className="btn-professional-primary w-full sm:w-auto">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingClient ? 'Atualizar Cliente' : 'Salvar Cliente'}
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
                placeholder="Buscar por nome, CPF ou email..." 
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
                  <TableHead className="w-[300px] text-text-muted font-bold text-[11px] uppercase tracking-wider">Cliente</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Tipo</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Documento</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Telefone</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Prioridade</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Cadastro</TableHead>
                  <TableHead className="text-right text-text-muted font-bold text-[11px] uppercase tracking-wider">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <TableRow key={client.id} className="data-row-hover border-border">
                      <TableCell className="font-medium">
                        <div 
                          className="flex flex-col cursor-pointer group/name"
                          onClick={() => openEditDialog(client)}
                        >
                          <span className="text-text-main font-semibold group-hover/name:text-primary transition-colors">{client.name}</span>
                          <span className="text-xs text-text-muted font-normal">{client.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-wider border-border text-text-muted bg-slate-50">
                          {client.type === 'PF' ? (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> PF</span>
                          ) : (
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> PJ</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text-muted text-sm font-mono">{client.document}</TableCell>
                      <TableCell className="text-text-muted text-sm">{client.phone}</TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] font-bold uppercase tracking-wider", PRIORITY_LABELS[client.priority].color)}>
                          {PRIORITY_LABELS[client.priority].label}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-muted text-sm whitespace-nowrap">
                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : '---'}
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
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2" onClick={() => openEditDialog(client)}>
                              <Edit2 className="w-4 h-4" /> Editar Cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => setLocation(`/equipment?clientId=${client.id}`)}>
                              <Printer className="w-4 h-4" /> Vincular Equipamento
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2 text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteClient(client.id, client.name)}
                            >
                              <Trash2 className="w-4 h-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-text-muted italic">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <TriangleAlert className="w-5 h-5" />
              Cadastro Duplicado
            </DialogTitle>
            <DialogDescription className="py-2">
              Já existe um cadastro com o mesmo {duplicateWarning?.field}: <strong>{duplicateWarning?.value}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => setIsDuplicateDialogOpen(false)} 
              className="flex-1"
            >
              OK (Alterar)
            </Button>
            <Button 
              type="button"
              onClick={() => {
                handleSaveClient(undefined, true);
                setIsDuplicateDialogOpen(false);
              }} 
              className="flex-1 btn-professional-primary"
            >
              Aceitar e Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                setEquipFormData(prev => ({ ...prev, serialNumber: '' }));
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
        if (!open) {
          setEditingEquipment(null);
          setEquipFormData({
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
        }
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
                setEditingEquipment(null);
                setEquipFormData({
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
              }} 
              className="flex-1"
            >
              Não, apenas salvar
            </Button>
            <Button 
              type="button"
              disabled={isSubmittingEquip}
              onClick={handleCreateOS} 
              className="flex-1 btn-professional-primary"
            >
              {isSubmittingEquip && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sim, Abrir OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
