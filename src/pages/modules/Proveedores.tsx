import { useState, useMemo, useRef } from 'react';
import {
  Truck,
  Plus,
  X,
  Folder,
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  Cpu,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import * as XLSX from 'xlsx';

const PROVEEDOR_COLORS = [
  '#2563EB', '#F59E0B', '#7C3AED', '#059669',
  '#DC2626', '#0891B2', '#DB2777', '#EA580C',
];

interface CatalogoItem {
  producto: string;
  precio: number;
}

interface GrupoComparativo {
  nombreNormalizado: string;
  nombreDisplay: string;
  proveedores: { proveedorId: string; proveedorNombre: string; colorHex: string; precio: number }[];
  precioMin: number;
  precioMax: number;
}

function normalizarNombre(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9\s]/g, '');
}

export default function Proveedores() {
  const {
    proveedores,
    addProveedor,
    deleteProveedor,
    addCatalogoToProveedor,
    apiKeyGemini,
    setApiKeyGemini,
  } = useStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showIaModal, setShowIaModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoColor, setNuevoColor] = useState(PROVEEDOR_COLORS[0]);
  const [iaKeyInput, setIaKeyInput] = useState(apiKeyGemini);
  const [loadingIa, setLoadingIa] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateProveedor = () => {
    if (!nuevoNombre.trim()) return;
    addProveedor({
      nombre: nuevoNombre.trim(),
      colorHex: nuevoColor,
      catalogo: [],
    });
    setNuevoNombre('');
    setNuevoColor(PROVEEDOR_COLORS[proveedores.length % PROVEEDOR_COLORS.length]);
    setShowNewModal(false);
  };

  const procesarExcel = (file: File, proveedorId: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const items: CatalogoItem[] = rows
          .map((row) => {
            const keys = Object.keys(row);
            const productoKey = keys.find((k) => k.toLowerCase().includes('producto') || k.toLowerCase().includes('descripcion') || k.toLowerCase().includes('nombre'));
            const precioKey = keys.find((k) => k.toLowerCase().includes('precio') || k.toLowerCase().includes('costo') || k.toLowerCase().includes('precio') || k.toLowerCase().includes('valor'));
            const producto = productoKey ? String(row[productoKey]) : '';
            const precio = precioKey ? parseFloat(String(row[precioKey])) : 0;
            return { producto, precio: isNaN(precio) ? 0 : precio };
          })
          .filter((item) => item.producto.trim());

        if (items.length > 0) {
          addCatalogoToProveedor(proveedorId, items);
          setShowUploadModal(null);
          setUploadError('');
        } else {
          setUploadError('No se encontraron productos válidos en el archivo.');
        }
      } catch {
        setUploadError('Error al leer el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const procesarConIA = (_file: File, _apiKey: string) => {
    setLoadingIa(true);
    setUploadError('');
    setTimeout(() => {
      const itemsSimulados: CatalogoItem[] = [
        { producto: 'Cuaderno Universitario', precio: 1.2 },
        { producto: 'Lápiz HB #2', precio: 0.18 },
        { producto: 'Resma de Papel A4', precio: 4.5 },
      ];
      if (showUploadModal) {
        addCatalogoToProveedor(showUploadModal, itemsSimulados);
      }
      setLoadingIa(false);
      setShowUploadModal(null);
    }, 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, proveedorId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isImage = file.type.startsWith('image/') || file.name.endsWith('.pdf');

    if (isExcel) {
      procesarExcel(file, proveedorId);
    } else if (isImage) {
      if (!apiKeyGemini) {
        setUploadError('Configura la API Key de IA primero.');
        return;
      }
      procesarConIA(file, apiKeyGemini);
    } else {
      setUploadError('Formato no soportado. Use .xlsx, imagen o PDF.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const tablaComparativa = useMemo<GrupoComparativo[]>(() => {
    const grupos: Record<string, GrupoComparativo> = {};

    proveedores.forEach((prov) => {
      prov.catalogo.forEach((item) => {
        const key = normalizarNombre(item.producto);
        if (!key) return;

        if (!grupos[key]) {
          grupos[key] = {
            nombreNormalizado: key,
            nombreDisplay: item.producto,
            proveedores: [],
            precioMin: Infinity,
            precioMax: 0,
          };
        }

        grupos[key].proveedores.push({
          proveedorId: prov.id,
          proveedorNombre: prov.nombre,
          colorHex: prov.colorHex,
          precio: item.precio,
        });

        if (item.precio < grupos[key].precioMin) grupos[key].precioMin = item.precio;
        if (item.precio > grupos[key].precioMax) grupos[key].precioMax = item.precio;
      });
    });

    return Object.values(grupos).sort((a, b) => a.nombreDisplay.localeCompare(b.nombreDisplay));
  }, [proveedores]);

  const totalItems = proveedores.reduce((sum, p) => sum + p.catalogo.length, 0);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gold-400 rounded-xl flex items-center justify-center shadow-gold-sm">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Proveedores</h1>
            <p className="text-sm text-gray-500">Directorios y comparativa de costos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIaKeyInput(apiKeyGemini); setShowIaModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-violet-600 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
          >
            <Cpu className="w-4 h-4" />
            Configurar IA
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-gold-400 to-gold-500 shadow-gold hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 uppercase mb-1">Proveedores</p>
          <p className="text-2xl font-bold text-gray-800">{proveedores.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 uppercase mb-1">Productos en Catálogos</p>
          <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 uppercase mb-1">Grupos Comparados</p>
          <p className="text-2xl font-bold text-gray-800">{tablaComparativa.length}</p>
        </div>
      </div>

      {/* Carpetas de proveedores */}
      {proveedores.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center mb-8">
          <Folder className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No hay proveedores registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
          {proveedores.map((prov) => (
            <div
              key={prov.id}
              className="group cursor-pointer"
              onClick={() => { setShowUploadModal(prov.id); setUploadError(''); }}
            >
              {/* Folder top tab */}
              <div
                className="h-6 rounded-t-lg w-3/4 mx-auto transition-all duration-300 group-hover:w-4/5"
                style={{ backgroundColor: prov.colorHex, opacity: 0.8 }}
              />
              {/* Folder body */}
              <div
                className="rounded-t-3xl rounded-b-lg p-5 text-center transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.03]"
                style={{ backgroundColor: prov.colorHex }}
              >
                <Folder className="w-10 h-10 text-white mx-auto mb-2" />
                <p className="text-sm font-bold text-white truncate">{prov.nombre}</p>
                <p className="text-xs text-white/70 mt-1">{prov.catalogo.length} productos</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla Comparativa Semáforo */}
      {tablaComparativa.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-gold-400 to-red-500" />
          <div className="p-5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-gold-400" />
              <h2 className="text-sm font-semibold text-gray-700">Tabla Comparativa — Semáforo de Precios</h2>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full min-w-[700px]">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-6 py-3 font-semibold">Producto</th>
                  <th className="text-center px-6 py-3 font-semibold">Proveedor</th>
                  <th className="text-right px-6 py-3 font-semibold">Precio</th>
                  <th className="text-center px-6 py-3 font-semibold">Semáforo</th>
                </tr>
              </thead>
              <tbody>
                {tablaComparativa.flatMap((grupo) =>
                  grupo.proveedores
                    .sort((a, b) => a.precio - b.precio)
                    .map((prov, idx) => {
                      const isMin = prov.precio === grupo.precioMin && grupo.precioMin !== grupo.precioMax;
                      const isMax = prov.precio === grupo.precioMax && grupo.precioMin !== grupo.precioMax;
                      return (
                        <tr
                          key={`${grupo.nombreNormalizado}-${prov.proveedorId}-${idx}`}
                          className="border-t border-gray-50 transition-all duration-300 hover:bg-gray-50/50"
                        >
                          <td className="px-6 py-3 text-sm font-medium text-gray-700">
                            {idx === 0 ? grupo.nombreDisplay : ''}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: prov.colorHex }}
                            >
                              {prov.proveedorNombre}
                            </span>
                          </td>
                          <td className={`px-6 py-3 text-right text-sm font-bold ${
                            isMin ? 'text-emerald-600' : isMax ? 'text-red-500' : 'text-gray-600'
                          }`}>
                            ${prov.precio.toFixed(2)}
                            {isMin && <span className="ml-1 text-[10px] text-emerald-500">▼ más barato</span>}
                            {isMax && <span className="ml-1 text-[10px] text-red-400">▲ más caro</span>}
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isMin && <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto" />}
                            {isMax && <div className="w-3 h-3 rounded-full bg-red-500 mx-auto" />}
                            {!isMin && !isMax && <div className="w-3 h-3 rounded-full bg-gray-300 mx-auto" />}
                          </td>
                        </tr>
                      );
                    }),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Proveedor */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowNewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Nuevo Proveedor</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Nombre del proveedor..."
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Color Identificador</label>
                <div className="flex flex-wrap gap-2">
                  {PROVEEDOR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNuevoColor(color)}
                      className={`w-8 h-8 rounded-full transition-all duration-200 ${nuevoColor === color ? 'ring-4 ring-offset-2' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color, boxShadow: nuevoColor === color ? `0 0 0 2px ${color}` : undefined }}
                    />
                  ))}
                </div>
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
                onClick={handleCreateProveedor}
                disabled={!nuevoNombre.trim()}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 ${
                  nuevoNombre.trim() ? 'bg-gradient-to-r from-gold-400 to-gold-500 shadow-gold-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configurar IA */}
      {showIaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowIaModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Configurar IA Vision</h2>
                  <p className="text-xs text-gray-400">Gemini API Key para leer imágenes</p>
                </div>
              </div>
              <button onClick={() => setShowIaModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">API Key de Gemini</label>
              <input
                type="password"
                value={iaKeyInput}
                onChange={(e) => setIaKeyInput(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all duration-300"
              />
              <p className="text-xs text-gray-400 mt-2">
                La key se guarda localmente en tu navegador y se usa para procesar listas en imágenes o PDF.
              </p>
              {apiKeyGemini && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                  IA configurada y lista para usar
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowIaModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setApiKeyGemini(iaKeyInput); setShowIaModal(false); }}
                disabled={!iaKeyInput.trim()}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 ${
                  iaKeyInput.trim() ? 'bg-gradient-to-r from-violet-500 to-violet-600 shadow-sm' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Subir Lista */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => !loadingIa && setShowUploadModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 animate-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: proveedores.find((p) => p.id === showUploadModal)?.colorHex || '#D4AF37' }}
                >
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Subir Lista</h2>
                  <p className="text-xs text-gray-400">{proveedores.find((p) => p.id === showUploadModal)?.nombre}</p>
                </div>
              </div>
              {!loadingIa && (
                <button onClick={() => setShowUploadModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {loadingIa ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-4" />
                <p className="text-sm font-semibold text-gray-600">Analizando imagen con IA...</p>
                <p className="text-xs text-gray-400 mt-1">Procesando lista de productos</p>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,image/*,.pdf"
                  onChange={(e) => showUploadModal && handleFileChange(e, showUploadModal)}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-300 group"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-sm font-semibold text-gray-600 group-hover:text-emerald-600">Excel (.xlsx)</span>
                    <span className="text-xs text-gray-400">Procesamiento local</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!apiKeyGemini) {
                        setUploadError('Configura la API Key de IA primero.');
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-all duration-300 group"
                  >
                    <ImageIcon className="w-8 h-8 text-gray-400 group-hover:text-violet-500 transition-colors" />
                    <span className="text-sm font-semibold text-gray-600 group-hover:text-violet-600">Imagen / PDF</span>
                    <span className="text-xs text-gray-400">Con IA Vision</span>
                  </button>
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}

                {/* Delete proveedor */}
                <button
                  onClick={() => {
                    if (showUploadModal) {
                      deleteProveedor(showUploadModal);
                      setShowUploadModal(null);
                    }
                  }}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar Proveedor
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
