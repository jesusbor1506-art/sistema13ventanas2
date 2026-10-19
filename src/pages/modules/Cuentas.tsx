import { useState, useMemo, useRef } from 'react';
import {
  Plus,
  HandCoins,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  X,
  DollarSign,
  Coins,
  Smartphone,
  Banknote,
  ChevronDown,
  Phone,
  ShoppingCart,
  Printer,
  FileText,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import type { Cuenta } from '@/types/cuenta';
import type { CartItem, Product } from '@/types/product';

type TabType = 'cobrar' | 'pagar';
type MetodoPago = 'efectivo_usd' | 'efectivo_bs' | 'pago_movil';

function safeNum(v: string | number | undefined, fallback = 0): number {
  if (v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function priceSell(p: Product): number {
  const buy = safeNum(p.priceBuy);
  const gain = safeNum(p.gainPct);
  return buy + buy * (gain / 100);
}

function getItemLivePrice(item: CartItem, products: Product[]): number {
  const currentProduct = products.find((p) => p.id === item.product.id);
  const product = currentProduct ?? item.product;

  if (item.isBulto && safeNum(product.precioBulto) > 0) {
    return safeNum(product.precioBulto);
  }
  if (!item.isBulto && item.quantity >= 6 && safeNum(product.precioMayor) > 0) {
    return safeNum(product.precioMayor);
  }
  return priceSell(product);
}

export default function Cuentas() {
  const { cuentas, addCuenta, abonarCuenta, tasaBs, calcularDeudaTotal, products, exportarDeudoresExcel, logoBase64 } = useStore();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabType>('cobrar');
  const [showNewModal, setShowNewModal] = useState(false);
  const [abonoTarget, setAbonoTarget] = useState<Cuenta | null>(null);
  const [abonoMonto, setAbonoMonto] = useState('');
  const [abonoMoneda, setAbonoMoneda] = useState<'usd' | 'bs'>('usd');
  const [abonoMetodo, setAbonoMetodo] = useState<MetodoPago>('efectivo_usd');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notaCuenta, setNotaCuenta] = useState<Cuenta | null>(null);
  const [nuevaCuenta, setNuevaCuenta] = useState({
    tipo: 'cobrar' as TabType,
    titular: '',
    telefono: '',
    fecha: new Date().toISOString().slice(0, 10),
  });

  const cuentasFiltradas = useMemo(
    () => cuentas.filter((c) => c.tipo === activeTab),
    [cuentas, activeTab],
  );

  const totalPendiente = useMemo(
    () =>
      cuentasFiltradas
        .filter((c) => c.estado === 'pendiente')
        .reduce((sum, c) => sum + Math.max(0, calcularDeudaTotal(c) - c.abono), 0),
    [cuentasFiltradas, calcularDeudaTotal],
  );

  const totalPagado = useMemo(
    () =>
      cuentasFiltradas
        .filter((c) => c.estado === 'pagado')
        .reduce((sum, c) => sum + calcularDeudaTotal(c), 0),
    [cuentasFiltradas, calcularDeudaTotal],
  );

  const handleCreateCuenta = () => {
    if (!nuevaCuenta.titular.trim()) return;

    addCuenta({
      tipo: nuevaCuenta.tipo,
      titular: nuevaCuenta.titular.trim(),
      telefono: nuevaCuenta.telefono.trim() || undefined,
      items: [],
      fecha: nuevaCuenta.fecha,
    });

    setNuevaCuenta({
      tipo: 'cobrar',
      titular: '',
      telefono: '',
      fecha: new Date().toISOString().slice(0, 10),
    });
    setShowNewModal(false);
  };

  const metodoLabel: Record<MetodoPago, string> = {
    efectivo_usd: 'Efectivo $',
    efectivo_bs: 'Efectivo Bs',
    pago_movil: 'Pago Móvil',
  };

  const handleAbonar = () => {
    if (!abonoTarget) return;
    const raw = parseFloat(abonoMonto);
    if (isNaN(raw) || raw <= 0) return;

    const montoUsd = abonoMoneda === 'bs' ? raw / tasaBs : raw;
    abonarCuenta(abonoTarget.id, montoUsd, metodoLabel[abonoMetodo]);
    setAbonoTarget(null);
    setAbonoMonto('');
    setAbonoMoneda('usd');
    setAbonoMetodo('efectivo_usd');
  };

  const openAbonoModal = (cuenta: Cuenta) => {
    setAbonoTarget(cuenta);
    setAbonoMonto('');
    setAbonoMoneda('usd');
    setAbonoMetodo('efectivo_usd');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleGenerarNota = (cuenta: Cuenta) => {
    setNotaCuenta(cuenta);
    setTimeout(() => {
      window.print();
      setTimeout(() => setNotaCuenta(null), 500);
    }, 100);
  };

  const tabConfig = {
    cobrar: { label: 'Cuentas por Cobrar', sub: 'Clientes', icon: HandCoins },
    pagar: { label: 'Cuentas por Pagar', sub: 'Proveedores', icon: ArrowLeftRight },
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 print:hidden">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 bg-gold-400 rounded-xl flex items-center justify-center shadow-gold-sm">
            <HandCoins className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Centro de Cuentas</h1>
            <p className="text-sm text-gray-500">Deudas dinámicas — precios actualizados en vivo</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 print:hidden">
        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pendiente</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">${totalPendiente.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Bs. {(totalPendiente * tasaBs).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Saldado</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">${totalPagado.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Bs. {(totalPagado * tasaBs).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + New button + Export Excel (admin) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 print:hidden">
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-md border border-gray-100">
          {(Object.keys(tabConfig) as TabType[]).map((tab) => {
            const cfg = tabConfig[tab];
            const Icon = cfg.icon;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setExpandedId(null); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-gold-400 text-white shadow-gold-sm'
                    : 'text-gray-500 hover:bg-gold-50 hover:text-gold-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cfg.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {cuentas.filter((c) => c.tipo === tab).length}
                </span>
              </button>
            );
          })}
        </div>

        {user?.role === 'admin' && (
          <button
            onClick={exportarDeudoresExcel}
            disabled={cuentas.filter((c) => c.tipo === 'cobrar' && c.estado === 'pendiente').length === 0}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Deudas a Excel
          </button>
        )}

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-gold-400 to-gold-500 shadow-gold hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
        >
          <Plus className="w-4 h-4" />
          Nueva Cuenta
        </button>
      </div>

      {/* Cards Grid */}
      {cuentasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center print:hidden">
          <HandCoins className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No hay cuentas registradas en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
          {cuentasFiltradas.map((cuenta) => {
            const montoDinamico = calcularDeudaTotal(cuenta);
            const restante = montoDinamico - cuenta.abono;
            const isExpanded = expandedId === cuenta.id;
            const isPagado = cuenta.estado === 'pagado';

            return (
              <div
                key={cuenta.id}
                className={`bg-white rounded-2xl shadow-lg border overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'shadow-2xl border-gold-200 lg:col-span-1' : 'border-gray-100 hover:shadow-xl'
                } ${isPagado ? 'opacity-75' : ''}`}
              >
                {/* Card Header - clickable */}
                <div
                  onClick={() => toggleExpand(cuenta.id)}
                  className="cursor-pointer p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-gold-500 font-bold text-sm uppercase">
                          {cuenta.titular.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-800 truncate">{cuenta.titular}</h3>
                        {cuenta.telefono && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {cuenta.telefono}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPagado ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Pagado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-500">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Deuda Total</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-800">${montoDinamico.toFixed(2)}</span>
                        <span className="text-xs text-gray-400 ml-1.5">
                          Bs {(montoDinamico * tasaBs).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Abonado</span>
                      <span className="text-sm font-medium text-gray-600">${cuenta.abono.toFixed(2)}</span>
                    </div>
                    <div className="pt-2.5 border-t border-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">Restante</span>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${restante > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                            ${Math.abs(restante).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-400 block">
                            Bs {(Math.abs(restante) * tasaBs).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expandable section */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'max-h-[700px]' : 'max-h-0'
                  }`}
                >
                  <div className="px-5 pb-5">
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ShoppingCart className="w-4 h-4 text-gold-400" />
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ítems Fiados</h4>
                      </div>

                      {cuenta.items.length === 0 ? (
                        <p className="text-xs text-gray-300 text-center py-4">Sin ítems registrados</p>
                      ) : (
                        <div className="overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-gray-50">
                              <tr className="text-gray-400 uppercase">
                                <th className="text-left py-2 px-2 font-semibold">Producto</th>
                                <th className="text-left py-2 px-2 font-semibold whitespace-nowrap">Fecha/Hora</th>
                                <th className="text-center py-2 px-2 font-semibold">Cant.</th>
                                <th className="text-right py-2 px-2 font-semibold">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cuenta.items.map((item, idx) => {
                                const livePrice = getItemLivePrice(item, products);
                                const totalLine = livePrice * item.quantity;
                                return (
                                  <tr key={idx} className="border-t border-gray-50">
                                    <td className="py-2 px-2 text-gray-700 font-medium">
                                      {item.product.name}
                                      {item.isBulto && (
                                        <span className="ml-1 text-gold-500">(B)</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2 text-gray-400 whitespace-nowrap">
                                      {cuenta.fecha}
                                    </td>
                                    <td className="py-2 px-2 text-center text-gray-600">{item.quantity}</td>
                                    <td className="py-2 px-2 text-right font-semibold text-gray-700">
                                      ${totalLine.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-4">
                        {!isPagado && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openAbonoModal(cuenta); }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gold-500 bg-gold-50 hover:bg-gold-100 hover:text-gold-600 transition-all duration-300"
                          >
                            <HandCoins className="w-4 h-4" />
                            Abonar
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleGenerarNota(cuenta); }}
                          disabled={cuenta.items.length === 0}
                          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                            cuenta.items.length > 0
                              ? 'text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-700'
                              : 'text-gray-300 bg-gray-50 cursor-not-allowed'
                          }`}
                          title="Generar Nota de Entrega"
                        >
                          <Printer className="w-4 h-4" />
                          Nota
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print: Nota de Entrega — Diseño Gráfico Premium */}
      {notaCuenta && (
        <div className="hidden print:block absolute top-0 left-0 w-full h-full bg-white text-black p-8">
          <div className="max-w-3xl mx-auto relative">
            {/* Decorative bubbles */}
            <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full" style={{ backgroundColor: '#FFC300', opacity: 0.3 }} />
            <div className="absolute top-10 -left-6 w-24 h-24 rounded-full" style={{ backgroundColor: '#2563EB', opacity: 0.2 }} />
            <div className="absolute -bottom-2 right-10 w-20 h-20 rounded-full" style={{ backgroundColor: '#FFC300', opacity: 0.2 }} />

            <div className="relative">
              {/* Logo + Title */}
              <div className="flex flex-col items-center mb-6">
                {logoBase64 ? (
                  <img src={logoBase64} alt="Logo" className="h-20 w-auto mb-3 object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#D4AF37' }}>
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                )}
                <span
                  className="px-6 py-1.5 rounded-full text-sm font-bold tracking-widest text-white uppercase"
                  style={{ backgroundColor: '#2e1065' }}
                >
                  Nota de Entrega
                </span>
                <p className="text-xs text-gray-500 mt-2">Documento sin valor fiscal</p>
              </div>

              {/* Client info with colored underlines */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Nombre</p>
                  <p className="font-bold text-base pb-1 border-b-2" style={{ borderColor: '#2563EB' }}>{notaCuenta.titular}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Teléfono</p>
                  <p className="font-bold text-base pb-1 border-b-2" style={{ borderColor: '#2563EB' }}>
                    {notaCuenta.telefono || '—'}
                  </p>
                </div>
              </div>

              {/* Table with colored headers */}
              <table className="w-full text-sm border-collapse mb-6">
                <thead>
                  <tr>
                    <th className="text-center py-2 px-3 font-bold text-black" style={{ backgroundColor: '#FFC300' }}>
                      CANTIDAD
                    </th>
                    <th className="text-left py-2 px-3 font-bold text-white" style={{ backgroundColor: '#0EA5E9' }}>
                      ARTÍCULOS
                    </th>
                    <th className="text-center py-2 px-3 font-bold text-white" style={{ backgroundColor: '#2e1065' }}>
                      FECHA Y HORA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {notaCuenta.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-3 text-center font-semibold">{item.quantity}</td>
                      <td className="py-2 px-3 font-medium">{item.product.name}</td>
                      <td className="py-2 px-3 text-center text-gray-600">{notaCuenta.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Observaciones */}
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Observaciones</p>
                <div className="space-y-3">
                  <div className="border-b border-gray-300" />
                  <div className="border-b border-gray-300" />
                  <div className="border-b border-gray-300" />
                </div>
              </div>

              {/* Entregado por */}
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Entregado por</p>
                <div className="border-b-2 border-gray-400 w-64" />
              </div>

              {/* Signature line */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500">Firma del Cliente</p>
                <div className="border-b border-gray-400 mx-auto mt-12 w-64" />
              </div>

              {/* Footer */}
              <p className="text-center text-sm italic font-medium" style={{ color: '#2e1065' }}>
                Gracias por confiar en SuminOfica
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New Account Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm print:hidden"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Nueva Cuenta</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {(['cobrar', 'pagar'] as TabType[]).map((tipo) => {
                const cfg = tabConfig[tipo];
                const Icon = cfg.icon;
                return (
                  <button
                    key={tipo}
                    onClick={() => setNuevaCuenta({ ...nuevaCuenta, tipo })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 ${
                      nuevaCuenta.tipo === tipo
                        ? 'border-gold-400 bg-gold-50 text-gold-600'
                        : 'border-gray-200 text-gray-400 hover:border-gold-200'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{cfg.label}</span>
                    <span className="text-xs opacity-70">{cfg.sub}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  {nuevaCuenta.tipo === 'cobrar' ? 'Cliente' : 'Proveedor'}
                </label>
                <input
                  type="text"
                  value={nuevaCuenta.titular}
                  onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, titular: e.target.value })}
                  placeholder="Nombre del titular..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={nuevaCuenta.telefono}
                  onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, telefono: e.target.value })}
                  placeholder="Ej: 0414-1234567"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={nuevaCuenta.fecha}
                  onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, fecha: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all duration-300"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCuenta}
                disabled={!nuevaCuenta.titular.trim()}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 ${
                  nuevaCuenta.titular.trim()
                    ? 'bg-gradient-to-r from-gold-400 to-gold-500 shadow-gold-sm hover:shadow-gold'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Abono Modal */}
      {abonoTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm print:hidden"
          onClick={() => setAbonoTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Registrar Abono</h2>
                <p className="text-sm text-gray-400">{abonoTarget.titular}</p>
              </div>
              <button
                onClick={() => setAbonoTarget(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Deuda Dinámica</span>
                <span className="font-semibold text-gray-700">${calcularDeudaTotal(abonoTarget).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Abonado</span>
                <span className="font-semibold text-gray-600">${abonoTarget.abono.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-500 font-medium">Restante</span>
                <span className="font-bold text-orange-500">
                  ${(calcularDeudaTotal(abonoTarget) - abonoTarget.abono).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => { setAbonoMoneda('usd'); setAbonoMetodo('efectivo_usd'); }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 ${
                  abonoMoneda === 'usd'
                    ? 'border-gold-400 bg-gold-50 text-gold-600'
                    : 'border-gray-200 text-gray-400 hover:border-gold-200'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-semibold">Dólares</span>
              </button>
              <button
                onClick={() => { setAbonoMoneda('bs'); setAbonoMetodo('efectivo_bs'); }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-300 ${
                  abonoMoneda === 'bs'
                    ? 'border-gold-400 bg-gold-50 text-gold-600'
                    : 'border-gray-200 text-gray-400 hover:border-gold-200'
                }`}
              >
                <Coins className="w-5 h-5" />
                <span className="text-sm font-semibold">Bolívares</span>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Método de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'efectivo_usd' as MetodoPago, label: 'Efectivo $', icon: DollarSign },
                  { value: 'efectivo_bs' as MetodoPago, label: 'Efectivo Bs', icon: Banknote },
                  { value: 'pago_movil' as MetodoPago, label: 'Pago Móvil', icon: Smartphone },
                ]).map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      onClick={() => { setAbonoMetodo(m.value); setAbonoMoneda(m.value === 'efectivo_usd' ? 'usd' : 'bs'); }}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all duration-300 ${
                        abonoMetodo === m.value
                          ? 'border-gold-400 bg-gold-50 text-gold-600'
                          : 'border-gray-200 text-gray-400 hover:border-gold-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                Monto del Abono {abonoMoneda === 'usd' ? '($)' : '(Bs)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={abonoMonto}
                onChange={(e) => setAbonoMonto(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all duration-300"
              />
              {abonoMoneda === 'bs' && abonoMonto && !isNaN(parseFloat(abonoMonto)) && (
                <p className="text-xs text-gray-400 mt-2">
                  Equivale a ${(parseFloat(abonoMonto) / tasaBs).toFixed(2)} USD
                </p>
              )}
              {abonoMoneda === 'usd' && abonoMonto && !isNaN(parseFloat(abonoMonto)) && (
                <p className="text-xs text-gray-400 mt-2">
                  Equivale a Bs. {(parseFloat(abonoMonto) * tasaBs).toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setAbonoTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbonar}
                disabled={!abonoMonto || isNaN(parseFloat(abonoMonto)) || parseFloat(abonoMonto) <= 0}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 ${
                  abonoMonto && !isNaN(parseFloat(abonoMonto)) && parseFloat(abonoMonto) > 0
                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-sm hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Confirmar Abono
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
