import { useState, useMemo } from 'react';
import {
  BarChart3,
  Trophy,
  Medal,
  Award,
  TrendingUp,
  AlertTriangle,
  Package,
  Crown,
  Calendar,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';

interface RankingItem {
  name: string;
  cantidad: number;
  ingresos: number;
}

export default function Tendencias() {
  const { ingresos, products } = useStore();
  const [filtro, setFiltro] = useState<'historico' | 'mes'>('historico');

  const ingresosFiltrados = useMemo(() => {
    if (filtro === 'historico') return ingresos;
    const now = new Date();
    const mesActual = now.getMonth();
    const añoActual = now.getFullYear();
    return ingresos.filter((ing) => {
      try {
        const fecha = new Date(ing.fecha);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
      } catch {
        return false;
      }
    });
  }, [ingresos, filtro]);

  const ranking = useMemo<RankingItem[]>(() => {
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

  const medalColors = ['#D4AF37', '#94A3B8', '#B45309'];
  const medalIcons = [Crown, Medal, Award];
  const medalLabels = ['Oro', 'Plata', 'Bronce'];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 bg-gold-400 rounded-xl flex items-center justify-center shadow-gold-sm">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tendencias</h1>
            <p className="text-sm text-gray-500">Ranking de productos más vendidos</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-md border border-gray-100">
          <button
            onClick={() => setFiltro('historico')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filtro === 'historico'
                ? 'bg-gold-400 text-white shadow-gold-sm'
                : 'text-gray-500 hover:bg-gold-50 hover:text-gold-500'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Histórico Total
          </button>
          <button
            onClick={() => setFiltro('mes')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
              filtro === 'mes'
                ? 'bg-gold-400 text-white shadow-gold-sm'
                : 'text-gray-500 hover:bg-gold-50 hover:text-gold-500'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Este Mes
          </button>
        </div>
        <div className="ml-auto text-sm text-gray-400">
          {ranking.length} productos · {ingresosFiltrados.length} transacciones
        </div>
      </div>

      {/* Alerta de stock crítico */}
      {stockCritico && top1Product && (
        <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
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

      {/* Podio Top 3 */}
      {ranking.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map((pos) => {
            const item = ranking[pos];
            if (!item) return null;
            const Icon = medalIcons[pos];
            const color = medalColors[pos];
            const isCenter = pos === 0;
            return (
              <div
                key={pos}
                className={`flex flex-col items-center ${isCenter ? 'mt-0' : pos === 1 ? 'mt-6' : 'mt-6'}`}
              >
                <div
                  className={`relative bg-white rounded-2xl shadow-xl border-2 p-5 w-full text-center transition-all duration-300 hover:shadow-2xl ${
                    isCenter ? 'scale-105' : ''
                  } ${stockCritico && pos === 0 ? 'border-red-500 animate-pulse' : ''}`}
                  style={{ borderColor: stockCritico && pos === 0 ? undefined : color }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-7 h-7" style={{ color }} />
                  </div>
                  <p className="text-xs font-bold uppercase mb-1" style={{ color }}>
                    {medalLabels[pos]}
                  </p>
                  <p className="text-sm font-bold text-gray-800 truncate mb-2">{item.name}</p>
                  <p className="text-2xl font-bold text-gray-800">{item.cantidad}</p>
                  <p className="text-xs text-gray-400">ventas</p>
                  {isCenter && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                      #1 ESTRELLA
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista completa del ranking */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500" />
        <div className="p-5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold-400" />
            <h2 className="text-sm font-semibold text-gray-700">Ranking Completo</h2>
          </div>
        </div>

        {ranking.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {filtro === 'mes' ? 'No hay ventas registradas este mes' : 'No hay ventas registradas aún'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {ranking.map((item, idx) => {
              const isTop3 = idx < 3;
              const color = isTop3 ? medalColors[idx] : '#6B7280';
              const stock = products.find((p) => p.name.toLowerCase() === item.name.toLowerCase())?.stock;
              const isStar = idx === 0 && stockCritico;

              return (
                <div
                  key={item.name}
                  className={`flex items-center gap-4 px-5 py-4 transition-all duration-300 hover:bg-gray-50/50 ${
                    isStar ? 'bg-red-50 border-l-4 border-red-500' : ''
                  }`}
                >
                  {/* Rank number */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {idx + 1}
                  </div>

                  {/* Product name */}
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

                  {/* Bar */}
                  <div className="hidden sm:block w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${ranking[0] ? (item.cantidad / ranking[0].cantidad) * 100 : 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>

                  {/* Medal for top 3 */}
                  {isTop3 && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {idx === 0 ? (
                        <Crown className="w-4 h-4" style={{ color }} />
                      ) : idx === 1 ? (
                        <Medal className="w-4 h-4" style={{ color }} />
                      ) : (
                        <Award className="w-4 h-4" style={{ color }} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
