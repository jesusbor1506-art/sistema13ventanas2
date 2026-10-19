import { createContext, useContext, useState, type ReactNode } from 'react';
import * as XLSX from 'xlsx';
import type { Product, CartItem } from '@/types/product';
import type { Cuenta, Ingreso, CierreDiario } from '@/types/cuenta';

export interface KardexEntry {
  id: string;
  fecha: string;
  accion: 'precio' | 'stock' | 'eliminar';
  detalle: string;
  usuario: string;
}

function safeNum(v: string | number | undefined, fallback = 0): number {
  if (v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function productSellPrice(p: Product): number {
  const buy = safeNum(p.priceBuy);
  const gain = safeNum(p.gainPct);
  return buy + buy * (gain / 100);
}

export function calcularDeudaTotal(cuenta: Cuenta, productos: Product[]): number {
  return cuenta.items.reduce((sum, item: CartItem) => {
    const currentProduct = productos.find((p) => p.id === item.product.id);
    const product = currentProduct ?? item.product;

    const sellPrice = productSellPrice(product);
    let unitPrice = sellPrice;

    if (item.isBulto && safeNum(product.precioBulto) > 0) {
      unitPrice = safeNum(product.precioBulto);
    } else if (!item.isBulto && item.quantity >= 6 && safeNum(product.precioMayor) > 0) {
      unitPrice = safeNum(product.precioMayor);
    }

    return sum + unitPrice * item.quantity;
  }, 0);
}

export function getPrecioActual(product: Product): number {
  return productSellPrice(product);
}

interface StoreContextValue {
  tasaBs: number;
  tasaPts: number;
  setTasaBs: (v: number) => void;
  setTasaPts: (v: number) => void;

  products: Product[];
  addProduct: (p: Omit<Product, 'id'>) => void;
  addManyProducts: (items: Omit<Product, 'id'>[]) => void;
  updateProduct: (id: string, updates: Partial<Omit<Product, 'id'>>) => void;
  deleteProduct: (id: string) => void;
  reduceStock: (id: string, qty: number) => void;
  findByBarcodeOrName: (query: string) => Product | undefined;
  getPrecioActual: (codigoBarras: string) => number;

  cuentas: Cuenta[];
  addCuenta: (c: Omit<Cuenta, 'id' | 'abono' | 'estado'>) => void;
  abonarCuenta: (id: string, monto: number, metodo: string) => void;
  calcularDeudaTotal: (cuenta: Cuenta) => number;

  ingresos: Ingreso[];
  registrarIngreso: (ingreso: Omit<Ingreso, 'id'>) => void;

  cierresDiarios: CierreDiario[];
  cerrarJornada: (cierre: CierreDiario) => void;

  logoBase64: string | null;
  setLogo: (base64: string | null) => void;
  kardex: KardexEntry[];
  registrarKardex: (accion: KardexEntry['accion'], detalle: string) => void;
  exportarDeudoresExcel: () => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const seedProducts: Product[] = [
  { id: 'p1', barcode: '7591234567890', name: 'Cuaderno Universitario', stock: 24, priceBuy: 1.5, gainPct: 40, precioMayor: 1.8, precioBulto: 15.0 },
  { id: 'p2', barcode: '7591234567891', name: 'Lápiz HB #2', stock: 3, priceBuy: 0.25, gainPct: 60, precioMayor: 0.3, precioBulto: 2.0 },
  { id: 'p3', barcode: '7591234567892', name: 'Caja de Lápices de Colores', stock: 15, priceBuy: 3.0, gainPct: 35, precioMayor: 3.5, precioBulto: 30.0 },
  { id: 'p4', barcode: '7591234567893', name: 'Resma de Papel A4', stock: 2, priceBuy: 5.0, gainPct: 30, precioMayor: 5.8, precioBulto: 50.0 },
  { id: 'p5', barcode: '7591234567894', name: 'Borrador de Lápiz', stock: 50, priceBuy: 0.15, gainPct: 50, precioMayor: 0.18, precioBulto: 1.2 },
  { id: 'p6', barcode: '7591234567895', name: 'Tijera Escolar', stock: 8, priceBuy: 1.2, gainPct: 45, precioMayor: 1.4, precioBulto: 12.0 },
];

function loadProducts(): Product[] {
  const raw = localStorage.getItem('erp_products');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      // fall through
    }
  }
  localStorage.setItem('erp_products', JSON.stringify(seedProducts));
  return seedProducts;
}

function loadRate(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  if (raw) {
    const n = parseFloat(raw);
    if (!isNaN(n)) return n;
  }
  localStorage.setItem(key, String(fallback));
  return fallback;
}

function genId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function migrateIngresos(raw: string): Ingreso[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item: Record<string, unknown>) => ({
        id: (item.id as string) || genId(),
        montoUSD: safeNum(item.montoUSD as number),
        costoUSD: safeNum(item.costoUSD as number),
        gananciaUSD: safeNum(item.gananciaUSD as number),
        metodo: (item.metodo as string) || 'Efectivo $',
        fecha: (item.fecha as string) || new Date().toLocaleString('es-VE'),
        origen: (item.origen as string) || 'venta_directa',
        descripcion: (item.descripcion as string) || 'Venta de mostrador',
      }));
    }
  } catch {
    // fall through
  }
  return [];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasaBs, setTasaBsState] = useState(() => loadRate('erp_tasa_bs', 150));
  const [tasaPts, setTasaPtsState] = useState(() => loadRate('erp_tasa_pts', 2.5));
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [cuentas, setCuentas] = useState<Cuenta[]>(() => {
    const raw = localStorage.getItem('erp_cuentas');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fall through
      }
    }
    return [];
  });
  const [ingresos, setIngresos] = useState<Ingreso[]>(() => {
    const raw = localStorage.getItem('erp_ingresos');
    if (raw) return migrateIngresos(raw);
    const oldRaw = localStorage.getItem('erp_ingresos_caja');
    if (oldRaw) {
      const migrated = migrateIngresos(oldRaw);
      localStorage.setItem('erp_ingresos', JSON.stringify(migrated));
      return migrated;
    }
    return [];
  });
  const [cierresDiarios, setCierresDiarios] = useState<CierreDiario[]>(() => {
    const raw = localStorage.getItem('erp_cierres');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fall through
      }
    }
    return [];
  });
  const [logoBase64, setLogoBase64] = useState<string | null>(() => {
    return localStorage.getItem('erp_logo_base64') || null;
  });
  const [kardex, setKardex] = useState<KardexEntry[]>(() => {
    const raw = localStorage.getItem('erp_kardex');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fall through
      }
    }
    return [];
  });

  const persistProducts = (next: Product[]) => {
    setProducts(next);
    localStorage.setItem('erp_products', JSON.stringify(next));
  };

  const setTasaBs = (v: number) => {
    setTasaBsState(v);
    localStorage.setItem('erp_tasa_bs', String(v));
  };

  const setTasaPts = (v: number) => {
    setTasaPtsState(v);
    localStorage.setItem('erp_tasa_pts', String(v));
  };

  const addProduct = (p: Omit<Product, 'id'>) => {
    persistProducts([...products, { ...p, id: genId() }]);
  };

  const addManyProducts = (items: Omit<Product, 'id'>[]) => {
    const mapped = items.map((item) => ({ ...item, id: genId() }));
    persistProducts([...products, ...mapped]);
  };

  const updateProduct = (id: string, updates: Partial<Omit<Product, 'id'>>) => {
    persistProducts(products.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProduct = (id: string) => {
    persistProducts(products.filter((p) => p.id !== id));
  };

  const reduceStock = (id: string, qty: number) => {
    persistProducts(
      products.map((p) =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock - qty) } : p,
      ),
    );
  };

  const persistCuentas = (next: Cuenta[]) => {
    setCuentas(next);
    localStorage.setItem('erp_cuentas', JSON.stringify(next));
  };

  const addCuenta = (c: Omit<Cuenta, 'id' | 'abono' | 'estado'>) => {
    const existingPending = cuentas.find(
      (cc) =>
        cc.titular.toLowerCase() === c.titular.trim().toLowerCase() &&
        cc.tipo === c.tipo &&
        cc.estado === 'pendiente',
    );

    if (existingPending) {
      persistCuentas(
        cuentas.map((cc) =>
          cc.id === existingPending.id
            ? { ...cc, items: [...cc.items, ...c.items], fecha: c.fecha }
            : cc,
        ),
      );
    } else {
      const nueva: Cuenta = {
        ...c,
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        abono: 0,
        estado: 'pendiente',
      };
      persistCuentas([...cuentas, nueva]);
    }
  };

  const registrarIngreso = (ingreso: Omit<Ingreso, 'id'>) => {
    const nuevo: Ingreso = {
      ...ingreso,
      id: `ing_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    const next = [...ingresos, nuevo];
    setIngresos(next);
    localStorage.setItem('erp_ingresos', JSON.stringify(next));
  };

  const cerrarJornada = (cierre: CierreDiario) => {
    const next = [...cierresDiarios, cierre];
    setCierresDiarios(next);
    localStorage.setItem('erp_cierres', JSON.stringify(next));
    setIngresos([]);
    localStorage.removeItem('erp_ingresos');
  };

  const abonarCuenta = (id: string, monto: number, metodo: string) => {
    const cuenta = cuentas.find((c) => c.id === id);
    if (!cuenta) return;

    const nuevoAbono = cuenta.abono + monto;
    const deudaTotal = calcularDeudaTotal(cuenta, products);

    persistCuentas(
      cuentas.map((c) =>
        c.id === id
          ? {
              ...c,
              abono: nuevoAbono,
              estado: nuevoAbono >= deudaTotal ? ('pagado' as const) : c.estado,
            }
          : c,
      ),
    );

    registrarIngreso({
      montoUSD: monto,
      costoUSD: 0,
      gananciaUSD: monto,
      metodo,
      fecha: new Date().toLocaleString('es-VE'),
      origen: 'abono_deuda',
      descripcion: `Abono de ${cuenta.titular}`,
    });
  };

  const calcularDeudaTotalBound = (cuenta: Cuenta): number =>
    calcularDeudaTotal(cuenta, products);

  const findByBarcodeOrName = (query: string): Product | undefined => {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;
    return products.find(
      (p) => p.barcode.toLowerCase() === q || p.name.toLowerCase().includes(q),
    );
  };

  const getPrecioActualBound = (codigoBarras: string): number => {
    const p = products.find((pr) => pr.barcode === codigoBarras);
    if (!p) return 0;
    return productSellPrice(p);
  };

  const setLogo = (base64: string | null) => {
    setLogoBase64(base64);
    if (base64) {
      localStorage.setItem('erp_logo_base64', base64);
    } else {
      localStorage.removeItem('erp_logo_base64');
    }
  };

  const registrarKardex = (accion: KardexEntry['accion'], detalle: string) => {
    const entrada: KardexEntry = {
      id: `kx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fecha: new Date().toLocaleString('es-VE'),
      accion,
      detalle,
      usuario: 'admin',
    };
    const next = [entrada, ...kardex];
    setKardex(next);
    localStorage.setItem('erp_kardex', JSON.stringify(next));
  };

  const exportarDeudoresExcel = () => {
    const deudores = cuentas
      .filter((c) => c.tipo === 'cobrar' && c.estado === 'pendiente')
      .map((c) => {
        const deuda = calcularDeudaTotal(c, products);
        return {
          Titular: c.titular,
          'Teléfono': c.telefono || '',
          'Deuda Total USD': deuda.toFixed(2),
          'Abonado USD': c.abono.toFixed(2),
          'Restante USD': (deuda - c.abono).toFixed(2),
          Estado: c.estado,
          Fecha: c.fecha,
          'Cantidad de Items': c.items.length,
        };
      });
    if (deudores.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(deudores);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Deudores');
    XLSX.writeFile(wb, 'Deudores_SuminOfica.xlsx');
  };

  return (
    <StoreContext.Provider
      value={{
        tasaBs,
        tasaPts,
        setTasaBs,
        setTasaPts,
        products,
        addProduct,
        addManyProducts,
        updateProduct,
        deleteProduct,
        reduceStock,
        findByBarcodeOrName,
        getPrecioActual: getPrecioActualBound,
        cuentas,
        addCuenta,
        abonarCuenta,
        calcularDeudaTotal: calcularDeudaTotalBound,
        ingresos,
        registrarIngreso,
        cierresDiarios,
        cerrarJornada,
        logoBase64,
        setLogo,
        kardex,
        registrarKardex,
        exportarDeudoresExcel,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return ctx;
}
