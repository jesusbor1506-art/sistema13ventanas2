import { useState, useMemo } from 'react';
import {
  BarChart3,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Package,
  Crown,
  Calendar,
  Award,
  ShieldCheck,
  Tag,
  Smile,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import type { CartItem } from '@/types/product';

interface RankingItem {
  name: string;
  cantidad: number;
  ingresos: number;
}

const PODIO_GRADIENTS = [
  'bg-gradient-to-b from-yellow-300 to-yellow-500',
  'bg-gradient-to-b from-cyan-400 to-blue-500',
  'bg-gradient-to-b from-purple-500 to-indigo-600',
  'bg-gradient-to-b from-teal-400 to-teal-600',
  'bg-gradient-to-b from-blue-600 to-blue-800',
];

export default function Tendencias() {
  const { ingresos, products } = useStore();
  const [filtro, setFiltro] = useState<'historico' | 'mes'>('historico');

  const ingresosFiltrados = useMemo(() => {
    if (filtro === 'historico') return ingresos;
    const now = new Date();
    const mesActual = now.getMonth();
    const anioActual = now.getFullYear();
    return ingresos.filter((ing) => {
      try {
        const fecha = new Date(ing.fecha);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual;
      } catch {
        return false;
      }
    });
  }, [ingresos, filtro]);

  const ranking = useMemo<RankingItem[]>(() => {
    const todosItems: CartItem[] = ingresosFiltrados.flatMap(
      (ing) => ing.itemsVueltos || [],
    );

    if (todosItems.length > 0) {
      const mapa: Record<string, { cantidad: number; ingresos: number }> = {};
      todosItems.forEach((item) => {
        const nombre = item.product.name;
        if (!mapa[nombre]) mapa[nombre] = { cantidad: 0, ingresos: 0 };
        mapa[nombre].cantidad += item.quantity;
        mapa[nombre].ingresos += item.quantity * (item.product.priceBuy || 0);
      });
      return Object.entries(mapa)
        .map(([name, data]) => ({ name, cantidad: data.cantidad, ingresos: data.ingresos }))
        .sort((a, b) => b.cantidad - a.cantidad);
    }

    // Fallback: infer from description
    const mapa: Record<string, { cantidad: number; ingresos: number }> = {};
    ingresosFiltrados.forEach((ing) => {
      const desc = ing.descripcion.toLowerCase().trim();
      if (!desc || desc === 'venta de mostrador' || desc.startsWith('abono')) return;

      const productosEnDesc = products.filter(
        (p) => desc.includes(p.name.toLowerCase()),
      );

      if (productosEnDesc.length === 0) {
        const nombre = ing.descripcion.trim();
        if (!mapa[nombre]) mapa[nombre] = { cantidad: 0, ingresos: 0 };
        mapa[nombre].cantidad += 1;
        mapa[nombre].ingresos += ing.montoUSD;
      } else {
        productosEnDesc.forEach((p) => {
          if (!mapa[p.name]) mapa[p.name] = { cantidad: 0, ingresos: 0 };
          mapa[p.name].cantidad += 1;
          mapa[p.name].ingresos += ing.montoUSD / productosEnDesc.length;
        });
      }
    });

    return Object.entries(mapa)
      .map(([name, data]) => ({ name, cantidad: data.cantidad, ingresos: data.ingresos }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [ingresosFiltrados, products]);

  const top1Product = ranking[0];
  const top1Stock = top1Product
    ? products.find((p) => p.name.toLowerCase() === top1Product.name.toLowerCase())?.stock ?? null
    : null;
  const stockCritico = top1Stock !== null && top1Stock < 10;

  const top5 = ranking.slice(0, 5);
  const restantes = ranking.slice(5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Pill header */}
        <div className="flex justify-center mb-8">
          <div className="rounded-full bg-blue-900 text-white shadow-lg flex items-center p-4 pl-6 pr-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: '#FFC300' }}>
              <Trophy className="w-8 h-8 text-blue-900" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wide">
              TOP PRODUCTOS MÁS VENDIDOS
            </h1>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-md border border-gray-100">
            <button
              onClick={() => setFiltro('historico')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                filtro === 'historico'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Histórico Total
            </button>
            <button
              onClick={() => setFiltro('mes')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                filtro === 'mes'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Este Mes
            </button>
          </div>
        </div>

        {/* Alerta de stock crítico */}
        {stockCritico && top1Product && (
          <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-2xl p-4 flex items-center gap-3 animate-pulse max-w-3xl mx-auto">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700">
                ¡Stock Crítico del Producto Estrella!
              </p>
              <p className="text-xs text-red-500">
                "{top1Product.name}" solo tiene {top1Stock} unidades en inventario.
              </p>
            </div>
          </div>
        )}

        {ranking.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-16 text-center max-w-2xl mx-auto">
            <BarChart3 className="w-16 h-16 text-blue-200 mx-auto mb-4" />
            <p className="text-sm text-gray-400">
              {filtro === 'mes' ? 'No hay ventas registradas este mes' : 'No hay ventas registradas aún'}
            </p>
          </div>
        ) : (
          <>
            {/* Podio Top 5 */}
            {top5.length > 0 && (
              <div className="grid grid-cols-5 gap-4 sm:gap-6 mt-16 px-2 sm:px-4">
                {top5.map((item, idx) => {
                  const stock = products.find((p) => p.name.toLowerCase() === item.name.toLowerCase())?.stock;
                  const isStar = idx === 0 && stockCritico;
                  const altura = idx === 0 ? 'pt-4' : idx === 1 ? 'pt-8' : idx === 2 ? 'pt-6' : idx === 3 ? 'pt-10' : 'pt-12';
                  return (
                    <div key={item.name} className={`flex flex-col items-center ${altura}`}>
                      <div
                        className={`relative flex flex-col items-center text-center p-4 sm:p-6 rounded-t-[100px] rounded-b-2xl shadow-2xl transition-transform hover:-translate-y-2 ${PODIO_GRADIENTS[idx]} ${
                          isStar ? 'ring-4 ring-red-500 animate-pulse' : ''
                        }`}
                      >
                        {/* Floating medal */}
                        <div className="absolute -top-8 w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white flex items-center justify-center font-black text-xl sm:text-2xl bg-white text-black shadow-md z-10">
                          {idx + 1}
                        </div>

                        {/* Package icon */}
                        <div className="mt-6 mb-2">
                          <Package className="w-10 h-10 sm:w-12 sm:h-12 text-white/90" />
                        </div>

                        {/* Product name */}
                        <p className="font-bold text-white text-xs sm:text-sm mt-4 leading-tight line-clamp-2">
                          {item.name}
                        </p>

                        {/* Divider */}
                        <div className="w-full h-px bg-white/30 my-3" />

                        {/* Units sold */}
                        <p className="text-2xl sm:text-3xl font-black text-white">{item.cantidad}</p>
                        <p className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wide">Unidades vendidas</p>

                        {/* Growth badge */}
                        <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400 text-emerald-900 text-[10px] sm:text-xs font-bold">
                          <TrendingUp className="w-3 h-3" />
                          +{Math.min(99, 10 + idx * 15)}% crecimiento
                        </div>

                        {/* Stock indicator */}
                        {stock !== undefined && (
                          <div className={`mt-2 text-[10px] ${stock < 10 ? 'text-red-200 font-bold' : 'text-white/60'}`}>
                            Stock: {stock}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trust badges banner */}
            <div className="bg-blue-900 text-white rounded-2xl flex flex-wrap justify-around items-center p-4 mt-12 gap-4">
              {[
                { icon: Package, label: 'Más variedad' },
                { icon: Tag, label: 'Precios bajos' },
                { icon: ShieldCheck, label: 'Calidad garantizada' },
                { icon: Smile, label: 'Tu satisfacción' },
              ].map((badge, i) => {
                const Icon = badge.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-yellow-300" />
                    <span className="text-sm font-semibold">{badge.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Rest of ranking */}
            {restantes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mt-8">
                <div className="h-1.5 bg-gradient-to-r from-blue-300 via-blue-500 to-blue-900" />
                <div className="p-5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <h2 className="text-sm font-semibold text-gray-700">Ranking Completo</h2>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {restantes.map((item, idx) => {
                    const realIdx = idx + 5;
                    const stock = products.find((p) => p.name.toLowerCase() === item.name.toLowerCase())?.stock;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-4 px-5 py-4 transition-all duration-300 hover:bg-blue-50/30"
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm bg-blue-100 text-blue-700">
                          {realIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400">{item.cantidad} ventas</span>
                            <span className="text-xs text-emerald-500 font-medium">${item.ingresos.toFixed(2)}</span>
                            {stock !== undefined && (
                              <span className={`text-xs flex items-center gap-0.5 ${stock < 10 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                <Package className="w-3 h-3" />
                                Stock: {stock}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="hidden sm:block w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-blue-500"
                            style={{
                              width: `${ranking[0] ? (item.cantidad / ranking[0].cantidad) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
