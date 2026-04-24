/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  History, 
  Search, 
  User, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-main">Log de Exclusões</h2>
          <p className="text-sm text-text-muted">Auditoria completa de todos os registros removidos do sistema.</p>
        </div>
      </div>

      <Card className="card-professional">
        <CardHeader className="p-0 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <Input 
                placeholder="Filtrar por entidade ou operador..." 
                className="pl-9 border-border focus:ring-primary h-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-border">
                  <TableHead className="w-[150px] text-text-muted font-bold text-[11px] uppercase tracking-wider">Data / Hora</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Entidade</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Descrição do Registro</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Motivo da Exclusão</TableHead>
                  <TableHead className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Operador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i} className="data-row-hover border-border">
                    <TableCell className="text-xs text-text-muted font-mono">
                      15/04/2024 14:3{i}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-wider bg-red-50 text-red-600 border-red-100">
                        {i === 1 ? 'CLIENTE' : i === 2 ? 'EQUIPAMENTO' : 'OS'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-text-main font-semibold">
                      {i === 1 ? 'João Silva' : i === 2 ? 'HP LaserJet 1020' : 'OS-20240410-0045'}
                    </TableCell>
                    <TableCell className="text-sm text-text-muted italic">
                      "Registro duplicado no sistema"
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-text-main font-medium">
                        <User className="w-3 h-3 text-text-muted" />
                        Admin
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              <strong className="font-bold uppercase tracking-wider">Nota de Auditoria:</strong> Os registros excluídos não podem ser recuperados através da interface do sistema. 
              Este log serve apenas para fins de rastreabilidade e conformidade.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
