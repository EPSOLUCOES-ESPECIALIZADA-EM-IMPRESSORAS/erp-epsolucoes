/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Search as SearchIcon, 
  Users, 
  Printer, 
  ClipboardList,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { useFirestoreCollection } from '@/hooks/useFirestore';
import { Client, Equipment, ServiceOrder } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<'ALL' | 'CLIENTS' | 'EQUIPMENT' | 'ORDERS'>('ALL');

  const { data: clients, loading: loadingClients } = useFirestoreCollection<Client>('clients');
  const { data: equipment, loading: loadingEquipment } = useFirestoreCollection<Equipment>('equipment');
  const { data: orders, loading: loadingOrders } = useFirestoreCollection<ServiceOrder>('orders');

  const loading = loadingClients || loadingEquipment || loadingOrders;

  const filteredResults = React.useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    
    const results: any[] = [];

    if (activeFilter === 'ALL' || activeFilter === 'CLIENTS') {
      const clientResults = clients.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.document.includes(term) ||
        (c.phone && c.phone.includes(term)) ||
        (c.phone2 && c.phone2.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
      ).map(c => ({ ...c, searchType: 'CLIENT' }));
      results.push(...clientResults);
    }

    if (activeFilter === 'ALL' || activeFilter === 'EQUIPMENT') {
      const equipmentResults = equipment.filter(e => 
        e.serialNumber.toLowerCase().includes(term) ||
        e.brand.toLowerCase().includes(term) ||
        e.model.toLowerCase().includes(term)
      ).map(e => ({ ...e, searchType: 'EQUIPMENT' }));
      results.push(...equipmentResults);
    }

    if (activeFilter === 'ALL' || activeFilter === 'ORDERS') {
      const orderResults = orders.filter(o => 
        o.osNumber.toLowerCase().includes(term)
      ).map(o => ({ ...o, searchType: 'ORDER' }));
      results.push(...orderResults);
    }

    return results;
  }, [searchTerm, activeFilter, clients, equipment, orders]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-main">Busca Global</h2>
        <p className="text-sm text-text-muted">Encontre rapidamente clientes, equipamentos ou ordens de serviço.</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <Input 
            placeholder="Digite sua busca aqui..." 
            className="pl-12 h-14 text-lg border-border shadow-sm focus:ring-primary rounded-2xl bg-surface"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          <Badge 
            variant={activeFilter === 'ALL' ? 'secondary' : 'outline'} 
            className={cn("px-4 py-1.5 cursor-pointer transition-colors rounded-full font-semibold text-[11px] uppercase tracking-wider", activeFilter === 'ALL' ? "bg-primary text-white hover:bg-primary/90" : "border-border text-text-muted hover:bg-slate-50")}
            onClick={() => setActiveFilter('ALL')}
          >
            Tudo
          </Badge>
          <Badge 
            variant={activeFilter === 'CLIENTS' ? 'secondary' : 'outline'} 
            className={cn("px-4 py-1.5 cursor-pointer transition-colors rounded-full font-semibold text-[11px] uppercase tracking-wider", activeFilter === 'CLIENTS' ? "bg-primary text-white hover:bg-primary/90" : "border-border text-text-muted hover:bg-slate-50")}
            onClick={() => setActiveFilter('CLIENTS')}
          >
            Clientes
          </Badge>
          <Badge 
            variant={activeFilter === 'EQUIPMENT' ? 'secondary' : 'outline'} 
            className={cn("px-4 py-1.5 cursor-pointer transition-colors rounded-full font-semibold text-[11px] uppercase tracking-wider", activeFilter === 'EQUIPMENT' ? "bg-primary text-white hover:bg-primary/90" : "border-border text-text-muted hover:bg-slate-50")}
            onClick={() => setActiveFilter('EQUIPMENT')}
          >
            Equipamentos
          </Badge>
          <Badge 
            variant={activeFilter === 'ORDERS' ? 'secondary' : 'outline'} 
            className={cn("px-4 py-1.5 cursor-pointer transition-colors rounded-full font-semibold text-[11px] uppercase tracking-wider", activeFilter === 'ORDERS' ? "bg-primary text-white hover:bg-primary/90" : "border-border text-text-muted hover:bg-slate-50")}
            onClick={() => setActiveFilter('ORDERS')}
          >
            Ordens de Serviço
          </Badge>
        </div>
      </div>

      {searchTerm && searchTerm.length >= 2 ? (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
              {loading ? 'Buscando...' : `${filteredResults.length} resultados para "${searchTerm}"`}
            </h3>
          </div>
          
          {loading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : filteredResults.length > 0 ? (
            filteredResults.map((result: any) => (
              <Card key={result.id} className="card-professional hover:shadow-md transition-all cursor-pointer border-transparent hover:border-border">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      result.searchType === 'CLIENT' ? "bg-blue-50" : 
                      result.searchType === 'EQUIPMENT' ? "bg-indigo-50" : "bg-amber-50"
                    )}>
                      {result.searchType === 'CLIENT' ? <Users className="w-5 h-5 text-blue-600" /> : 
                       result.searchType === 'EQUIPMENT' ? <Printer className="w-5 h-5 text-indigo-600" /> : 
                       <ClipboardList className="w-5 h-5 text-amber-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-text-main">
                        {result.searchType === 'CLIENT' ? result.name : 
                         result.searchType === 'EQUIPMENT' ? `${result.brand} ${result.model}` : 
                         result.osNumber}
                      </p>
                      <p className="text-xs text-text-muted">
                        {result.searchType === 'CLIENT' ? `Cliente • ${result.document}` : 
                         result.searchType === 'EQUIPMENT' ? `Equipamento • Série: ${result.serialNumber}` : 
                         `Ordem de Serviço • ${result.status}`}
                      </p>
                    </div>
                  </div>
                  <Link 
                    href={result.searchType === 'CLIENT' ? "/clients" : result.searchType === 'EQUIPMENT' ? "/equipment" : "/orders"} 
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-text-muted hover:text-primary")}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-text-muted">Nenhum resultado encontrado para sua busca.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-24">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-6">
            <SearchIcon className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-text-muted font-medium">
            {searchTerm && searchTerm.length < 2 ? 'Digite pelo menos 2 caracteres...' : 'Comece a digitar para pesquisar...'}
          </p>
        </div>
      )}
    </div>
  );
}
