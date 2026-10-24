import type { CartItem } from '@/types/product';

export interface Cuenta {
  id: string;
  tipo: 'cobrar' | 'pagar';
  titular: string;
  telefono?: string;
  items: CartItem[];
  abono: number;
  fecha: string;
  estado: 'pendiente' | 'pagado';
}

export interface Ingreso {
  id: string;
  montoUSD: number;
  costoUSD: number;
  gananciaUSD: number;
  metodo: string;
  fecha: string;
  origen: string;
  descripcion: string;
  itemsVueltos?: CartItem[];
}

export interface CierreDiario {
  id: string;
  fecha: string;
  totalVentas: number;
  totalGanancia: number;
  desgloseMetodos: Record<string, { bruto: number; comision: number; neto: number }>;
  ingresos: Ingreso[];
}
