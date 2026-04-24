/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OSStatus } from './types';

export const OS_STATUS_LABELS: Record<OSStatus, { label: string; color: string }> = {
  AGUARDANDO: { label: 'Aguardando', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  EM_CHECKLIST: { label: 'Em Checklist', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ORCAMENTO_ENCAMINHADO: { label: 'Orçamento Encaminhado', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  APROVADO: { label: 'Aprovado', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  AGUARDANDO_PECA: { label: 'Aguardando Peça', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  EM_TESTES: { label: 'Em Testes', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  FINALIZACAO: { label: 'Finalização', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  PRONTA: { label: 'Pronta', color: 'bg-green-50 text-green-700 border-green-200' },
  ENTREGUE: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-50 text-red-700 border-red-200' },
};

export const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Muito Baixa', color: 'text-slate-500' },
  2: { label: 'Baixa', color: 'text-blue-500' },
  3: { label: 'Normal', color: 'text-green-600' },
  4: { label: 'Média', color: 'text-amber-600' },
  5: { label: 'Alta', color: 'text-orange-600' },
  6: { label: 'Urgente', color: 'text-red-600 font-bold' },
};

export const WARRANTY_LABELS = {
  IN_WARRANTY: 'Em Garantia',
  OUT_WARRANTY: 'Fora de Garantia',
  WARRANTY_RETURN: 'Retorno de Garantia',
};
