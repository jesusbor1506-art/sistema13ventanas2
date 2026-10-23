import { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  Receipt,
  Wallet,
  HandCoins,
  Printer,
  X,
  Power,
  Percent,
  FileText,
  ShieldAlert,
  Calendar,
  Clock,
  ShoppingCart,
  Coins,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import type { CierreDiario } from '@/types/cuenta';

function safeNum(v: string | number | undefined, fallback = 0): number {
  if (v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? fallback : n;
}

const POS_COMMISSION = 0.025;

const METODO_COLORS: Record<string, string> = {
  'Divisas': '#2563EB',
  'Efectivo $': '#2563EB',
  'Efectivo Bs': '#F59E0B',
  'Punto': '#F59E0B',
  'Pago Móvil': '#F97316',
  'Transferencia': '#7C3AED',
};

export default function Ganancias() {
  const { ingresos, tasaBs, cerrarJornada, logoBase64 } = useStore();
  const { user } = useAuth();

  if (user?.role === 'cajero') {
    return (
      <div className="p-8 max-w-md mx-auto text-center print:hidden">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
        <p className="text-sm text-gray-500">Solo los Administradores pueden acceder al módulo de Ventas y Ganancias.</p>
      </div>
    );
  }

  const [showCierreModal, setShowCierreModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'ticket' | null>(null);
  const [cierreData, setCierreData] = useState<CierreDiario | null>(null);
  const [jornadaCerrada, setJornadaCerrada] = useState(false);
  const [now, setNow] = useState(new Date());

  const stats = useMemo(() => {
    const totalVentas = ingresos.reduce((sum, ing) => sum + safeNum(ing.montoUSD), 0);
    const totalGanancia = ingresos.reduce((sum, ing) => sum + safeNum(ing.gananciaUSD), 0);
    const totalCosto = ingresos.reduce((sum, ing) => sum + safeNum(ing.costoUSD), 0);

    const desglose: Record<string, { bruto: number; comision: number; neto: number }> = {};
    ingresos.forEach((ing) => {
      const m = ing.metodo;
      if (!desglose[m]) desglose[m] = { bruto: 0, comision: 0, neto: 0 };
      const monto = safeNum(ing.montoUSD);
      desglose[m].bruto += monto;
      if (m === 'Punto') {
        const com = monto * POS_COMMISSION;
        desglose[m].comision += com;
        desglose[m].neto += monto - com;
      } else {
        desglose[m].neto += monto;
      }
    });

    const ventasDirectas = ingresos
      .filter((i) => i.origen === 'venta_directa')
      .reduce((sum, i) => sum + safeNum(i.montoUSD), 0);

    const abonosDeuda = ingresos
      .filter((i) => i.origen === 'abono_deuda')
      .reduce((sum, i) => sum + safeNum(i.montoUSD), 0);

    return { totalVentas, totalGanancia, totalCosto, desglose, ventasDirectas, abonosDeuda };
  }, [ingresos]);

  const sortedIngresos = useMemo(
    () => [...ingresos].reverse(),
    [ingresos],
  );

  const getMetodoIcon = (metodo: string) => {
    if (metodo.includes('Divisas') || metodo.includes('Efectivo $')) return DollarSign;
    if (metodo.includes('Bs')) return Banknote;
    if (metodo.includes('Punto')) return CreditCard;
    if (metodo.includes('Móvil') || metodo.includes('Movil')) return Smartphone;
    return Receipt;
  };

  const donutData = useMemo(() => {
    const entries = Object.entries(stats.desglose);
    if (entries.length === 0 || stats.totalVentas === 0) return { gradient: '', segments: [] as { metodo: string; pct: number; monto: number; color: string }[] };

    let cumulative = 0;
    const segments = entries.map(([metodo, data]) => {
      const pct = (data.bruto / stats.totalVentas) * 100;
      const color = METODO_COLORS[metodo] || '#6366F1';
      const start = cumulative;
      cumulative += pct;
      return { metodo, pct, monto: data.bruto, color, start };
    });

    const stops = segments.map((s) => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ');
    return { gradient: `conic-gradient(${stops})`, segments };
  }, [stats]);

  const handleAbrirCierre = () => {
    setShowCierreModal(true);
  };

  const buildCierreData = (): CierreDiario => ({
    id: `cierre_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    fecha: new Date().toLocaleString('es-VE'),
    totalVentas: stats.totalVentas,
    totalGanancia: stats.totalGanancia,
    desgloseMetodos: stats.desglose,
    ingresos: [...ingresos],
  });

  const handleImprimir = (formato: 'a4' | 'ticket') => {
    const data = buildCierreData();
    setCierreData(data);
    setPrintFormat(formato);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        cerrarJornada(data);
        setPrintFormat(null);
        setCierreData(null);
        setShowCierreModal(false);
        setJornadaCerrada(true);
        setTimeout(() => setJornadaCerrada(false), 3000);
      }, 800);
    }, 150);
  };

  const fechaStr = now.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-VE');

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* === DASHBOARD HEADER === */}
      <div className="mb-8 print:hidden">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-5 gap-4">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              {logoBase64 ? (
                <img src={logoBase64} alt="Logo" className="h-12 w-auto object-contain" />
              ) : (
                <div className="w-12 h-12 bg-gold-400 rounded-xl flex items-center justify-center shadow-gold-sm">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-xs text-gold-500 font-semibold">Sumin Ofica</p>
                <p className="text-[10px] text-gray-400">ERP & Punto de Venta</p>
              </div>
            </div>

            {/* Center: Title */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1e3a8a' }}>
                CIERRE DE CAJA
              </h1>
              <p className="text-sm italic text-gray-500 mt-0.5">Tu aliado en papelería</p>
            </div>

            {/* Right: Date + Time */}
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Calendar className="w-4 h-4 text-gold-500" />
                <span className="capitalize">{fechaStr}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-4 h-4 text-gold-500" />
                <span>{horaStr}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Finalizar Día button */}
        {ingresos.length > 0 && (
          <div className="flex justify-end mt-4">
            <button
              onClick={handleAbrirCierre}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
            >
              <Power className="w-5 h-5" />
              Finalizar Día
            </button>
          </div>
        )}
      </div>

      {/* === TARJETAS SUPERIORES === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8 print:hidden">
        {/* Ventas Totales — Azul */}
        <div className="relative bg-blue-600 rounded-2xl shadow-lg p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
          <div className="relative flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="relative">
            <p className="text-xs font-bold text-white/80 uppercase tracking-wide mb-1">VENTAS EN TOTAL</p>
            <p className="text-3xl font-bold text-white">${stats.totalVentas.toFixed(2)}</p>
            <p className="text-xs text-white/70 mt-1">
              Bs {(stats.totalVentas * safeNum(tasaBs, 1)).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Ganancia Neta — Amarillo */}
        <div className="relative bg-yellow-400 rounded-2xl shadow-lg p-6 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
          <div className="relative flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Coins className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="relative">
            <p className="text-xs font-bold text-white/80 uppercase tracking-wide mb-1">GANANCIA NETA</p>
            <p className="text-3xl font-bold text-white">${stats.totalGanancia.toFixed(2)}</p>
            <p className="text-xs text-white/70 mt-1">Costo: ${stats.totalCosto.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* === DESGLOSE DE MÉTODOS === */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8 print:hidden">
        {/* Title bar — azul oscuro */}
        <div className="px-5 py-3" style={{ backgroundColor: '#1e3a8a' }}>
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Desglose de Métodos</h2>
        </div>

        <div className="p-6">
          {Object.keys(stats.desglose).length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-400">No hay transacciones registradas</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left: Donut chart */}
              <div className="flex flex-col items-center">
                <div className="relative" style={{ width: '200px', height: '200px' }}>
                  <div
                    className="w-full h-full rounded-full"
                    style={{ background: donutData.gradient || 'conic-gradient(#e5e7eb 0% 100%)' }}
                  />
                  <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <p className="text-xs text-gray-400 uppercase">Total</p>
                    <p className="text-xl font-bold text-gray-800">${stats.totalVentas.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{ingresos.length} transacciones</p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {donutData.segments.map((seg) => (
                    <div key={seg.metodo} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs text-gray-600">{seg.metodo}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Bars list */}
              <div className="space-y-4">
                {Object.entries(stats.desglose).map(([metodo, data]) => {
                  const Icon = getMetodoIcon(metodo);
                  const pct = stats.totalVentas > 0 ? (data.bruto / stats.totalVentas) * 100 : 0;
                  const color = METODO_COLORS[metodo] || '#6366F1';
                  const isPOS = metodo === 'Punto';
                  return (
                    <div key={metodo}>
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-700">{metodo}</p>
                          {isPOS && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              Comisión 2.5% — Neto: ${data.neto.toFixed(2)}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-800">${data.bruto.toFixed(2)}</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === DETALLE DE TRANSACCIONES === */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:hidden">
        <div className="px-5 py-3" style={{ backgroundColor: '#1e3a8a' }}>
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Detalles de Transacciones</h2>
        </div>
        <div className="overflow-x-auto custom-scrollbar max-h-[500px] overflow-y-auto">
          <table className="w-full min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="text-gray-700 text-xs uppercase tracking-wide" style={{ backgroundColor: '#EFF6FF' }}>
                <th className="text-center px-4 py-3 font-semibold w-12">N.º</th>
                <th className="text-left px-4 py-3 font-semibold">FECHA / HORA</th>
                <th className="text-center px-4 py-3 font-semibold">MÉTODO DE PAGO</th>
                <th className="text-right px-4 py-3 font-semibold">MONTO</th>
                <th className="text-left px-4 py-3 font-semibold">DESCRIPCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {sortedIngresos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                    <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    No hay transacciones registradas
                  </td>
                </tr>
              ) : (
                sortedIngresos.map((ing, idx) => {
                  const MetodoIcon = getMetodoIcon(ing.metodo);
                  return (
                    <tr
                      key={ing.id}
                      className="border-t border-gray-50 transition-all duration-300 hover:bg-blue-50/30"
                    >
                      <td className="px-4 py-4 text-center text-sm text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">{ing.fecha}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                          <MetodoIcon className="w-3.5 h-3.5 text-gray-400" />
                          {ing.metodo}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          ${safeNum(ing.montoUSD).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-700">{ing.descripcion}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state after cierre */}
      {jornadaCerrada && (
        <div className="fixed bottom-8 right-8 z-40 bg-emerald-500 text-white rounded-2xl shadow-2xl p-5 flex items-center gap-3 animate-in print:hidden">
          <CheckCircle2 className="w-6 h-6" />
          <div>
            <p className="text-sm font-bold">Jornada cerrada</p>
            <p className="text-xs text-white/80">Los datos viajaron a Contabilidad</p>
          </div>
        </div>
      )}

      {/* Cierre Modal */}
      {showCierreModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm print:hidden"
          onClick={() => setShowCierreModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <Power className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Cierre de Caja</h2>
                  <p className="text-xs text-gray-400">Resumen de la jornada</p>
                </div>
              </div>
              <button
                onClick={() => setShowCierreModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen */}
            <div className="bg-gray-50 rounded-xl p-5 mb-5 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase mb-1">Total Ventas</p>
                  <p className="text-2xl font-bold text-gray-800">${stats.totalVentas.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase mb-1">Ganancia Neta</p>
                  <p className="text-2xl font-bold text-emerald-600">${stats.totalGanancia.toFixed(2)}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Por Método de Pago</p>
                {Object.entries(stats.desglose).map(([metodo, data]) => (
                  <div key={metodo} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-gray-600">{metodo}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-700">${data.bruto.toFixed(2)}</span>
                      {metodo === 'Punto' && (
                        <span className="text-xs text-emerald-600 ml-2">
                          (Neto: ${data.neto.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Print buttons */}
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Imprimir / Guardar Cierre</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleImprimir('a4')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-gold-400 hover:bg-gold-50 transition-all duration-300 group"
              >
                <FileText className="w-6 h-6 text-gray-400 group-hover:text-gold-500 transition-colors" />
                <span className="text-sm font-semibold text-gray-600 group-hover:text-gold-600">Formato PDF (A4)</span>
                <span className="text-xs text-gray-400">Hoja carta</span>
              </button>
              <button
                onClick={() => handleImprimir('ticket')}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-gold-400 hover:bg-gold-50 transition-all duration-300 group"
              >
                <Printer className="w-6 h-6 text-gray-400 group-hover:text-gold-500 transition-colors" />
                <span className="text-sm font-semibold text-gray-600 group-hover:text-gold-600">Formato Ticket</span>
                <span className="text-xs text-gray-400">Tiquetera 80mm</span>
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-4">
              Al imprimir, la jornada se cierra y los datos viajan a Contabilidad
            </p>
          </div>
        </div>
      )}

      {/* Print A4 */}
      {printFormat === 'a4' && cierreData && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-10" style={{ minHeight: '100vh' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold">Cierre de Caja</h1>
                <p className="text-sm text-gray-600 mt-1">{cierreData.fecha}</p>
              </div>
              <FileText className="w-12 h-12 text-gray-400" />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-300 rounded-lg p-5">
                <p className="text-xs text-gray-500 uppercase mb-1">Total Ventas</p>
                <p className="text-3xl font-bold">${cierreData.totalVentas.toFixed(2)}</p>
              </div>
              <div className="border border-gray-300 rounded-lg p-5">
                <p className="text-xs text-gray-500 uppercase mb-1">Ganancia Neta</p>
                <p className="text-3xl font-bold text-emerald-700">${cierreData.totalGanancia.toFixed(2)}</p>
              </div>
            </div>

            <h2 className="text-lg font-bold mb-3">Desglose por Método</h2>
            <table className="w-full text-sm border-collapse mb-8">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-2 font-semibold">Método</th>
                  <th className="text-right py-2 font-semibold">Bruto</th>
                  <th className="text-right py-2 font-semibold">Comisión</th>
                  <th className="text-right py-2 font-semibold">Neto</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(cierreData.desgloseMetodos).map(([m, d]) => (
                  <tr key={m} className="border-b border-gray-200">
                    <td className="py-2">{m}</td>
                    <td className="py-2 text-right">${d.bruto.toFixed(2)}</td>
                    <td className="py-2 text-right">{d.comision > 0 ? `-$${d.comision.toFixed(2)}` : '—'}</td>
                    <td className="py-2 text-right font-semibold">${d.neto.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="text-lg font-bold mb-3">Detalle de Transacciones</h2>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-2 font-semibold">Fecha</th>
                  <th className="text-left py-2 font-semibold">Descripción</th>
                  <th className="text-center py-2 font-semibold">Método</th>
                  <th className="text-right py-2 font-semibold">Ganancia</th>
                  <th className="text-right py-2 font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {cierreData.ingresos.map((ing) => (
                  <tr key={ing.id} className="border-b border-gray-200">
                    <td className="py-1.5">{ing.fecha}</td>
                    <td className="py-1.5">{ing.descripcion}</td>
                    <td className="py-1.5 text-center">{ing.metodo}</td>
                    <td className="py-1.5 text-right">${safeNum(ing.gananciaUSD).toFixed(2)}</td>
                    <td className="py-1.5 text-right font-semibold">${safeNum(ing.montoUSD).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-12 flex justify-around">
              <div className="text-center">
                <p className="text-xs text-gray-500">Firma del Cajero</p>
                <div className="border-b border-gray-500 mt-12 w-48" />
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Firma del Supervisor</p>
                <div className="border-b border-gray-500 mt-12 w-48" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Ticket 80mm */}
      {printFormat === 'ticket' && cierreData && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-3" style={{ maxWidth: '80mm', margin: '0 auto' }}>
          <div style={{ maxWidth: '80mm' }}>
            <div className="text-center mb-4">
              <h1 className="text-lg font-bold">CIERRE DE CAJA</h1>
              <p className="text-xs text-gray-600">{cierreData.fecha}</p>
              <div className="border-t border-dashed border-gray-400 my-2" />
            </div>

            <div className="space-y-1 text-xs mb-4">
              <div className="flex justify-between">
                <span>Total Ventas:</span>
                <span className="font-bold">${cierreData.totalVentas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ganancia Neta:</span>
                <span className="font-bold">${cierreData.totalGanancia.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />
            <p className="text-xs font-bold mb-1">POR METODO</p>
            {Object.entries(cierreData.desgloseMetodos).map(([m, d]) => (
              <div key={m} className="text-xs space-y-0.5 mb-1">
                <div className="flex justify-between">
                  <span>{m}</span>
                  <span>${d.bruto.toFixed(2)}</span>
                </div>
                {d.comision > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Comision 2.5%</span>
                    <span>-${d.comision.toFixed(2)}</span>
                  </div>
                )}
                {d.comision > 0 && (
                  <div className="flex justify-between">
                    <span>Neto</span>
                    <span>${d.neto.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-dashed border-gray-400 my-2" />
            <p className="text-xs font-bold mb-1">TRANSACCIONES</p>
            {cierreData.ingresos.map((ing) => (
              <div key={ing.id} className="text-xs flex justify-between mb-0.5">
                <span className="truncate" style={{ maxWidth: '45mm' }}>{ing.descripcion}</span>
                <span>${safeNum(ing.montoUSD).toFixed(2)}</span>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-400 my-2" />
            <p className="text-center text-xs text-gray-500 mt-4">
              Documento generado por sistema ERP
            </p>
            <p className="text-center text-xs text-gray-400">
              {cierreData.ingresos.length} transacciones registradas
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
