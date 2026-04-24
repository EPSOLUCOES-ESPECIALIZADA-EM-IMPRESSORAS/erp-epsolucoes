/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ClientType = 'PF' | 'PJ';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  document: string; // CPF or CNPJ
  phone: string;
  phone2?: string;
  email: string;
  address: string;
  cep?: string;
  notes?: string;
  priority: number; // 1-6
  isRental?: boolean;
  rentalModel?: string;
  rentalSerialNumber?: string;
  rentalId?: string;
  rentalTotalPages?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Equipment {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  serialNumber: string;
  color: string;
  type: string;
  warrantyStatus: 'IN_WARRANTY' | 'OUT_WARRANTY' | 'WARRANTY_RETURN';
  notes?: string;
  arrivalDate?: string;
  estimatedDeliveryDate?: string;
  createdAt: number;
  updatedAt: number;
}

export type OSStatus =
  | 'AGUARDANDO'
  | 'EM_CHECKLIST'
  | 'ORCAMENTO_ENCAMINHADO'
  | 'APROVADO'
  | 'AGUARDANDO_PECA'
  | 'EM_ANDAMENTO'
  | 'EM_TESTES'
  | 'FINALIZACAO'
  | 'PRONTA'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface OSAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: number;
}

export interface ServiceOrder {
  id: string;
  osNumber: string; // OS-YYYYMMDD-NNNN
  clientId: string;
  equipmentId: string;
  status: OSStatus;
  priority: number; // 1-6
  description: string;
  diagnosis?: string;
  budget?: number;
  trackingToken: string;
  attachments?: OSAttachment[];
  createdAt: number;
  updatedAt: number;
  finishedAt?: number;
}

export interface StatusHistory {
  id: string;
  osId: string;
  fromStatus: OSStatus;
  toStatus: OSStatus;
  changedBy: string;
  timestamp: number;
  notes?: string;
}

export interface DeletionLog {
  id: string;
  entityType: 'CLIENT' | 'EQUIPMENT' | 'OS';
  entityId: string;
  description: string;
  reason: string;
  deletedBy: string;
  timestamp: number;
}

export interface SystemSetting {
  id: string;
  category: 'EQUIPMENT_TYPE' | 'BRAND' | 'COLOR';
  value: string;
  active: boolean;
  order: number;
}
