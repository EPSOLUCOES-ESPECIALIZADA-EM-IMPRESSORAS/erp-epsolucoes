/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ClipboardList,
  Eye,
  MessageSquare,
  FileText,
  Link as LinkIcon,
  Activity,
  AlertCircle,
  Clock,
  LayoutGrid,
  List as ListIcon,
  TriangleAlert,
  History,
  Filter,
  Paperclip,
  Image as ImageIcon,
  File as FileIcon,
  X as CloseIcon,
  Upload,
  FileSpreadsheet
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
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { OS_STATUS_LABELS, PRIORITY_LABELS, WARRANTY_LABELS } from '@/constants';
import { OSStatus, OSAttachment, ServiceOrder, Client, Equipment, StatusHistory } from '@/types';
import { useFirestoreCollection, useFirestoreActions } from '@/hooks/useFirestore';
import { cn, toUpperCase, normalizeSearchString } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/components/FirebaseProvider';
import { uploadFile } from '@/lib/uploads';
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
import { Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const appBaseUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
const getTrackingUrl = (token: string) => `${appBaseUrl}/track/${token}`;

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    clientId: '',
    equipmentId: '',
    status: 'AGUARDANDO' as any,
    priority: '3',
    description: '',
    estimatedDeliveryDate: '',
  });

  const { data: orders, loading: loadingOrders } = useFirestoreCollection<ServiceOrder>('orders');
  const { data: clients } = useFirestoreCollection<Client>('clients');
  const { data: equipment } = useFirestoreCollection<Equipment>('equipment');
  const { data: statusHistory } = useFirestoreCollection<StatusHistory>('statusHistory');
  const { add, update } = useFirestoreActions('orders');
  const { add: addHistory } = useFirestoreActions('statusHistory');
  const { update: updateEquipment } = useFirestoreActions('equipment');
  const { user } = useAuth();

  const clientMap = React.useMemo(() => {
    return new Map(clients.map(c => [c.id, c]));
  }, [clients]);

  const equipmentMap = React.useMemo(() => {
    return new Map(equipment.map(e => [e.id, e]));
  }, [equipment]);

  const [activeTab, setActiveTab] = React.useState('active');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'card' | 'list'>('list');
  const [updatingOrder, setUpdatingOrder] = React.useState<ServiceOrder | null>(null);
  const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(null);

  const counts = React.useMemo(() => {
    return {
      active: orders.filter(o => o.status === 'AGUARDANDO').length,
      checklist: orders.filter(o => o.status === 'EM_CHECKLIST').length,
      pending: orders.filter(o => o.status === 'ORCAMENTO_ENCAMINHADO').length,
      approved: orders.filter(o => ['APROVADO', 'EM_ANDAMENTO', 'PRONTA', 'EM_TESTES', 'AGUARDANDO_PECA'].includes(o.status)).length,
      all: orders.length
    };
  }, [orders]);

  const hasDelayedInActive = React.useMemo(() => {
    return orders.some(o => {
      const equip = equipmentMap.get(o.equipmentId);
      return o.status === 'AGUARDANDO' && 
             equip?.estimatedDeliveryDate && 
             new Date(equip.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0));
    });
  }, [orders, equipmentMap]);

  const hasDelayedInChecklist = React.useMemo(() => {
    return orders.some(o => {
      const equip = equipmentMap.get(o.equipmentId);
      return o.status === 'EM_CHECKLIST' && 
             equip?.estimatedDeliveryDate && 
             new Date(equip.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0));
    });
  }, [orders, equipmentMap]);

  const hasDelayedInPending = React.useMemo(() => {
    return orders.some(o => {
      const equip = equipmentMap.get(o.equipmentId);
      return o.status === 'ORCAMENTO_ENCAMINHADO' && 
             equip?.estimatedDeliveryDate && 
             new Date(equip.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0));
    });
  }, [orders, equipmentMap]);

  const hasDelayedInApproved = React.useMemo(() => {
    return orders.some(o => {
      const equip = equipmentMap.get(o.equipmentId);
      return ['APROVADO', 'EM_ANDAMENTO', 'PRONTA', 'EM_TESTES', 'AGUARDANDO_PECA'].includes(o.status) && 
             equip?.estimatedDeliveryDate && 
             new Date(equip.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0));
    });
  }, [orders, equipmentMap]);

  const handleQuickStatusUpdate = async (order: ServiceOrder, newStatus: string) => {
    if (order.status === newStatus) return;

    // If approved, open the full dialog to ask for the prediction date
    if (newStatus === 'APROVADO') {
      const equip = equipmentMap.get(order.equipmentId);
      setUpdatingOrder(order);
      setUpdateFormData({
        status: 'APROVADO',
        diagnosis: order.diagnosis || '',
        budget: (order.budget || 0).toString(),
        notes: '',
        estimatedDeliveryDate: equip?.estimatedDeliveryDate || ''
      });
      return;
    }
    
    try {
      await update(order.id, {
        status: newStatus as any,
        finishedAt: newStatus === 'ENTREGUE' 
          ? (order.finishedAt ?? Date.now()) 
          : (order.finishedAt ?? null)
      });

      await addHistory({
        osId: order.id,
        fromStatus: order.status,
        toStatus: newStatus as any,
        changedBy: user?.displayName || user?.email || 'Sistema',
        notes: 'Atualização rápida via status list'
      });

      toast.success(`Status da ${order.osNumber} atualizado para ${OS_STATUS_LABELS[newStatus as keyof typeof OS_STATUS_LABELS].label}`);
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const [updateFormData, setUpdateFormData] = React.useState({
    status: '' as any,
    description: '',
    diagnosis: '',
    budget: '',
    notes: '',
    estimatedDeliveryDate: '',
    attachments: [] as OSAttachment[]
  });

  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !updatingOrder) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'image/jpeg', 'image/png', 'image/jpg', 
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    setIsUploading(true);
    setUploadProgress(0);
    const newAttachments: OSAttachment[] = [...updateFormData.attachments];

    try {
      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`O arquivo ${file.name} excede o limite de 10MB.`);
          completedFiles++;
          setUploadProgress((completedFiles / totalFiles) * 100);
          continue;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
          // Fallback check for some excel/word types that might vary by browser
          const isDoc = file.name.match(/\.(doc|docx|pdf|txt|xls|xlsx|jpg|jpeg|png)$/i);
          if (!isDoc) {
            toast.error(`O tipo do arquivo ${file.name} não é suportado.`);
            completedFiles++;
            setUploadProgress((completedFiles / totalFiles) * 100);
            continue;
          }
        }

        const path = `orders/${updatingOrder.id}/${Date.now()}_${file.name}`;
        const url = await uploadFile(path, file, (progress) => {
          // Progress for a single file within the overall batch progress
          const overallProgress = ((completedFiles + (progress / 100)) / totalFiles) * 100;
          setUploadProgress(overallProgress);
        });
        
        newAttachments.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          url,
          type: file.type,
          size: file.size,
          uploadedAt: Date.now()
        });

        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }
      setUpdateFormData(prev => ({ ...prev, attachments: newAttachments }));
      toast.success('Arquivo(s) enviado(s) com sucesso!');
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('tempo limite') || error?.message?.includes('timeout')) {
        toast.error('O tempo limite de upload foi excedido. Verifique sua conexão ou tente novamente mais tarde.');
      } else {
        toast.error(error?.message || 'Erro ao enviar arquivo.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await processFiles(e.dataTransfer.files);
  };

  const removeAttachment = (id: string) => {
    setUpdateFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(a => a.id !== id)
    }));
  };

  const handleSendWhatsApp = (order: ServiceOrder) => {
    const client = clientMap.get(order.clientId);
    const equip = equipmentMap.get(order.equipmentId);
    if (!client) return;

    const phone = client.phone.replace(/\D/g, '');
    const trackingUrl = getTrackingUrl(order.trackingToken);
    const message = encodeURIComponent(
      `*EPSOLUÇÕES EM IMPRESSORAS*\n\n` +
      `Olá, *${client.name}*!\n\n` +
      `Informamos que a sua Ordem de Serviço *${order.osNumber}* foi atualizada.\n\n` +
      `📌 *Status Atual:* ${OS_STATUS_LABELS[order.status].label}\n` +
      `🖨️ *Equipamento:* ${equip ? `${equip.brand} ${equip.model}` : 'Impressora'}\n` +
      (order.budget ? `💰 *Valor:* R$ ${order.budget.toFixed(2)}\n` : '') +
      `🔗 *Acompanhe em tempo real:* ${trackingUrl}\n\n` +
      `Ficamos à disposição para qualquer dúvida.`
    );

    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  const handleGeneratePDF = (order: ServiceOrder) => {
    const client = clientMap.get(order.clientId);
    const equip = equipmentMap.get(order.equipmentId);
    
    const doc = new jsPDF();
    
    // Header - Modern Design
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('EPSOLUÇÕES', 20, 22);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('MANUTENÇÃO ESPECIALIZADA EM IMPRESSORAS', 20, 30);
    doc.text('CONTATO: (11) 98765-4321 • EMAIL: DOCS@EPSOLUCOES.COM.BR', 20, 36);
    
    doc.setFontSize(16);
    doc.text('SOLICITAÇÃO DE SERVIÇO', 190, 25, { align: 'right' });
    doc.setFontSize(10);
    doc.text(`#${order.osNumber}`, 190, 32, { align: 'right' });

    // OS Main Info
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALHES DA ORDEM', 20, 55);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Data de Abertura: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`, 20, 62);
    doc.text(`Status: ${OS_STATUS_LABELS[order.status].label}`, 20, 68);
    doc.text(`Prioridade: ${PRIORITY_LABELS[order.priority].label}`, 20, 74);

    // Client Table
    autoTable(doc, {
      startY: 80,
      head: [['DADOS DO CLIENTE', '']],
      body: [
        ['NOME / RAZÃO SOCIAL:', client?.name || '---'],
        ['DOCUMENTO (CPF/CNPJ):', client?.document || '---'],
        ['TELEFONE PARA CONTATO:', `${client?.phone}${client?.phone2 ? ` / ${client.phone2}` : ''}`],
        ['E-MAIL:', client?.email || '---'],
        ['ENDEREÇO COMPLETO:', client?.address || '---'],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] } },
    });

    // Equipment Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['DADOS DO EQUIPAMENTO', '']],
      body: [
        ['TIPO:', equip?.type || '---'],
        ['MARCA / MODELO:', `${equip?.brand} ${equip?.model}` || '---'],
        ['NÚMERO DE SÉRIE:', equip?.serialNumber || '---'],
        ['ESTADO DE GARANTIA:', equip?.warrantyStatus ? WARRANTY_LABELS[equip.warrantyStatus as keyof typeof WARRANTY_LABELS] || equip.warrantyStatus : '---'],
        ['DATA DE ENTRADA:', equip?.arrivalDate ? new Date(equip.arrivalDate).toLocaleDateString('pt-BR') : '---'],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', fillColor: [248, 250, 252] } },
    });

    // Description & Diagnosis
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['RELATO DO CLIENTE / PROBLEMA APRESENTADO']],
      body: [[order.description]],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
    });

    if (order.diagnosis) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 5,
        head: [['PARECER TÉCNICO E DIAGNÓSTICO']],
        body: [[order.diagnosis]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 5 },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      });
    }

    // Budget & Terms
    const budgetY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFillColor(248, 250, 252);
    doc.rect(20, budgetY, 170, 20, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(20, budgetY, 170, 20, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('VALOR DO ORÇAMENTO:', 30, budgetY + 12);
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text(order.budget ? `R$ ${order.budget.toFixed(2)}` : 'A DEFINIR', 180, budgetY + 12, { align: 'right' });

    // Footer / Signatures
    const footY = budgetY + 45;
    doc.setDrawColor(200);
    doc.line(25, footY, 85, footY);
    doc.line(125, footY, 185, footY);
    
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('ASSINATURA RESPONSÁVEL TÉCNICO', 55, footY + 4, { align: 'center' });
    doc.text('ASSINATURA DO CLIENTE', 155, footY + 4, { align: 'center' });
    
    doc.setFontSize(7);
    doc.text('Este documento é uma representação digital da ordem de serviço aberta em nosso sistema.', 105, 285, { align: 'center' });
    doc.text('EPSOLUÇÕES • Rua Exemplo, 123 - Centro • CEP: 00000-000', 105, 290, { align: 'center' });

    doc.save(`OS_${order.osNumber}.pdf`);
    toast.success('PDF gerado com sucesso!');
  };

  const copyTrackingLink = (token: string) => {
    const url = getTrackingUrl(token);
    navigator.clipboard.writeText(url);
    toast.success('Link de rastreio copiado!');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: toUpperCase(value) }));
  };

  const normalize = (s: string) => normalizeSearchString(s);

  const filterByTab = (order: ServiceOrder) => {
    // If a specific status filter is selected, it takes precedence but is refined by the search term
    if (statusFilter !== 'all') {
      return order.status === statusFilter;
    }

    switch (activeTab) {
      case 'active': return order.status === 'AGUARDANDO';
      case 'checklist': return order.status === 'EM_CHECKLIST';
      case 'pending': return order.status === 'ORCAMENTO_ENCAMINHADO';
      case 'approved': return ['APROVADO', 'EM_ANDAMENTO', 'PRONTA', 'EM_TESTES', 'AGUARDANDO_PECA'].includes(order.status);
      case 'all': return true;
      default: return true;
    }
  };

  const sortedOrders = [...orders]
    .filter(filterByTab)
    .filter(o => {
      const client = clientMap.get(o.clientId);
      const equip = equipmentMap.get(o.equipmentId);
      const term = normalize(searchTerm);
      
      return (
        normalize(o.osNumber).includes(term) ||
        (client && normalize(client.name).includes(term)) ||
        (equip && normalize(equip.serialNumber).includes(term)) ||
        (equip && normalize(equip.model).includes(term))
      );
    })
    .sort((a, b) => {
      // Priority score: Higher priority value + higher priority number
      // But also order by date (newest first within same priority)
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.createdAt - a.createdAt;
    });

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.equipmentId) return toast.error('Selecione cliente e equipamento');
    
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

      await add({
        clientId: formData.clientId,
        equipmentId: formData.equipmentId,
        status: formData.status,
        priority: parseInt(formData.priority),
        description: formData.description,
        osNumber,
        trackingToken: Math.random().toString(36).substring(2, 10).toUpperCase(),
      });

      // Update equipment estimated delivery date
      if (formData.estimatedDeliveryDate) {
        await updateEquipment(formData.equipmentId, {
          estimatedDeliveryDate: formData.estimatedDeliveryDate
        });
      }

      toast.success('Ordem de Serviço aberta!');
      setIsAddDialogOpen(false);
      setFormData({
        clientId: '',
        equipmentId: '',
        status: 'AGUARDANDO',
        priority: '3',
        description: '',
        estimatedDeliveryDate: '',
      });
    } catch (error) {
      toast.error('Erro ao abrir OS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingOrder) return;

    // Enforce delivery date for Approved status
    if (updateFormData.status === 'APROVADO' && !updateFormData.estimatedDeliveryDate) {
      toast.error('Por favor, informe a previsão de entrega para OS Aprovada.');
      return;
    }

    setIsSubmitting(true);
    try {
      await update(updatingOrder.id, {
        status: updateFormData.status,
        description: updateFormData.description,
        diagnosis: updateFormData.diagnosis,
        budget: parseFloat(updateFormData.budget) || 0,
        attachments: updateFormData.attachments,
        finishedAt: updateFormData.status === 'ENTREGUE' 
          ? (updatingOrder.finishedAt ?? Date.now()) 
          : (updatingOrder.finishedAt ?? null)
      });

      // Log history
      await addHistory({
        osId: updatingOrder.id,
        fromStatus: updatingOrder.status,
        toStatus: updateFormData.status,
        changedBy: user?.displayName || user?.email || 'Sistema',
        notes: updateFormData.notes
      });

      // Update equipment as well
      const equip = equipmentMap.get(updatingOrder.equipmentId);
      if (equip && updateFormData.estimatedDeliveryDate !== (equip.estimatedDeliveryDate || '')) {
        await updateEquipment(equip.id, {
          estimatedDeliveryDate: updateFormData.estimatedDeliveryDate
        });
      }

      toast.success('OS atualizada com sucesso!');
      setUpdatingOrder(null);
    } catch (error) {
      toast.error('Erro ao atualizar OS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openUpdateDialog = (order: ServiceOrder) => {
    const equip = equipmentMap.get(order.equipmentId);
    setUpdatingOrder(order);
    setUpdateFormData({
      status: order.status,
      description: order.description || '',
      diagnosis: order.diagnosis || '',
      budget: (order.budget || 0).toString(),
      notes: '',
      estimatedDeliveryDate: equip?.estimatedDeliveryDate || '',
      attachments: order.attachments || []
    });
  };

  const handleSuggestDiagnosis = async () => {
    if (!updatingOrder) return;
    const equip = equipmentMap.get(updatingOrder.equipmentId);
    if (!equip) return;

    setIsSuggesting(true);
    try {
      if (!ai) {
        toast.error('Configure VITE_GEMINI_API_KEY para usar a sugestão da IA.');
        return;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Você é um técnico especialista em impressoras. 
        Equipamento: ${equip.brand} ${equip.model} (${equip.type})
        Relato do Cliente: ${updatingOrder.description}
        
        Com base nessas informações, sugira um diagnóstico técnico sucinto e profissional para esta Ordem de Serviço em português do Brasil. 
        Seja direto, focando nas possíveis causas e soluções.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      if (response.text) {
        setUpdateFormData(prev => ({ ...prev, diagnosis: response.text }));
        toast.success('Sugestão de diagnóstico gerada pela IA!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar sugestão da IA. Verifique sua chave API.');
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-main">Ordens de Serviço</h2>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger 
            render={
              <Button className="btn-professional-primary">
                <Plus className="w-4 h-4 mr-2" />
                Nova Ordem de Serviço
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden max-h-[95vh] flex flex-col">
            <form onSubmit={handleAddOrder} className="flex flex-col h-full overflow-hidden">
              <DialogHeader className="p-6 pb-2 shrink-0">
                <DialogTitle>Abrir Nova Ordem de Serviço</DialogTitle>
                <DialogDescription>
                  Inicie um novo atendimento técnico para um cliente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto overflow-x-auto px-6">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Cliente</Label>
                    <Select 
                      value={formData.clientId} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, clientId: val, equipmentId: '' }))}
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
                    <Label className="text-right">Equipamento</Label>
                    <Select 
                      value={formData.equipmentId} 
                      onValueChange={(val) => {
                        const e = equipment.find(item => item.id === val);
                        setFormData(prev => ({ 
                          ...prev, 
                          equipmentId: val,
                          clientId: e ? e.clientId : prev.clientId
                        }));
                      }}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o equipamento">
                          {(() => {
                            const e = equipment.find(e => e.id === formData.equipmentId);
                            return e ? `${e.brand} ${e.model} (${e.serialNumber})` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-72">
                          {(formData.clientId 
                            ? equipment.filter(e => e.clientId === formData.clientId)
                            : equipment
                          ).map(e => {
                            const client = clients.find(c => c.id === e.clientId);
                            return (
                              <SelectItem key={e.id} value={e.id}>
                                <div className="flex flex-col">
                                  <span>{e.brand} {e.model} ({e.serialNumber})</span>
                                  {!formData.clientId && <span className="text-[10px] text-muted-foreground">Cliente: {client?.name || '---'}</span>}
                                </div>
                              </SelectItem>
                            );
                          })}
                          {equipment.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Nenhum equipamento cadastrado.
                            </div>
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Prioridade</Label>
                    <Select 
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Previsão</Label>
                    <Input 
                      type="date"
                      name="estimatedDeliveryDate"
                      className="col-span-3"
                      value={formData.estimatedDeliveryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Descrição</Label>
                    <textarea 
                      name="description"
                      className="col-span-3 flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Relato do cliente sobre o defeito..."
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="p-6 pt-2 border-t border-border shrink-0">
                <Button type="submit" disabled={isSubmitting} className="btn-professional-primary w-full sm:w-auto">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Abrir OS
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => {
          setActiveTab(val);
          setStatusFilter('all');
        }} 
        className="w-full"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-36">
            <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val);
                if (val !== 'all') setActiveTab('all');
              }}
            >
              <SelectTrigger className="border-border focus:ring-primary h-8 text-[10px] font-bold uppercase tracking-wider bg-white/80 rounded-lg shadow-none">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-primary" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os Status</SelectItem>
                {Object.entries(OS_STATUS_LABELS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex bg-slate-100/50 border border-slate-200 p-0.5 rounded-lg">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-md transition-all", viewMode === 'card' ? "bg-white shadow-sm text-primary" : "text-text-muted hover:text-text-main")}
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-7 w-7 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-text-muted hover:text-text-main")}
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <ScrollArea orientation="horizontal" className="max-w-full">
            <TabsList className="bg-slate-100/50 border border-border p-1 rounded-xl inline-flex shrink-0">
              <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider px-4 flex items-center gap-2 h-8">
                {hasDelayedInActive && <TriangleAlert className="w-3 h-3 text-red-600 animate-pulse" />}
                Fila Ativa <Badge variant="secondary" className="h-3.5 min-w-[1rem] px-1 text-[8px] rounded-full bg-slate-200 text-slate-700">{counts.active}</Badge>
              </TabsTrigger>
              <TabsTrigger value="checklist" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider px-4 flex items-center gap-2 h-8">
                {hasDelayedInChecklist && <TriangleAlert className="w-3 h-3 text-red-600 animate-pulse" />}
                Checklist <Badge variant="secondary" className="h-3.5 min-w-[1rem] px-1 text-[8px] rounded-full bg-slate-200 text-slate-700">{counts.checklist}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider px-4 flex items-center gap-2 h-8">
                {hasDelayedInPending && <TriangleAlert className="w-3 h-3 text-red-600 animate-pulse" />}
                Orç. Enviado <Badge variant="secondary" className="h-3.5 min-w-[1rem] px-1 text-[8px] rounded-full bg-slate-200 text-slate-700">{counts.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider px-4 flex items-center gap-2 h-8">
                {hasDelayedInApproved && <TriangleAlert className="w-3 h-3 text-red-600 animate-pulse" />}
                Aprovadas <Badge variant="secondary" className="h-3.5 min-w-[1rem] px-1 text-[8px] rounded-full bg-slate-200 text-slate-700">{counts.approved}</Badge>
              </TabsTrigger>
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-wider px-4 flex items-center gap-2 h-8">
                Todas <Badge variant="secondary" className="h-3.5 min-w-[1rem] px-1 text-[8px] rounded-full bg-slate-200 text-slate-700">{counts.all}</Badge>
              </TabsTrigger>
            </TabsList>
          </ScrollArea>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <Input 
              placeholder="Buscar OS, cliente ou série..." 
              className="pl-9 border-border focus:ring-primary h-10 rounded-xl bg-white shadow-sm font-medium text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="card-professional">
          <CardContent className="p-0">
            {viewMode === 'list' ? (
              <div className="rounded-xl border border-border overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-text-muted font-bold text-[10px] uppercase tracking-wider py-3">Cliente / OS</TableHead>
                      <TableHead className="text-text-muted font-bold text-[10px] uppercase tracking-wider py-3">Equipamento / Série</TableHead>
                      <TableHead className="text-text-muted font-bold text-[10px] uppercase tracking-wider py-3">Status</TableHead>
                      <TableHead className="text-text-muted font-bold text-[10px] uppercase tracking-wider py-3">Prioridade</TableHead>
                      <TableHead className="text-text-muted font-bold text-[10px] uppercase tracking-wider py-3">Valor</TableHead>
                      <TableHead className="text-right text-text-muted font-bold text-[10px] uppercase tracking-wider py-3">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingOrders ? (
                      [1, 2, 3, 4, 5].map(i => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : sortedOrders.length > 0 ? (
                      sortedOrders.map((order) => {
                        const client = clientMap.get(order.clientId);
                        const equip = equipmentMap.get(order.equipmentId);
                        const isExpanded = expandedOrderId === order.id;
                        const orderHistory = statusHistory.filter(h => h.osId === order.id);

                        return (
                          <React.Fragment key={order.id}>
                            <TableRow 
                              className={cn(
                                "data-row-hover border-border h-11 cursor-pointer transition-colors",
                                isExpanded && "bg-slate-50/80 hover:bg-slate-50/80"
                              )}
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            >
                              <TableCell className="py-2">
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-text-main leading-none mb-1">{client?.name || '---'}</span>
                                  <Button 
                                    variant="link" 
                                    className="p-0 h-auto text-[10px] font-mono font-bold text-primary leading-none opacity-80 justify-start hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openUpdateDialog(order);
                                    }}
                                  >
                                    {order.osNumber}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex flex-col border-l border-slate-100 pl-3">
                                  <span className="text-sm font-medium text-text-main leading-none mb-1">{equip ? `${equip.brand} ${equip.model}` : '---'}</span>
                                  <span className="text-[10px] text-text-muted leading-none font-medium uppercase tracking-tighter">{equip?.serialNumber || '---'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                                <Select 
                                  value={order.status} 
                                  onValueChange={(val) => handleQuickStatusUpdate(order, val)}
                                >
                                  <SelectTrigger className="h-7 w-fit bg-transparent border-none p-0 focus:ring-0 shadow-none hover:bg-slate-50 rounded-md px-1.5 ring-offset-0">
                                    <Badge 
                                      variant="outline" 
                                      className={cn("font-bold text-[9px] h-5 uppercase tracking-wider border-border bg-slate-50 cursor-pointer pointer-events-none", OS_STATUS_LABELS[order.status].color)}
                                    >
                                      {OS_STATUS_LABELS[order.status].label}
                                    </Badge>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(OS_STATUS_LABELS).map(([val, { label }]) => (
                                      <SelectItem key={val} value={val} className="text-[10px] font-bold uppercase tracking-wider">
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", PRIORITY_LABELS[order.priority].color)}>
                                    {PRIORITY_LABELS[order.priority].label}
                                  </span>
                                  {equip?.estimatedDeliveryDate && 
                                   new Date(equip.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0)) && 
                                   !['ENTREGUE', 'CANCELADO', 'PRONTA'].includes(order.status) && (
                                   <div className="flex items-center gap-1">
                                     <TriangleAlert className="w-2.5 h-2.5 text-red-600 animate-pulse" />
                                     <span className="text-[9px] text-red-600 font-bold uppercase tracking-tighter">
                                       Atrasada ({new Date(equip.estimatedDeliveryDate).toLocaleDateString('pt-BR')})
                                     </span>
                                   </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-text-main text-sm font-semibold py-2">
                                {order.budget ? `R$ ${order.budget.toFixed(2)}` : '---'}
                              </TableCell>
                              <TableCell className="text-right py-2" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                  <DropdownMenuTrigger 
                                    render={
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-text-main">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    }
                                  />
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => openUpdateDialog(order)}>
                                      <Edit2 className="w-4 h-4" /> Atualizar / Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => copyTrackingLink(order.trackingToken)}>
                                      <LinkIcon className="w-4 h-4" /> Copiar Link Rastreio
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => handleSendWhatsApp(order)}>
                                      <MessageSquare className="w-4 h-4 text-green-600" /> Enviar WhatsApp
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 text-xs" onClick={() => handleGeneratePDF(order)}>
                                      <FileText className="w-4 h-4 text-blue-600" /> Gerar PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="gap-2 text-xs p-0">
                                      <a 
                              href={getTrackingUrl(order.trackingToken)}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 w-full px-2 py-1.5"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Eye className="w-4 h-4 text-indigo-600" /> Ver Link Público
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="gap-2 text-xs text-red-600 focus:text-red-600">
                                      <Trash2 className="w-4 h-4" /> Cancelar OS
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>

                            <AnimatePresence>
                              {isExpanded && (
                                <TableRow className="bg-slate-50 border-none hover:bg-slate-50 overflow-hidden">
                                  <TableCell colSpan={6} className="p-0">
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: "easeInOut" }}
                                    >
                                      <div className="px-6 py-4 border-l-4 border-primary bg-white m-2 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 border border-slate-100">
                                        <div 
                                          className="space-y-2 cursor-pointer group/field hover:bg-slate-50/50 p-2 -m-2 rounded-lg transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openUpdateDialog(order);
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                              <ClipboardList className="w-3 h-3 text-primary" />
                                              Relato Inicial
                                            </div>
                                            <Edit2 className="w-2.5 h-2.5 text-primary opacity-0 group-hover/field:opacity-50 transition-opacity" />
                                          </div>
                                          <p className="text-sm text-text-main bg-slate-50 p-3 rounded-md border border-slate-100 min-h-[60px]">
                                            {order.description || 'Nenhum detalhe informado.'}
                                          </p>
                                        </div>
                                        <div 
                                          className="space-y-2 cursor-pointer group/field hover:bg-slate-50/50 p-2 -m-2 rounded-lg transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openUpdateDialog(order);
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                              <Activity className="w-3 h-3 text-green-600" />
                                              Diagnóstico Técnico
                                            </div>
                                            <Edit2 className="w-2.5 h-2.5 text-primary opacity-0 group-hover/field:opacity-50 transition-opacity" />
                                          </div>
                                          <p className={cn(
                                            "text-sm p-3 rounded-md border min-h-[60px]",
                                            order.diagnosis 
                                              ? "text-text-main bg-green-50/30 border-green-100" 
                                              : "text-text-muted italic bg-slate-50 border-slate-100"
                                          )}>
                                            {order.diagnosis || 'Diagnóstico ainda não realizado.'}
                                          </p>
                                        </div>

                                        {order.attachments && order.attachments.length > 0 && (
                                          <div className="md:col-span-2 space-y-2">
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                              <Paperclip className="w-3 h-3 text-blue-600" />
                                              Anexos ({order.attachments.length})
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {order.attachments.map((file) => (
                                                <div 
                                                  key={file.id} 
                                                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-white transition-all cursor-pointer group/fileItem"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(file.url, '_blank');
                                                  }}
                                                >
                                                  <div className="shrink-0">
                                                    {file.type.startsWith('image/') ? (
                                                      <div className="w-6 h-6 rounded-md overflow-hidden border border-slate-200">
                                                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                      </div>
                                                    ) : (() => {
                                                      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                                                      const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
                                                      
                                                      if (isPdf) return <FileText className="w-4 h-4 text-red-600" />;
                                                      if (isExcel) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
                                                      return <FileIcon className="w-4 h-4 text-slate-500" />;
                                                    })()}
                                                  </div>
                                                  <span className="text-[10px] font-bold text-text-main truncate max-w-[120px] uppercase tracking-tighter group-hover/fileItem:text-primary">{file.name}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        <div className="md:col-span-2 space-y-2 mt-2">
                                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                            <History className="w-3 h-3 text-amber-600" />
                                            Histórico de Status
                                          </div>
                                          <div className="bg-slate-50 border border-slate-100 rounded-md overflow-hidden">
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-xs">
                                                <thead className="bg-slate-100/50 border-b border-slate-200">
                                                  <tr>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[9px]">Data/Hora</th>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[9px]">Status Anterior</th>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[9px]">Novo Status</th>
                                                    <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase text-[9px]">Responsável</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {orderHistory.length > 0 ? (
                                                    [...orderHistory].sort((a,b) => b.timestamp - a.timestamp).map(h => (
                                                      <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-white/50 transition-colors">
                                                        <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                                                          {new Date(h.timestamp).toLocaleString('pt-BR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                          })}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                          {h.fromStatus ? (
                                                            <Badge variant="outline" className="text-[9px] h-4 uppercase font-medium bg-white">
                                                              {OS_STATUS_LABELS[h.fromStatus]?.label || '---'}
                                                            </Badge>
                                                          ) : <span className="text-text-muted">---</span>}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                          <Badge variant="outline" className="text-[9px] h-4 uppercase font-bold text-primary border-primary/20 bg-primary/5">
                                                            {OS_STATUS_LABELS[h.toStatus]?.label || '---'}
                                                          </Badge>
                                                        </td>
                                                        <td className="px-3 py-2 font-medium text-text-main">
                                                          {h.changedBy}
                                                        </td>
                                                      </tr>
                                                    ))
                                                  ) : (
                                                    <tr>
                                                      <td colSpan={4} className="px-3 py-4 text-center text-text-muted italic">Nenhum histórico registrado.</td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </div>

                                        {order.budget !== undefined && (
                                          <div className="md:col-span-2 pt-2 border-t border-slate-50 flex items-center justify-between gap-4">
                              <span className="text-[10px] text-text-muted font-medium truncate flex-1">Link de Rastreio Público: <span className="font-mono text-primary select-all break-all cursor-help" title="Este link é exclusivo para este equipamento e pode ser compartilhado com seu cliente.">{getTrackingUrl(order.trackingToken)}</span></span>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                      window.open(getTrackingUrl(order.trackingToken), '_blank');
                                                }}
                                              >
                                                <Eye className="w-3 h-3 mr-1" /> Visualizar
                                              </Button>
                                              <Button 
                                                variant="link" 
                                                size="sm" 
                                                className="h-auto p-0 text-xs font-bold"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openUpdateDialog(order);
                                                }}
                                              >
                                                <Edit2 className="w-3 h-3 mr-1" /> Editar Detalhes
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-text-muted italic">
                          Nenhuma ordem de serviço encontrada nesta aba.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingOrders ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)
                ) : sortedOrders.length > 0 ? (
                  sortedOrders.map((order) => {
                    const client = clientMap.get(order.clientId);
                    const equip = equipmentMap.get(order.equipmentId);
                    const isDelayed = equip?.estimatedDeliveryDate && 
                                    new Date(equip.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0)) && 
                                    !['ENTREGUE', 'CANCELADO', 'PRONTA'].includes(order.status);

                    return (
                      <Card key={order.id} className="group overflow-hidden border-border bg-white hover:border-primary/50 transition-all hover:shadow-md rounded-2xl">
                        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between bg-slate-50/50">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">{order.osNumber}</span>
                            <h4 className="text-sm font-bold text-text-main line-clamp-1">{client?.name || '---'}</h4>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn("font-bold text-[9px] uppercase tracking-wider border-border bg-white whitespace-nowrap", OS_STATUS_LABELS[order.status].color)}
                          >
                            {OS_STATUS_LABELS[order.status].label}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-4 pt-3 space-y-4">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-text-muted font-semibold uppercase text-[9px] tracking-wider">Equipamento</span>
                              <span className="font-bold text-text-main">{equip ? `${equip.brand} ${equip.model}` : '---'}</span>
                              <span className="text-[10px] text-text-muted font-mono">{equip?.serialNumber || '---'}</span>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-border bg-white", PRIORITY_LABELS[order.priority].color)}>
                                {PRIORITY_LABELS[order.priority].label}
                              </span>
                              {isDelayed && (
                                <Badge variant="destructive" className="h-4 text-[8px] animate-pulse">ATRASADA</Badge>
                              )}
                            </div>
                          </div>

                          {order.attachments && order.attachments.length > 0 && (
                            <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-50">
                              {order.attachments.slice(0, 3).map((file) => (
                                <div 
                                  key={file.id} 
                                  className="flex items-center gap-1.5 p-1 px-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-primary/30 hover:bg-white transition-all cursor-pointer group/fileItem"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(file.url, '_blank');
                                  }}
                                  title={file.name}
                                >
                                  {file.type.startsWith('image/') ? (
                                    <div className="w-3.5 h-3.5 rounded-sm overflow-hidden border border-slate-200">
                                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                    </div>
                                  ) : (() => {
                                    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                                    const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
                                    if (isPdf) return <FileText className="w-3 h-3 text-red-600" />;
                                    if (isExcel) return <FileSpreadsheet className="w-3 h-3 text-green-600" />;
                                    return <FileIcon className="w-3 h-3 text-slate-500" />;
                                  })()}
                                  <span className="text-[8px] font-bold text-text-main truncate max-w-[60px] uppercase tracking-tighter group-hover/fileItem:text-primary">
                                    {file.name}
                                  </span>
                                </div>
                              ))}
                              {order.attachments.length > 3 && (
                                <div className="text-[8px] font-bold text-text-muted flex items-center bg-slate-100 px-1.5 rounded-md">
                                  +{order.attachments.length - 3}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-text-muted font-semibold uppercase text-[9px] tracking-wider">Orçamento</span>
                              <span className="text-sm font-bold text-primary">{order.budget ? `R$ ${order.budget.toFixed(2)}` : 'Pendente'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <a 
                                href={getTrackingUrl(order.trackingToken)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-3 inline-flex items-center justify-center text-xs font-bold gap-2 text-text-muted hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Eye className="w-3.5 h-3.5" /> Ver
                              </a>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-3 text-xs font-bold gap-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-colors"
                                onClick={() => openUpdateDialog(order)}
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Editar
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger 
                                  render={
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-slate-100">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  }
                                />
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="p-0">
                                    <a 
                                href={getTrackingUrl(order.trackingToken)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm"
                                    >
                                      Visualizar Rastreio
                                    </a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => copyTrackingLink(order.trackingToken)}>Link Rastreio</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendWhatsApp(order)}>WhatsApp</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleGeneratePDF(order)}>Gerar PDF</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-full py-12 text-center text-text-muted italic bg-white border border-border rounded-2xl">
                    Nenhuma ordem de serviço encontrada nesta aba.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={!!updatingOrder} onOpenChange={(open) => !open && setUpdatingOrder(null)}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[95vh] flex flex-col">
          {updatingOrder && (
            <form onSubmit={handleUpdateStatus} className="flex flex-col h-full overflow-hidden">
              <DialogHeader className="p-6 pb-2 shrink-0 bg-slate-50 border-b border-border/50">
                <div className="flex items-center justify-between pr-8">
                  <div>
                    <DialogTitle className="text-xl font-bold text-primary">{updatingOrder.osNumber}</DialogTitle>
                    <DialogDescription className="font-medium">Atualização de Status e Diagnóstico</DialogDescription>
                  </div>
                  <Badge className={cn("font-bold uppercase tracking-widest", PRIORITY_LABELS[updatingOrder.priority].color)}>
                    Prioridade {updatingOrder.priority}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Status do Processo</Label>
                    <Select 
                      value={updateFormData.status} 
                      onValueChange={(val) => setUpdateFormData(prev => ({ ...prev, status: val }))}
                    >
                      <SelectTrigger className="w-full font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OS_STATUS_LABELS).map(([val, { label }]) => (
                          <SelectItem key={val} value={val} className="font-medium">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Orçamento (R$)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={updateFormData.budget}
                      onChange={(e) => setUpdateFormData(prev => ({ ...prev, budget: e.target.value }))}
                      className="font-bold text-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Data Prevista de Entrega</Label>
                  <Input 
                    type="date"
                    value={updateFormData.estimatedDeliveryDate}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                    className="font-medium"
                  />
                  <p className="text-[10px] text-text-muted">A OS será marcada como "Atrasada" se passar desta data e não estiver pronta/entregue.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Relato Inicial (Problema)</Label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium"
                    placeholder="Relato do cliente..."
                    value={updateFormData.description}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, description: toUpperCase(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Diagnóstico Técnico</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] font-bold gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all"
                      onClick={handleSuggestDiagnosis}
                      disabled={isSuggesting}
                    >
                      {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Sugerir com IA
                    </Button>
                  </div>
                  <textarea 
                    className="flex min-h-[140px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium"
                    placeholder="Detalhe o defeito encontrado e a solução proposta..."
                    value={updateFormData.diagnosis}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, diagnosis: toUpperCase(e.target.value) }))}
                  />

                  <div className="pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Anexos do Diagnóstico</Label>
                    </div>

                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "relative border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center gap-2",
                        isDragging ? "bg-primary/5 border-primary scale-[1.01]" : "bg-slate-50/50 border-slate-200",
                        isUploading && "opacity-50 pointer-events-none"
                      )}
                    >
                      <input 
                        type="file" 
                        id="os-file-upload" 
                        className="hidden" 
                        multiple 
                        accept="image/jpeg,image/png,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                      </div>

                      <div className="text-center">
                        <Label 
                          htmlFor="os-file-upload" 
                          className="text-xs font-black text-text-main hover:text-primary cursor-pointer transition-colors block"
                        >
                          {isUploading ? `Enviando... ${Math.round(uploadProgress)}%` : 'Clique para anexar ou arraste arquivos aqui'}
                        </Label>
                        {isUploading && (
                          <div className="w-full max-w-[200px] bg-slate-100 h-1 rounded-full mt-2 overflow-hidden mx-auto">
                            <div 
                              className="bg-primary h-full transition-all duration-300" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        )}
                        <p className="text-[10px] text-text-muted font-medium mt-1">
                          IMG, PDF, DOC, TXT, XLS (Máx. 10MB)
                        </p>
                      </div>

                      {isDragging && (
                        <div className="absolute inset-0 bg-primary/10 rounded-xl flex items-center justify-center pointer-events-none border-2 border-primary animate-pulse">
                          <p className="text-xs font-bold text-primary uppercase">Solte para anexar</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {updateFormData.attachments.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="shrink-0">
                              {file.type.startsWith('image/') ? (
                                <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (() => {
                                const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                                const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
                                const isWord = file.type.includes('word') || file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
                                
                                if (isPdf) return (
                                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center border border-red-100">
                                    <FileText className="w-4 h-4 text-red-600" />
                                  </div>
                                );
                                if (isExcel) return (
                                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center border border-green-100">
                                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                  </div>
                                );
                                if (isWord) return (
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                  </div>
                                );
                                return (
                                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                                    <FileIcon className="w-4 h-4 text-slate-600" />
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] font-bold text-text-main truncate uppercase tracking-tighter" title={file.name}>{file.name}</span>
                              <span className="text-[9px] text-text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-lg text-text-muted hover:text-primary"
                              onClick={() => window.open(file.url, '_blank')}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-lg text-text-muted hover:text-red-600"
                              onClick={() => removeAttachment(file.id)}
                            >
                              <CloseIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {updateFormData.attachments.length === 0 && (
                      <p className="text-[9px] text-text-muted text-center py-2 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                        Nenhum arquivo anexado ao diagnóstico.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Observações Internas (Histórico)</Label>
                  <Input 
                    placeholder="Ex: Aguardando retorno do cliente sobre as peças..."
                    value={updateFormData.notes}
                    onChange={(e) => setUpdateFormData(prev => ({ ...prev, notes: toUpperCase(e.target.value) }))}
                    className="h-12"
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-border/50 text-xs text-text-muted leading-relaxed">
                  <p className="font-bold uppercase mb-1 flex items-center gap-1.5"><Activity className="w-3 h-3 text-primary" /> Lembrete Operacional</p>
                  Mudar o status para <strong>PRONTA</strong> notificará automaticamente o sistema de faturamento. Certifique-se de que o diagnóstico está completo.
                </div>
              </div>

              <DialogFooter className="p-6 pt-2 border-t border-border bg-slate-50 shrink-0">
                <Button variant="ghost" type="button" onClick={() => setUpdatingOrder(null)} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="btn-professional-primary min-w-[140px]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
