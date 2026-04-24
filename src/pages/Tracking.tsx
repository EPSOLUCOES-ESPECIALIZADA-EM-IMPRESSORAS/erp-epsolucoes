import React from 'react';
import { useRoute } from 'wouter';
import { 
  Printer, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Wrench,
  Search,
  FileText,
  Eye,
  Paperclip,
  ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { OS_STATUS_LABELS, PRIORITY_LABELS } from '@/constants';
import { ServiceOrder, Client, Equipment } from '@/types';
import { useFirestoreCollection } from '@/hooks/useFirestore';
import { cn } from "@/lib/utils";
import { where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Tracking() {
  const [, params] = useRoute('/track/:token');
  const token = (params as any)?.token;

  const { data: orders, loading: loadingOrders } = useFirestoreCollection<ServiceOrder>(
    'orders', 
    token ? [where('trackingToken', '==', token)] : [],
    true
  );
  
  const [client, setClient] = React.useState<Client | null>(null);
  const [equip, setEquip] = React.useState<Equipment | null>(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);

  const order = orders[0];

  React.useEffect(() => {
    async function fetchDetails() {
      if (order) {
        setLoadingDetails(true);
        try {
          const clientDoc = await getDoc(doc(db, 'clients', order.clientId));
          const equipDoc = await getDoc(doc(db, 'equipment', order.equipmentId));
          
          if (clientDoc.exists()) setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
          if (equipDoc.exists()) setEquip({ id: equipDoc.id, ...equipDoc.data() } as Equipment);
        } catch (error) {
          console.error("Error fetching details", error);
        } finally {
          setLoadingDetails(false);
        }
      }
    }
    fetchDetails();
  }, [order]);

  if (loadingOrders || loadingDetails) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Buscando sua ordem de serviço...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 shadow-xl border-slate-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">OS não encontrada</h1>
          <p className="text-slate-500 mt-2">O código de rastreio informado é inválido ou a OS não existe.</p>
          <div className="mt-8">
            <p className="text-xs text-slate-400">Verifique os caracteres e tente novamente.</p>
          </div>
        </Card>
      </div>
    );
  }

  const steps = [
    { id: 'AGUARDANDO', icon: Clock, label: 'Entrada' },
    { id: 'ORCAMENTO_ENCAMINHADO', icon: Search, label: 'Orçamento' },
    { id: 'APROVADO', icon: CheckCircle2, label: 'Aprovado' },
    { id: 'EM_ANDAMENTO', icon: Wrench, label: 'Em Reparo' },
    { id: 'PRONTA', icon: Package, label: 'Pronta' },
    { id: 'ENTREGUE', icon: MapPin, label: 'Entregue' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Printer className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">EPSOLUÇÕES</h1>
          <Badge variant="outline" className="bg-white px-4 py-1 text-primary font-mono text-sm border-primary/20">
            {order.osNumber}
          </Badge>
        </div>

        {/* Status Card */}
        <Card className="shadow-xl border-none overflow-hidden bg-white">
          <div className={cn("h-2 w-full", OS_STATUS_LABELS[order.status].color.split(' ')[0].replace('text-', 'bg-'))} />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Status do Atendimento</CardTitle>
                <CardDescription>Acompanhe em tempo real o progresso do seu equipamento.</CardDescription>
              </div>
              <Badge className={cn("font-bold text-xs uppercase tracking-wider", OS_STATUS_LABELS[order.status].color)}>
                {OS_STATUS_LABELS[order.status].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 py-6">
            {/* Steps Timeline */}
            <div className="relative pt-12">
              <div className="absolute top-[60px] left-0 w-full h-[2px] bg-slate-100 -z-10" />
              <div 
                className="absolute top-[60px] left-0 h-[2px] bg-primary transition-all duration-1000 -z-10" 
                style={{ width: `${progress}%` }}
              />
              <div className="flex justify-between relative">
                {steps.map((step, idx) => {
                  const isActive = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const Icon = step.icon;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm",
                        isActive ? "bg-primary text-white" : "bg-white text-slate-300 border border-slate-100",
                        isCurrent && "ring-4 ring-primary/20 animate-pulse"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={cn(
                        "text-[10px] md:text-xs font-bold uppercase tracking-tighter text-center",
                        isActive ? "text-slate-900" : "text-slate-300"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equipment Info */}
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equipamento</p>
                <p className="font-bold text-slate-900">{equip?.brand} {equip?.model}</p>
                <p className="text-xs text-slate-500 font-mono italic">{equip?.serialNumber}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</p>
                <p className="font-bold text-slate-900">{client?.name}</p>
                <p className="text-xs text-slate-500">Iniciado em {new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Description / Feedback */}
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Wrench className="w-4 h-4" />
                  <h4 className="text-sm font-bold uppercase tracking-wider">Descrição do Problema</h4>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  "{order.description}"
                </p>
              </div>

              {order.diagnosis && (
                <div className="p-6 rounded-xl bg-indigo-50 border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4 className="text-sm font-bold uppercase tracking-wider">Diagnóstico Técnico</h4>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {order.diagnosis}
                  </p>
                </div>
              )}

              {order.attachments && order.attachments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Paperclip className="w-4 h-4" />
                    <h4 className="text-sm font-bold uppercase tracking-wider">Anexos e Fotos</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {order.attachments.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 group hover:border-primary/50 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="shrink-0">
                            {file.type.startsWith('image/') ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center border border-red-100">
                                <FileText className="w-5 h-5 text-red-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-[11px] font-bold text-slate-900 truncate uppercase tracking-tight" title={file.name}>{file.name}</span>
                            <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 shrink-0"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Budget */}
            {order.budget && order.status !== 'ENTREGUE' && (
              <div className="p-6 rounded-xl bg-green-50 border border-green-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1">Valor do Orçamento</h4>
                  <p className="text-2xl font-black text-green-800 tracking-tight">
                    R$ {order.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Badge className="bg-green-500 text-white border-none px-4 py-2 text-sm">
                  {order.status === 'ORCAMENTO_ENCAMINHADO' ? 'Aguardando Aprovação' : 'Aprovado'}
                </Badge>
              </div>
            )}
          </CardContent>
          
          {/* Footer */}
          <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              Dúvidas? Entre em contato pelo WhatsApp da nossa assistência.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
