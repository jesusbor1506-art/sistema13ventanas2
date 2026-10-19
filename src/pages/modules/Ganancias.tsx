import { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Receipt,
  Wallet,
  HandCoins,
  Printer,
  X,
  Power,
  Percent,
  FileText,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import type { CierreDiario } from '@/types/cuenta';

function safeNum(v: string | number | undefined, fallback = 0): number {
  if (v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? fallback : n;
}

const POS_COMMISSION = 0.025;

export default function Ganancias() {
  const { ingresos, tasaBs, cerrarJornada } = useStore();

  const [showCierreModal, setShowCierreModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'ticket' | null>(null);
  const [cierreData, setCierreData] = useState<CierreDiario | null>(null);
  const [jornadaCerrada, setJornadaCerrada] = useState(false);

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

  const cardConfigs = [
    {
      label: 'Total Ventas',
      value: `$${stats.totalVentas.toFixed(2)}`,
      sub: `Bs ${(stats.totalVentas * safeNum(tasaBs, 1)).toLocaleString('es-VE', { maximumFractionDigits: 0 })}`,
      icon: Wallet,
      bg: 'from-gold-400 to-gold-500',
    },
    {
      label: 'Ganancia Neta',
      value: `$${stats.totalGanancia.toFixed(2)}`,
      sub: `Costo: $${stats.totalCosto.toFixed(2)}`,
      icon: TrendingUp,
      bg: 'from-emerald-400 to-emerald-500',
    },
    {
      label: 'Ventas Mostrador',
      value: `$${stats.ventasDirectas.toFixed(2)}`,
      sub: `${ingresos.filter((i) => i.origen === 'venta_directa').length} transacciones`,
      icon: ArrowUpRight,
      bg: 'from-blue-400 to-blue-500',
    },
    {
      label: 'Abonos de Deudas',
      value: `$${stats.abonosDeuda.toFixed(2)}`,
      sub: `${ingresos.filter((i) => i.origen === 'abono_deuda').length} abonos`,
      icon: HandCoins,
      bg: 'from-orange-400 to-orange-500',
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gold-400 rounded-xl flex items-center justify-center shadow-gold-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Ventas y Ganancias</h1>
              <p className="text-sm text-gray-500">Flujo de caja — ingresos en tiempo real</p>
            </div>
          </div>
          {ingresos.length > 0 && (
            <button
              onClick={handleAbrirCierre}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
            >
              <Power className="w-5 h-5" />
              Finalizar Día
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 print:hidden">
        {cardConfigs.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`relative bg-gradient-to-br ${card.bg} rounded-2xl shadow-lg p-5 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
              <div className="relative flex items-start justify-between mb-4">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="relative">
                <p className="text-xs font-medium text-white/80 uppercase tracking-wide mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-xs text-white/70 mt-1">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Method breakdown with POS deduction */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-8 print:hidden">
        <div className="h-1.5 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500" />
        <div className="p-5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gold-400" />
            <h2 className="text-sm font-semibold text-gray-700">Desglose por Método de Pago</h2>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {Object.keys(stats.desglose).length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-400">No hay transacciones registradas</p>
          ) : (
            Object.entries(stats.desglose).map(([metodo, data]) => {
              const Icon = getMetodoIcon(metodo);
              const isPOS = metodo === 'Punto';
              return (
                <div key={metodo} className="flex items-center justify-between px-6 py-4 transition-all duration-300 hover:bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{metodo}</p>
                      {isPOS && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Percent className="w-3 h-3" />
                          Comisión 2.5% POS
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">${data.bruto.toFixed(2)}</p>
                    {isPOS && (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs text-red-500">-{data.comision.toFixed(2)}</p>
                        <p className="text-xs font-semibold text-emerald-600">
                          Neto: ${data.neto.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden print:hidden">
        <div className="h-1.5 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500" />
        <div className="p-5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gold-400" />
            <h2 className="text-sm font-semibold text-gray-700">Historial de Transacciones</h2>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar max-h-[500px] overflow-y-auto">
          <table className="w-full min-w-[700px]">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-gray-400 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-3 font-semibold">Fecha y Hora</th>
                <th className="text-left px-6 py-3 font-semibold">Descripción</th>
                <th className="text-center px-6 py-3 font-semibold">Origen</th>
                <th className="text-center px-6 py-3 font-semibold">Método</th>
                <th className="text-right px-6 py-3 font-semibold">Ganancia</th>
                <th className="text-right px-6 py-3 font-semibold">Monto</th>
              </tr>
            </thead>
            <tbody>
              {sortedIngresos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400 text-sm">
                    <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    No hay transacciones registradas
                  </td>
                </tr>
              ) : (
                sortedIngresos.map((ing) => {
                  const MetodoIcon = getMetodoIcon(ing.metodo);
                  return (
                    <tr
                      key={ing.id}
                      className="border-t border-gray-50 transition-all duration-300 hover:bg-gold-50/30"
                    >
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {ing.fecha}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">
                        {ing.descripcion}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {ing.origen === 'venta_directa' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                            <ArrowUpRight className="w-3 h-3" />
                            Venta
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gold-50 text-gold-600">
                            <HandCoins className="w-3 h-3" />
                            Abono
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <MetodoIcon className="w-3.5 h-3.5 text-gray-400" />
                          {ing.metodo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-semibold text-gold-600">
                          ${safeNum(ing.gananciaUSD).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-emerald-600">
                          +${safeNum(ing.montoUSD).toFixed(2)}
                        </span>
                      </td>
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
