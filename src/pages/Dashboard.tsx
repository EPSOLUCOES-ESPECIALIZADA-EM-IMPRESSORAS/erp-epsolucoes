/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Users, 
  Printer, 
  Clock, 
  CheckCircle2, 
  ClipboardList, 
  TrendingUp,
  Plus,
  Search,
  ChevronRight,
  Activity,
  AlertTriangle,
  AlarmClock,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { useFirestoreCollection } from '@/hooks/useFirestore';
import { Client, Equipment, ServiceOrder } from '@/types';
import { OS_STATUS_LABELS } from '@/constants';
import { cn } from "@/lib/utils";
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, isPast, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function Dashboard() {
  const { data: clients, loading: loadingClients } = useFirestoreCollection<Client>('clients');
  const { data: equipment, loading: loadingEquipment } = useFirestoreCollection<Equipment>('equipment');
  const { data: orders, loading: loadingOrders } = useFirestoreCollection<ServiceOrder>('orders');

  const stats = [
    { label: 'Clientes', value: clients.length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/clients' },
    { label: 'Equipamentos', value: equipment.length.toString(), icon: Printer, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/equipment' },
    { label: 'Aguardando', value: orders.filter(o => o.status === 'AGUARDANDO').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', href: '/orders' },
    { label: 'Aprovadas', value: orders.filter(o => o.status === 'APROVADO').length.toString(), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', href: '/orders' },
    { label: 'Em Aberto', value: orders.filter(o => !['ENTREGUE', 'CANCELADO'].includes(o.status)).length.toString(), icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50', href: '/orders' },
    { label: 'Concluídas', value: orders.filter(o => o.status === 'ENTREGUE').length.toString(), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/orders' },
  ];

  const recentOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const statusData = orders.reduce((acc: any[], order) => {
    const existing = acc.find(a => a.name === OS_STATUS_LABELS[order.status].label);
    if (existing) existing.value++;
    else acc.push({ name: OS_STATUS_LABELS[order.status].label, value: 1, color: OS_STATUS_LABELS[order.status].color.split(' ')[1].replace('text-', '') });
    return acc;
  }, []);

  const COLORS = ['#3b82f6', '#8b5cf6', '#eab308', '#22c55e', '#ef4444', '#64748b'];

  const isLoading = loadingClients || loadingEquipment || loadingOrders;

  const alertOrders = orders.filter(order => {
    if (['ENTREGUE', 'CANCELADO'].includes(order.status)) return false;
    
    const equip = equipment.find(e => e.id === order.equipmentId);
    const isDelayed = equip?.estimatedDeliveryDate ? isPast(parseISO(equip.estimatedDeliveryDate)) && !isToday(parseISO(equip.estimatedDeliveryDate)) : false;
    const isDueToday = equip?.estimatedDeliveryDate ? isToday(parseISO(equip.estimatedDeliveryDate)) : false;
    const isHighPriority = order.priority >= 5;
    
    return isDelayed || isDueToday || isHighPriority;
  }).map(order => {
    const equip = equipment.find(e => e.id === order.equipmentId);
    const client = clients.find(c => c.id === order.clientId);
    const isDelayed = equip?.estimatedDeliveryDate ? isPast(parseISO(equip.estimatedDeliveryDate)) && !isToday(parseISO(equip.estimatedDeliveryDate)) : false;
    const isDueToday = equip?.estimatedDeliveryDate ? isToday(parseISO(equip.estimatedDeliveryDate)) : false;
    
    let alertType: 'delay' | 'today' | 'priority' = 'priority';
    if (isDelayed) alertType = 'delay';
    else if (isDueToday) alertType = 'today';
    
    return { ...order, alertType, equipment: equip, client };
  }).sort((a, b) => {
    // Sort by priority first (6 then 5), then by delay
    if (a.priority !== b.priority) return b.priority - a.priority;
    return 0;
  });

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-text-main uppercase italic italic-serif">Vista Geral</h2>
            <p className="text-sm text-text-muted font-medium">EPSOLUÇÕES EM IMPRESSORAS • Hub Operacional</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/orders" className={cn(buttonVariants({ variant: "default" }), "btn-professional-primary shadow-lg shadow-primary/20")}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Análise
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="card-professional group cursor-pointer hover:border-primary/50 transition-all hover:translate-y-[-2px] hover:shadow-xl duration-300">
              <CardContent className="p-6">
                <div className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110 duration-200", stat.bg)}>
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter opacity-70">LIVE</Badge>
                </div>
                {isLoading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <div className="text-3xl font-black text-text-main tracking-tighter">{stat.value}</div>
                )}
                <p className="text-[10px] text-text-muted mt-2 font-bold uppercase tracking-wider">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!isLoading && alertOrders.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-text-main uppercase tracking-tight italic italic-serif">Alertas Operacionais</h3>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Ações prioritárias e atrasos detectados</p>
              </div>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {alertOrders.slice(0, 4).map((alert) => (
              <Link key={alert.id} href="/orders">
                <Card className={cn(
                  "card-professional cursor-pointer hover:shadow-lg transition-all group border-l-4",
                  alert.alertType === 'delay' ? "border-l-red-500" : 
                  alert.alertType === 'today' ? "border-l-amber-500" : "border-l-indigo-500"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        alert.alertType === 'delay' ? "bg-red-50 text-red-600" : 
                        alert.alertType === 'today' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                      )}>
                        {alert.alertType === 'delay' ? <AlarmClock className="w-3.5 h-3.5" /> : 
                         alert.alertType === 'today' ? <Calendar className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      </div>
                      <Badge className={cn(
                        "text-[9px] font-black tracking-widest",
                        alert.alertType === 'delay' ? "bg-red-600" : 
                        alert.alertType === 'today' ? "bg-amber-600" : "bg-indigo-600"
                      )}>
                        {alert.alertType === 'delay' ? 'ATRASADO' : 
                         alert.alertType === 'today' ? 'HOJE' : 'URGENTE'}
                      </Badge>
                    </div>
                    
                    <h4 className="text-xs font-black text-text-main truncate uppercase tracking-tight block">
                      {alert.osNumber}
                    </h4>
                    <p className="text-[10px] text-text-muted font-bold uppercase truncate mt-0.5">
                      {alert.equipment ? `${alert.equipment.model}` : 'Sem equip.'} • {alert.client?.name || 'Cliente'}
                    </p>
                    
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Status</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary">{OS_STATUS_LABELS[alert.status].label}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {alertOrders.length > 4 && (
              <Link href="/orders" className="flex items-center justify-center p-4 border-2 border-dashed border-border rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="text-center">
                  <p className="text-xs font-black text-primary uppercase tracking-wider group-hover:underline">+{alertOrders.length - 4} mais</p>
                  <p className="text-[9px] text-text-muted font-bold uppercase mt-1">Ver todos os alertas</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 card-professional">
          <CardHeader className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-text-main uppercase italic italic-serif tracking-tight">Atividade Recente</CardTitle>
                <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Últimas 5 movimentações do sistema</p>
              </div>
              <Link href="/orders" className="text-primary text-xs font-bold hover:underline flex items-center gap-1 group">
                Ver Todas <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {isLoading ? (
                [1, 2, 3, 4, 5].map(i => <div key={i} className="p-6"><Skeleton className="h-12 w-full" /></div>)
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => {
                  const client = clients.find(c => c.id === order.clientId);
                  const equip = equipment.find(e => e.id === order.equipmentId);
                  return (
                    <div key={order.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-text-muted group-hover:bg-white transition-all shadow-inner">
                          <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-text-main tracking-tight font-mono uppercase">{order.osNumber}</p>
                          <p className="text-xs text-text-muted font-bold uppercase tracking-wider mt-0.5">
                            {equip ? `${equip.brand} ${equip.model}` : 'Equipamento'} <span className="mx-1 opacity-30">•</span> {client?.name || 'Cliente'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border-2",
                            order.status === 'ENTREGUE' ? "bg-emerald-50 text-success border-success/20" : "bg-blue-50 text-primary border-primary/20"
                          )}
                        >
                          {OS_STATUS_LABELS[order.status].label}
                        </Badge>
                        <p className="text-[10px] text-text-muted font-black uppercase tracking-tighter opacity-60">
                          {formatDistanceToNow(order.createdAt, { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-text-muted text-sm font-bold uppercase tracking-widest bg-slate-50/50 m-6 border-2 border-dashed border-border rounded-3xl">
                  Nenhuma ordem de serviço ativa.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 card-professional h-full flex flex-col">
          <CardHeader className="p-6 border-b border-border/50">
            <CardTitle className="text-lg font-black text-text-main uppercase italic italic-serif tracking-tight">Distribuição de Status</CardTitle>
            <p className="text-[11px] text-text-muted font-bold uppercase tracking-wider">Métrica de fluxo operacional</p>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center min-h-[300px]">
            {isLoading ? (
              <Skeleton className="h-[200px] w-full rounded-full" />
            ) : statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-text-muted text-xs font-bold uppercase tracking-widest">Aguardando dados...</div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              {statusData.slice(0, 4).map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-text-muted uppercase truncate tracking-tighter">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
