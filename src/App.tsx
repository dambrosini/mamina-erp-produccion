// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, ShoppingBag, Users, History, 
  Cake, Boxes, MapPin, Receipt, Settings, Plus, Search, 
  Truck, ChevronRight, TrendingUp, Zap, Sparkles, 
  Edit3, Trash2, Save, X, CheckCircle, Map, Camera, MessageCircle, Eye, ArrowLeft, Package,
  Bot, ScanSearch, CalendarDays, Tags, MapPinned, BarChart3, Navigation, Info, ShieldCheck, UserPlus, Lock
} from 'lucide-react';

// ==========================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE (PRODUCCIÓN)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDQYc75s-KOk1hjLmcybEm7mqFO65707wU",
  authDomain: "mamina-erp.firebaseapp.com",
  projectId: "mamina-erp",
  storageBucket: "mamina-erp.firebasestorage.app",
  messagingSenderId: "197287431524",
  appId: "1:197287431524:web:7912481fdbed7e95bcbe71"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Utilizamos una ruta global de producción para la base de datos
const rootPath = `produccion/erp`;

// ==========================================
// 2. DATOS DE SIEMBRA (SEED DATA)
// ==========================================
const SEED_DATA = {
  pedidos: [], clientes: [], zonas: [], productos: [], inventario: [], costos: [], atributos_precio: []
};

// ==========================================
// 3. HOOK DE ARQUITECTURA: GESTOR DE COLECCIONES
// ==========================================
function useFirestoreCollection(collectionName, user) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const colPath = `${rootPath}/${collectionName}`;
    const colRef = collection(db, colPath);

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (snapshot.empty && loading) {
        if (SEED_DATA[collectionName] && SEED_DATA[collectionName].length > 0) {
          SEED_DATA[collectionName].forEach(async (item) => {
            const docRef = doc(db, colPath, item.id);
            await setDoc(docRef, item);
          });
        }
      }

      const items = snapshot.docs.map(doc => ({ _docId: doc.id, ...doc.data() }));
      items.sort((a, b) => {
         if(a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
         return b.id?.localeCompare(a.id) || 0;
      });
      
      setData(items);
      setLoading(false);
    }, (error) => {
      console.error(`Error en suscripción a ${collectionName}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, user]);

  const addDocData = async (itemData, customId = null) => {
    if (!user) return;
    const colPath = `${rootPath}/${collectionName}`;
    const docRef = customId ? doc(db, colPath, customId) : doc(collection(db, colPath));
    const finalData = { ...itemData, createdAt: Date.now() };
    await setDoc(docRef, finalData);
  };

  const updateDocData = async (docId, itemData) => {
    if (!user) return;
    const docRef = doc(db, `${rootPath}/${collectionName}`, docId);
    await setDoc(docRef, itemData, { merge: true });
  };

  const deleteDocData = async (docId) => {
    if (!user) return;
    const docRef = doc(db, `${rootPath}/${collectionName}`, docId);
    await deleteDoc(docRef);
  };

  return { data, loading, addDocData, updateDocData, deleteDocData };
}

// ==========================================
// ALGORITMOS DE INTELIGENCIA Y CÁLCULO
// ==========================================
const calcularCostoConvertido = (costoTotalLote, stockLote, unidadLote, cantidadReceta, unidadReceta) => {
  if (!costoTotalLote || !stockLote || !cantidadReceta) return 0;
  const costoBaseUnitario = parseFloat(costoTotalLote) / parseFloat(stockLote);
  const uB = String(unidadLote).toLowerCase();
  const uR = String(unidadReceta).toLowerCase();
  let factor = 1;

  if (uB === 'kg' && uR === 'gr') factor = 0.001;
  else if (uB === 'gr' && uR === 'kg') factor = 1000;
  else if (uB === 'l' && uR === 'ml') factor = 0.001;
  else if (uB === 'ml' && uR === 'l') factor = 1000;
  else if (uB !== uR) return 0;

  return costoBaseUnitario * factor * parseFloat(cantidadReceta);
};

const extractInvoiceData = async (base64Data, mimeType) => {
  const apiKey = ""; 

  const payload = {
    contents: [{
      role: "user",
      parts: [
        { text: "Eres un experto auditor contable. Analiza esta factura de compras de Ecuador. Extrae la lista de todos los items comprados. Debes calcular el 'costoTotalLote' incluyendo el IVA si es que aplica (prorratea el IVA total entre los items si es necesario). El formato debe ser estrictamente un JSON. Detecta si la unidad parece ser kg, gr, l, ml o u (unidades)." },
        { inlineData: { mimeType: mimeType, data: base64Data } }
      ]
    }],
    systemInstruction: {
      parts: [{ text: "Responde ÚNICAMENTE con un JSON válido. No uses markdown de código. Estructura: { items: [{ item: 'Nombre del producto', cantidad: 1, costoTotalLote: 1.50, unidad: 'u' }] }" }]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                item: { type: "STRING" },
                cantidad: { type: "NUMBER" },
                costoTotalLote: { type: "NUMBER" },
                unidad: { type: "STRING" }
              },
              required: ["item", "cantidad", "costoTotalLote", "unidad"]
            }
          }
        },
        required: ["items"]
      }
    }
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) throw new Error("Respuesta vacía de la IA.");
      return JSON.parse(textResponse);
    } catch (e) {
      if (i === 4) throw e;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
};

const UnidadesSelect = ({ value, onChange, className }) => (
  <select value={value} onChange={onChange} className={className}>
     <option value="kg">kg</option>
     <option value="gr">gr</option>
     <option value="l">Litros</option>
     <option value="ml">ml</option>
     <option value="u">Unidades</option>
  </select>
);

// ==========================================
// 4. PORTAL DE ACCESO (NUEVO LOGIN PRODUCCIÓN)
// ==========================================
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError("Credenciales incorrectas o dominio no autorizado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#FFF9F8] font-sans selection:bg-[#E29596]/30">
       <div className="bg-white p-10 rounded-3xl shadow-[0_20px_50px_-12px_rgba(74,43,41,0.15)] w-full max-w-md border border-[#F2E8E6] flex flex-col items-center">
          <div className="w-16 h-16 bg-[#4A2B29] rounded-2xl flex items-center justify-center shadow-lg mb-6">
             <Cake size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-[#4A2B29] tracking-tight mb-2">Mamina ERP</h1>
          <p className="text-stone-500 text-sm mb-8 text-center">Inicia sesión con tu cuenta corporativa para acceder al sistema.</p>
          
          <form onSubmit={handleLogin} className="w-full space-y-4">
             <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Email Corporativo</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DF888A] font-medium transition-all" placeholder="admin@mamina.com" required />
             </div>
             <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Contraseña de Acceso</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-[#DF888A] font-medium transition-all" placeholder="••••••••" required />
             </div>
             
             {error && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-100">
                   <Zap size={14}/> {error}
                </div>
             )}

             <button type="submit" disabled={loading} className="w-full bg-[#4A2B29] hover:bg-[#3D221F] text-white py-3.5 rounded-xl text-sm font-bold shadow-[0_4px_14px_0_rgba(74,43,41,0.39)] transition-all disabled:opacity-70 mt-2">
                {loading ? 'Verificando...' : 'Acceder al Sistema'}
             </button>
          </form>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-stone-400 font-medium">
             <ShieldCheck size={14}/> Acceso Encriptado
          </div>
       </div>
    </div>
  );
}


// ==========================================
// 5. COMPONENTE PRINCIPAL (ENRUTADOR)
// ==========================================
const TABS = [
  { id: 'dashboard', name: 'Centro de Comando', icon: LayoutDashboard },
  { id: 'pedidos', name: 'Operaciones / Pedidos', icon: ShoppingBag },
  { id: 'mapa', name: 'Logística y Mapa', icon: MapPinned }, 
  { id: 'historial', name: 'Historial de Pedidos', icon: History },
  { id: 'clientes', name: 'Directorio CRM', icon: Users },
  { id: 'zonas', name: 'Configurar Zonas', icon: MapPin },
  { id: 'productos', name: 'Gestor de Productos', icon: Cake },
  { id: 'inventario', name: 'Control de Almacén', icon: Boxes },
  { id: 'costos', name: 'Finanzas y Costos', icon: Receipt },
  { id: 'accesos', name: 'Seguridad y Accesos', icon: Settings },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#FFF9F8] text-stone-500 font-medium">Cargando Sistema...</div>;

  if (!user) {
     return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-[#FFF9F8] font-sans text-[#4A2B29] overflow-hidden selection:bg-[#E29596]/30">
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col z-10 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 flex items-center gap-3 border-b border-stone-100">
          <div className="w-10 h-10 bg-[#4A2B29] rounded-xl flex items-center justify-center shadow-md">
            <Cake size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#4A2B29] tracking-tight leading-none">Mamina</h1>
            <p className="text-[10px] text-[#DF888A] uppercase tracking-widest font-bold mt-1">Enterprise ERP v4</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <p className="text-xs font-bold text-stone-400 mb-4 px-2 tracking-wider uppercase">Navegación</p>
          <ul className="space-y-1">
            {TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setCurrentTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    currentTab === tab.id ? 'bg-[#4A2B29] text-white shadow-md' : 'text-stone-500 hover:bg-stone-50 hover:text-[#4A2B29]'
                  }`}
                >
                  <tab.icon size={18} className={currentTab === tab.id ? 'text-[#DF888A]' : 'text-stone-400 group-hover:text-stone-700'} />
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-stone-100 bg-stone-50">
           <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-8 h-8 rounded-full bg-[#DF888A]/20 text-[#4A2B29] font-bold flex items-center justify-center text-xs shrink-0">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                 </div>
                 <div className="overflow-hidden">
                    <p className="text-xs font-bold text-[#3D221F] truncate">Administrador</p>
                    <p className="text-[10px] text-stone-500 truncate" title={user.email}>{user.email}</p>
                 </div>
              </div>
              <button onClick={() => auth.signOut()} className="text-stone-400 hover:text-rose-500 p-1" title="Cerrar Sesión"><X size={14}/></button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between px-8 sticky top-0 z-20">
          <h2 className="text-xl font-bold text-[#3D221F] tracking-tight flex items-center gap-2">
            {TABS.find((t) => t.id === currentTab)?.name || 'Módulo'}
          </h2>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-[#4A2B29] text-white text-sm font-medium rounded-lg shadow-sm hover:bg-[#3D221F] transition shadow-[0_4px_14px_0_rgba(74,43,41,0.39)]" onClick={() => setCurrentTab('pedidos')}>
              Nueva Orden Rápida
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#FFF9F8]">
          {currentTab === 'dashboard' && <DashboardModule user={user} />}
          {currentTab === 'pedidos' && <PedidosModule user={user} />}
          {currentTab === 'mapa' && <MapaModule user={user} />}
          {currentTab === 'historial' && <HistorialModule user={user} />}
          {currentTab === 'clientes' && <ClientesModule user={user} />}
          {currentTab === 'zonas' && <ZonasModule user={user} />}
          {currentTab === 'productos' && <ProductosModule user={user} />}
          {currentTab === 'inventario' && <InventarioModule user={user} />}
          {currentTab === 'costos' && <CostosModule user={user} />}
          {currentTab === 'accesos' && <AccesosModule user={user} />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// MÓDULO 1: DASHBOARD
// ==========================================
function DashboardModule({ user }) {
  const { data: pedidos, loading } = useFirestoreCollection('pedidos', user);

  const pedidosValidos = pedidos.filter(p => p.estado !== 'Anulado');
  const ingresosBrutos = pedidosValidos.reduce((acc, p) => acc + parseFloat(p.total || 0), 0);
  const ordenesActivas = pedidosValidos.filter(p => p.estado !== 'Entregado').length;
  const ticketPromedio = pedidosValidos.length > 0 ? (ingresosBrutos / pedidosValidos.length) : 0;

  if (loading) return <div className="animate-pulse flex gap-6"><div className="w-1/4 h-32 bg-stone-200 rounded-2xl"></div><div className="w-1/4 h-32 bg-stone-200 rounded-2xl"></div></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Visión General Operativa</h3>
          <p className="text-stone-500 mt-1 text-sm">Lectura directa desde Firestore (Colección de Pedidos).</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-6">
          <MetricCard title="Ingreso Bruto" value={`$${ingresosBrutos.toFixed(2)}`} trend="En vivo" isPositive={true} icon={TrendingUp} />
          <MetricCard title="Órdenes Activas" value={String(ordenesActivas)} trend="En proceso" isPositive={true} icon={Zap} />
          <MetricCard title="Ticket Promedio" value={`$${ticketPromedio.toFixed(2)}`} trend="Calculado" isPositive={true} icon={Receipt} />
          <MetricCard title="Total Pedidos (Válidos)" value={String(pedidosValidos.length)} trend="Histórico" isPositive={true} icon={ShoppingBag} />
        </div>
        <div className="col-span-12 md:col-span-4 bg-[#4A2B29] rounded-2xl shadow-xl p-6 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#DF888A]/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/10 rounded-lg"><Sparkles size={20} className="text-[#DF888A]" /></div>
            <h4 className="text-white font-semibold">Consejo de Expertos</h4>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-stone-300 text-sm leading-relaxed space-y-3">
            <p>💡 <strong className="text-white">Arquitectura Cloud:</strong> Ahora cada pedido es un documento independiente.</p>
            <p>💡 <strong className="text-white">Filtro Maestro:</strong> Los pedidos anulados se excluyen automáticamente de los ingresos brutos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO NUEVO: LOGÍSTICA Y MAPA
// ==========================================
function MapaModule({ user }) {
   const { data: pedidos, loading } = useFirestoreCollection('pedidos', user);
   const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);

   if (loading) return <div className="animate-pulse">Cargando inteligencia geoespacial...</div>;

   const pedidosDelivery = pedidos.filter(p => p.tipo === 'Delivery');
   const activos = pedidosDelivery.filter(p => !['Entregado', 'Anulado'].includes(p.estado));
   const pasados = pedidosDelivery.filter(p => p.estado === 'Entregado');

   const statsZonas = pedidosDelivery.reduce((acc, p) => {
      const zona = p.zona || 'Sin Zona Definida';
      if (!acc[zona]) acc[zona] = { count: 0, ingresos: 0 };
      acc[zona].count += 1;
      acc[zona].ingresos += parseFloat(p.total || 0);
      return acc;
   }, {});

   const topZonas = Object.entries(statsZonas)
      .map(([zona, stats]) => ({ zona, ...stats }))
      .sort((a, b) => b.count - a.count);

   return (
      <div className="animate-in fade-in duration-500 pb-10">
         <div className="flex justify-between items-end mb-6">
            <div>
               <h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Inteligencia de Logística y Rutas</h3>
               <p className="text-stone-500 text-sm mt-1">Visualización de despachos activos y analítica de zonas calientes.</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px] mb-6">
            <div className="lg:col-span-8 flex flex-col gap-6 h-full">
               <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex-1 flex flex-col overflow-hidden relative">
                  <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center z-10">
                     <h4 className="font-bold text-[#3D221F] flex items-center gap-2"><Navigation size={18} className="text-blue-500"/> Monitor de Entregas Activas</h4>
                     <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{activos.length} en ruta</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                     <div className="w-full md:w-1/3 border-r border-stone-100 bg-white overflow-y-auto">
                        {activos.length === 0 ? (
                           <div className="p-6 text-center text-stone-400 italic text-sm">No hay entregas activas en este momento.</div>
                        ) : (
                           activos.map(p => (
                              <div key={p._docId} onClick={() => setOrdenSeleccionada(p)} className={`p-4 border-b border-stone-100 cursor-pointer transition-colors ${ordenSeleccionada?._docId === p._docId ? 'bg-[#FFF9F8] border-l-4 border-l-[#DF888A]' : 'hover:bg-stone-50 border-l-4 border-l-transparent'}`}>
                                 <p className="font-bold text-[#4A2B29] text-sm">{p.id}</p>
                                 <p className="text-xs text-stone-600 font-medium truncate mt-1">{p.cliente}</p>
                                 <p className="text-[10px] text-stone-400 truncate flex items-center gap-1 mt-1"><MapPin size={10}/> {p.zona}</p>
                              </div>
                           ))
                        )}
                     </div>
                     
                     <div className="w-full md:w-2/3 bg-stone-100 relative h-full flex flex-col">
                        {ordenSeleccionada ? (
                           <React.Fragment>
                              <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg z-10 border border-stone-200">
                                 <p className="font-bold text-[#4A2B29] text-sm">Destino: {ordenSeleccionada.zona}</p>
                                 <p className="text-xs text-stone-600">{ordenSeleccionada.direccionText}</p>
                              </div>
                              <iframe 
                                 title="Mapa de Entrega"
                                 width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" 
                                 className="flex-1"
                                 src={`https://maps.google.com/maps?q=${encodeURIComponent(ordenSeleccionada.direccionText + ' Ecuador')}&output=embed`}
                              ></iframe>
                           </React.Fragment>
                        ) : (
                           <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-6 text-center">
                              <MapPinned size={48} className="mb-4 opacity-50 text-stone-300" />
                              <p>Selecciona una entrega de la lista para localizar el destino en el mapa de ruteo.</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
               <div className="bg-[#4A2B29] rounded-2xl border border-[#3D221F] shadow-xl p-6 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <h4 className="font-bold text-white mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-[#DF888A]"/> Zonas Calientes (Histórico)</h4>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                     {topZonas.length === 0 && <p className="text-stone-400 text-sm italic">Faltan datos de entregas.</p>}
                     {topZonas.map((z, idx) => (
                        <div key={z.zona} className="bg-white/5 border border-white/10 rounded-xl p-4">
                           <div className="flex justify-between items-start mb-2">
                              <p className="font-bold text-[#FCF6F5] text-sm">{idx + 1}. {z.zona}</p>
                              <span className="text-[10px] font-bold bg-[#DF888A]/20 text-[#DF888A] px-2 py-0.5 rounded">{z.count} pedidos</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-stone-400">Ingresos generados:</span>
                              <span className="font-black text-emerald-400">${z.ingresos.toFixed(2)}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <h4 className="font-bold text-[#3D221F] mb-2 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500"/> Entregas Exitosas</h4>
                  <div className="text-4xl font-black text-[#4A2B29]">{pasados.length}</div>
                  <p className="text-xs text-stone-500 mt-1">Despachos completados en la historia del sistema.</p>
               </div>
            </div>
         </div>
      </div>
   );
}


// ==========================================
// MÓDULO 2: PEDIDOS Y OPERACIONES
// ==========================================
function PedidosModule({ user }) {
  const { data: pedidos, loading: pLoad, addDocData, updateDocData } = useFirestoreCollection('pedidos', user);
  const { data: clientes, addDocData: addCliente, updateDocData: updateCliente } = useFirestoreCollection('clientes', user);
  const { data: zonas } = useFirestoreCollection('zonas', user);
  const { data: productos } = useFirestoreCollection('productos', user);
  const { data: atributos_precio } = useFirestoreCollection('atributos_precio', user);

  const [view, setView] = useState('list');
  const [pedidoActual, setPedidoActual] = useState(null);
  
  const [feedback, setFeedback] = useState(null);
  const showFeedback = (msg, type) => {
     setFeedback({ msg, type });
     setTimeout(() => setFeedback(null), 5000);
  };

  const pedidosActivos = pedidos.filter(p => 
    !(p.estado === 'Entregado' && parseFloat(p.saldo || 0) <= 0) && p.estado !== 'Anulado'
  );

  const handleGuardar = async (ordenData) => {
    try {
      if (pedidoActual && pedidoActual._docId) {
         await updateDocData(pedidoActual._docId, ordenData);
         showFeedback("Operación actualizada correctamente.", "success");
      } else {
         const customHumanId = `ORD-${Math.floor(Math.random() * 10000) + 90000}`;
         const nuevaOrden = { ...ordenData, id: customHumanId };
         await addDocData(nuevaOrden, customHumanId);
         showFeedback("Nueva orden registrada exitosamente.", "success");
      }
      setView('list');
    } catch (error) {
      console.error(error);
      showFeedback(String("Error de Sistema: " + (error.message || "Fallo en la comunicación con Firebase.")), "error");
    }
  };

  const handleEditar = (pedido) => {
    setPedidoActual(pedido);
    setView('edit');
  };

  if (pLoad) return <div className="animate-pulse">Cargando base de datos distribuida...</div>;

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Centro de Operaciones</h3>
        </div>
        {view === 'list' ? (
          <button onClick={() => { setPedidoActual(null); setView('new'); }} className="flex items-center gap-2 bg-[#4A2B29] text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:bg-[#3D221F] transition">
            <Plus size={18} /> Nueva Orden
          </button>
        ) : (
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-stone-500 px-4 py-2 bg-white rounded-lg border border-stone-200 shadow-sm hover:bg-stone-50 transition">
            <ChevronRight size={18} className="rotate-180" /> Cancelar
          </button>
        )}
      </div>

      {feedback && (
        <div className={`mb-6 w-full p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 ${feedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
           {feedback.type === 'error' ? <Zap size={18} className="shrink-0 text-rose-500"/> : <CheckCircle size={18} className="shrink-0 text-emerald-500"/>}
           {feedback.msg}
        </div>
      )}

      {view === 'list' ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#FFF9F8] text-stone-500 text-xs uppercase">
                <th className="p-4 font-bold border-b border-stone-200">ID / Fecha</th>
                <th className="p-4 font-bold border-b border-stone-200">Cliente</th>
                <th className="p-4 font-bold border-b border-stone-200">Logística</th>
                <th className="p-4 font-bold border-b border-stone-200">Estado</th>
                <th className="p-4 font-bold border-b border-stone-200">Total / Saldo</th>
                <th className="p-4 font-bold border-b border-stone-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pedidosActivos.length === 0 && (
                 <tr><td colSpan="6" className="p-8 text-center text-stone-400">No hay operaciones activas en curso.</td></tr>
              )}
              {pedidosActivos.map((p) => (
                <tr key={p._docId} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-[#4A2B29]">{p.id}</div>
                    <div className="text-[10px] text-stone-500">{p.fecha || 'Sin fecha'} • {p.hora}</div>
                  </td>
                  <td className="p-4 font-medium text-stone-700">
                    {p.cliente}
                    {p.requiereFactura && <span className="block text-[10px] text-blue-600 font-bold mt-0.5"><Receipt size={10} className="inline mr-0.5"/> Factura</span>}
                  </td>
                  <td className="p-4 text-stone-500 flex items-center gap-1.5">
                    <Truck size={14} className={p.tipo === 'Delivery' ? 'text-blue-500' : 'text-emerald-500'}/> 
                    {p.tipo} {p.zona && p.zona !== 'Local' ? <span className="text-[10px] bg-stone-200 px-1.5 py-0.5 rounded text-stone-700 ml-1 truncate max-w-[100px]" title={p.zona}>{p.zona}</span> : ''}
                  </td>
                  <td className="p-4">
                     <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide border ${p.estado === 'Entregado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : p.estado === 'En Camino' ? 'bg-blue-50 text-blue-700 border-blue-200' : p.estado === 'Listo' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-stone-100 text-stone-700 border-stone-200'}`}>
                        {p.estado}
                     </span>
                     {parseFloat(p.saldo) > 0 && p.estado === 'Entregado' && (
                        <div className="text-[10px] text-rose-500 font-bold mt-1 flex items-center gap-1"><Zap size={10}/> Falta Pagar</div>
                     )}
                     {p.fotoTerminado && (
                        <div className="text-[10px] text-purple-600 font-bold mt-1 flex items-center gap-1"><Camera size={10}/> Foto OK</div>
                     )}
                  </td>
                  <td className="p-4">
                     <div className="font-bold text-[#4A2B29]">${parseFloat(p.total).toFixed(2)}</div>
                     {parseFloat(p.saldo) > 0 ? (
                        <div className="text-[10px] text-rose-600 font-bold">Debe: ${parseFloat(p.saldo).toFixed(2)}</div>
                     ) : (
                        <div className="text-[10px] text-emerald-600 font-bold">Pagado</div>
                     )}
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleEditar(p)} className="text-stone-400 hover:text-[#4A2B29] p-2 bg-transparent hover:bg-stone-100 rounded-lg transition-colors">
                      <Edit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <PedidoFormulario 
           onGuardar={handleGuardar} 
           initialData={pedidoActual} 
           clientes={clientes} 
           zonas={zonas}
           productos={productos}
           diccionarioAtributos={atributos_precio}
           guardarNuevoCliente={addCliente}
           actualizarCliente={updateCliente}
        />
      )}
    </div>
  );
}

// ==========================================
// FORMULARIO DE PEDIDOS
// ==========================================
function PedidoFormulario({ onGuardar, initialData, clientes, zonas, productos, diccionarioAtributos, guardarNuevoCliente, actualizarCliente }) {
  const [busqueda, setBusqueda] = useState(initialData?.cliente || '');
  const [clienteActivo, setClienteActivo] = useState(null);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [modoNuevo, setModoNuevo] = useState(false);
  const [datosNuevoCliente, setDatosNuevoCliente] = useState({ nombre: '', cedula: '', telefono: '' });

  const [deliveryType, setDeliveryType] = useState(initialData?.tipo === 'Retiro en Local' ? 'pickup' : 'delivery');
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(initialData?.direccionId || 'new');
  const [mostrarFormDireccion, setMostrarFormDireccion] = useState(false);
  const [datosNuevaDireccion, setDatosNuevaDireccion] = useState({ principal: '', secundaria: '', referencia: '', zona: '', mapaLink: '' });
  
  const [fecha, setFecha] = useState(initialData?.fecha || new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState(initialData?.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [estado, setEstado] = useState(initialData?.estado || 'Preparación');
  const [instrucciones, setInstrucciones] = useState(initialData?.instrucciones || '');
  
  const [fotoTerminado, setFotoTerminado] = useState(initialData?.fotoTerminado || null);
  const estadoPermiteFoto = ['Listo', 'En Camino', 'Entregado'].includes(estado);

  const [requiereFactura, setRequiereFactura] = useState(initialData?.requiereFactura || false);
  const [ivaPorcentaje, setIvaPorcentaje] = useState(initialData?.ivaPorcentaje || 15);
  
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  const [llevaCortesia, setLlevaCortesia] = useState(initialData?.llevaCortesia || false);
  const [detalleCortesia, setDetalleCortesia] = useState(initialData?.detalleCortesia || '');

  const [carrito, setCarrito] = useState(initialData?.carrito || []);
  const [builderActivo, setBuilderActivo] = useState(false);
  const [prodBuilder, setProdBuilder] = useState({ categoria: '', idProducto: '', atributos: {}, notas: '', precio: '' });

  const [subtotalManual, setSubtotalManual] = useState(initialData?.subtotal || '0.00');
  const [costoEnvio, setCostoEnvio] = useState(initialData?.costoEnvio || '0.00');
  const [abono, setAbono] = useState(initialData?.abono || '0.00');

  const subtotalCalculado = carrito.length > 0 
      ? carrito.reduce((acc, item) => acc + parseFloat(item.precio || 0), 0).toFixed(2)
      : subtotalManual;

  const baseImponible = parseFloat(subtotalCalculado || 0) + parseFloat(costoEnvio || 0);
  const montoIva = requiereFactura ? (baseImponible * (parseFloat(ivaPorcentaje) / 100)) : 0;
  const totalCalculado = (baseImponible + montoIva).toFixed(2);
  const saldoPendiente = (parseFloat(totalCalculado) - parseFloat(abono || 0)).toFixed(2);

  const categoriasUnicas = [...new Set(productos?.map(p => p.categoria) || ['Tortas', 'Pasteles', 'Cupcakes', 'Negritos', 'Cheesecake', 'Cakepops', 'Alfajores', 'Rosca de Reyes'])];
  const productosFiltrados = productos?.filter(p => p.categoria === prodBuilder.categoria) || [];
  const prodSeleccionadoInfo = productos?.find(p => (p._docId || p.id) === prodBuilder.idProducto);

  const precioSugerido = useMemo(() => {
     let suma = 0;
     Object.values(prodBuilder.atributos).forEach(val => {
        const atr = diccionarioAtributos.find(d => d.nombre.toLowerCase() === String(val).toLowerCase());
        if (atr && atr.precio) suma += parseFloat(atr.precio);
     });
     return suma > 0 ? suma.toFixed(2) : null;
  }, [prodBuilder.atributos, diccionarioAtributos]);

  useEffect(() => {
    if (initialData?.cliente && clientes.length > 0) {
      const encontrado = clientes.find(c => c.nombre === initialData.cliente);
      if (encontrado) {
        setClienteActivo(encontrado);
        if (encontrado.direcciones?.length > 0 && initialData.tipo !== 'Retiro en Local') {
          if (!initialData.direccionId) {
             setDireccionSeleccionada(encontrado.direcciones[0].id?.toString() || '0');
          }
        } else {
           setMostrarFormDireccion(true);
        }
      }
    }
  }, [initialData, clientes]);

  const clientesFiltrados = useMemo(() => {
    if(!busqueda) return clientes;
    const lower = busqueda.toLowerCase();
    return clientes.filter(c => c.nombre.toLowerCase().includes(lower) || (c.cedula && c.cedula.includes(busqueda)));
  }, [busqueda, clientes]);

  const handleZonaChange = (e) => {
    const zonaName = e.target.value;
    setDatosNuevaDireccion({...datosNuevaDireccion, zona: zonaName});
    const zonaObj = zonas.find(z => z.nombre === zonaName);
    if (zonaObj) setCostoEnvio(String(zonaObj.costo.toFixed(2)));
  };

  const handleDireccionChange = (e) => {
    const val = e.target.value;
    setDireccionSeleccionada(val);
  };

  useEffect(() => {
     if (deliveryType === 'delivery' && clienteActivo && direccionSeleccionada && direccionSeleccionada !== 'new') {
        const dirObj = clienteActivo.direcciones?.find(d => d.id?.toString() === direccionSeleccionada);
        if (dirObj?.zona) {
           const zonaObj = zonas.find(z => z.nombre === dirObj.zona);
           if (zonaObj) setCostoEnvio(String(zonaObj.costo.toFixed(2)));
        }
     } else if (direccionSeleccionada === 'new') {
        setCostoEnvio('0.00'); 
     }
  }, [direccionSeleccionada, clienteActivo, deliveryType, zonas]);

  useEffect(() => {
    if (deliveryType === 'pickup') setCostoEnvio('0.00');
  }, [deliveryType]);

  const agregarAlCarrito = () => {
     if (!prodBuilder.idProducto || !prodBuilder.precio) return;
     const nuevoItem = {
        idVirtual: Date.now(),
        productoInfo: prodSeleccionadoInfo,
        atributosSeleccionados: prodBuilder.atributos,
        notas: prodBuilder.notas,
        precio: parseFloat(prodBuilder.precio)
     };
     setCarrito([...carrito, nuevoItem]);
     setBuilderActivo(false);
     setProdBuilder({ categoria: '', idProducto: '', atributos: {}, notas: '', precio: '' });
  };

  const eliminarDelCarrito = (idVirtual) => {
     setCarrito(carrito.filter(c => c.idVirtual !== idVirtual));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setFotoTerminado(compressedBase64);
      }
    };
  };

  const enviarMensajeWA = () => {
    const telefonoBruto = clienteActivo?.telefono || datosNuevoCliente?.telefono || '';
    if (!telefonoBruto) {
       setLocalError("No hay número de teléfono registrado para este cliente.");
       setTimeout(() => setLocalError(''), 4000);
       return;
    }
    let cleanTel = telefonoBruto.replace(/\D/g, '');
    if (cleanTel.startsWith('0')) cleanTel = `593${cleanTel.substring(1)}`;

    const accionLogistica = deliveryType === 'pickup' 
       ? 'está LISTO y esperando en nuestro local para que pases a retirarlo.' 
       : 'ya se encuentra EN CAMINO hacia tu dirección.';
    
    const nombreCliente = clienteActivo?.nombre || datosNuevoCliente?.nombre || 'estimado cliente';
    const text = `¡Hola ${nombreCliente}! 🎉 Te confirmamos que tu pedido ${accionLogistica} Te adjuntamos por aquí la foto de cómo quedó. ¡Gracias por preferir Mamina! 🎂`;
    
    window.open(`https://wa.me/${cleanTel}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const submit = async () => {
    setLocalError(''); 

    if (modoNuevo) {
       const cedNuevo = datosNuevoCliente.cedula?.trim();
       if (cedNuevo && !/^\d{10}$|^\d{13}$/.test(cedNuevo)) {
          setLocalError("Error: La Cédula debe tener 10 números o el RUC 13 números exactos.");
          return;
       }
       const telNuevo = datosNuevoCliente.telefono?.trim();
       if (telNuevo && !/^\d{10}$/.test(telNuevo)) {
          setLocalError("Error: El teléfono celular debe tener exactamente 10 números.");
          return;
       }
    } else if (clienteActivo) {
       const cedActivo = clienteActivo.cedula?.trim();
       if (cedActivo && !/^\d{10}$|^\d{13}$/.test(cedActivo)) {
          setLocalError("Error: La Cédula del cliente debe tener 10 números o el RUC 13 números.");
          return;
       }
       const telActivo = clienteActivo.telefono?.trim();
       if (telActivo && !/^\d{10}$/.test(telActivo)) {
          setLocalError("Error: El teléfono del cliente debe tener exactamente 10 números.");
          return;
       }
    }

    if (requiereFactura) {
      if (modoNuevo && (!datosNuevoCliente.cedula || datosNuevoCliente.cedula.trim() === '')) {
         setLocalError("Para facturar, la Cédula o RUC del nuevo cliente es obligatoria."); return;
      }
      if (clienteActivo && (!clienteActivo.cedula || clienteActivo.cedula.trim() === '')) {
         setLocalError("Para facturar, debes proveer la Cédula/RUC del cliente seleccionado."); return;
      }
      if (!modoNuevo && !clienteActivo) {
         setLocalError("Selecciona un cliente válido para poder emitir la factura."); return;
      }
    }

    let nombreFinal = busqueda || 'Cliente General';
    let zonaFinal = 'Local';
    let direccionFisicaText = 'Retiro en Local';
    let finalDireccionId = direccionSeleccionada;

    if (modoNuevo && datosNuevoCliente.nombre) {
      const nuevoIdCliente = `CLI-${Date.now()}`;
      const clienteAInsertar = {
        id: nuevoIdCliente, nombre: datosNuevoCliente.nombre, cedula: datosNuevoCliente.cedula,
        telefono: datosNuevoCliente.telefono, pedidos: 0, direcciones: []
      };
      
      if (deliveryType === 'delivery' && (datosNuevaDireccion.principal || datosNuevaDireccion.zona)) {
        const nuevaDirObj = { id: String(Date.now()), ...datosNuevaDireccion };
        clienteAInsertar.direcciones.push(nuevaDirObj);
        zonaFinal = nuevaDirObj.zona || 'Por definir';
        direccionFisicaText = `${nuevaDirObj.principal} y ${nuevaDirObj.secundaria}`;
        finalDireccionId = nuevaDirObj.id;
      }
      
      await guardarNuevoCliente(clienteAInsertar, nuevoIdCliente);
      nombreFinal = clienteAInsertar.nombre;

    } else if (clienteActivo) {
      nombreFinal = clienteActivo.nombre;
      let actualizacionesCliente = {};
      let clienteModificado = false;

      if (requiereFactura && clienteActivo.cedula !== undefined && clienteActivo.cedula.trim() !== '') {
          actualizacionesCliente.cedula = clienteActivo.cedula;
          clienteModificado = true;
      }

      if (deliveryType === 'delivery') {
        if (mostrarFormDireccion && (datosNuevaDireccion.principal || datosNuevaDireccion.zona)) {
          const nuevaDirObj = { id: String(Date.now()), ...datosNuevaDireccion };
          actualizacionesCliente.direcciones = [...(clienteActivo.direcciones || []), nuevaDirObj];
          clienteModificado = true;
          
          zonaFinal = nuevaDirObj.zona || 'Por definir';
          direccionFisicaText = `${nuevaDirObj.principal} y ${nuevaDirObj.secundaria}`;
          finalDireccionId = nuevaDirObj.id;
        } else if (!mostrarFormDireccion && clienteActivo.direcciones) {
          const dirObj = clienteActivo.direcciones.find(d => d.id?.toString() === direccionSeleccionada);
          if (dirObj) {
            zonaFinal = dirObj.zona || 'Por definir';
            direccionFisicaText = `${dirObj.principal} y ${dirObj.secundaria}`;
          }
        }
      }

      if (clienteModificado) await actualizarCliente(clienteActivo._docId, actualizacionesCliente);
    }

    if (deliveryType === 'pickup') {
      zonaFinal = 'Local';
      direccionFisicaText = 'Retiro en el local';
    }

    await onGuardar({
      cliente: nombreFinal,
      estado: estado, fecha: fecha, hora: hora, instrucciones: instrucciones, 
      requiereFactura: requiereFactura,
      ivaPorcentaje: requiereFactura ? parseFloat(ivaPorcentaje) : 0,
      montoIva: montoIva.toFixed(2),
      llevaCortesia: llevaCortesia, detalleCortesia: llevaCortesia ? detalleCortesia : '',
      fotoTerminado: fotoTerminado,
      carrito: carrito, subtotal: subtotalCalculado, costoEnvio: costoEnvio, total: totalCalculado,
      abono: abono, saldo: saldoPendiente, tipo: deliveryType === 'delivery' ? 'Delivery' : 'Retiro en Local',
      zona: zonaFinal, direccionText: direccionFisicaText, direccionId: finalDireccionId
    });
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start pb-20">
      <div className="flex-1 space-y-6 w-full">
        
        {localError && (
          <div className="w-full bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
            <Zap size={18} className="shrink-0 text-rose-500"/> {localError}
          </div>
        )}
        {localSuccess && (
          <div className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
            <CheckCircle size={18} className="shrink-0 text-emerald-500"/> {localSuccess}
          </div>
        )}

        {/* BLOQUE: ESTADO Y TIEMPOS */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative">
           <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-[#4A2B29] flex items-center gap-2"><Settings size={18} className="text-stone-400"/> Atributos de la Orden</h4>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Estado Operativo</label>
                 <select value={estado} onChange={e => setEstado(e.target.value)} className={`w-full px-3 py-2.5 border rounded-lg outline-none text-sm font-bold shadow-sm ${estado === 'Entregado' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : estado === 'Anulado' ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-white border-stone-200 text-stone-700 focus:ring-2 focus:ring-amber-500'}`}>
                    <option value="Preparación">⏳ Preparación</option>
                    <option value="Listo">🛍️ Listo</option>
                    <option value="En Camino">🛵 En Camino</option>
                    <option value="Entregado">✅ Entregado</option>
                    <option value="Anulado">❌ Anulado</option>
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Fecha de Entrega</label>
                 <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-amber-500 font-medium" />
              </div>
              <div>
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Hora Estimada</label>
                 <input type="time" value={hora} onChange={e => setHora(e.target.value)} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-amber-500 font-medium" />
              </div>
           </div>
           
           <div className="mt-5 pt-4 border-t border-stone-100 flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                 <input type="checkbox" checked={requiereFactura} onChange={e => setRequiereFactura(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600" />
                 <span className="text-sm font-bold text-stone-700 flex items-center gap-1.5"><Receipt size={16} className="text-blue-500"/> Requiere Factura Electrónica</span>
              </label>
              {requiereFactura && (
                 <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">IVA % :</span>
                    <input type="number" value={ivaPorcentaje} onChange={e => setIvaPorcentaje(e.target.value)} className="w-16 border border-blue-200 rounded px-2 py-1 text-sm font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
              )}
           </div>
        </div>

        {/* EVIDENCIA VISUAL */}
        {estadoPermiteFoto && (
           <div className="bg-[#FFF9F8] p-6 rounded-2xl border border-[#E29596] shadow-sm relative animate-in fade-in slide-in-from-bottom-4">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#DF888A] rounded-l-2xl"></div>
             <h4 className="font-bold text-[#4A2B29] mb-4 flex items-center gap-2"><Camera size={18} className="text-[#DF888A]"/> Evidencia Visual de Producción</h4>
             <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-1/3">
                   <label className="cursor-pointer bg-white border-2 border-dashed border-[#DF888A] hover:border-[#4A2B29] rounded-xl p-4 flex flex-col items-center justify-center text-[#DF888A] hover:text-[#4A2B29] hover:bg-[#FFF9F8] transition-colors h-32">
                     <Camera size={24} className="mb-2" />
                     <span className="text-xs font-bold text-center">Cargar Fotografía</span>
                     <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                   </label>
                </div>
                <div className="w-full md:w-2/3 flex flex-col items-start justify-center h-full">
                   {fotoTerminado ? (
                      <div className="flex flex-col sm:flex-row gap-4 items-center w-full bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                         <img src={fotoTerminado} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-stone-200" />
                         <div className="flex-1 w-full">
                            <p className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1"><CheckCircle size={12}/> Evidencia Guardada</p>
                            <button onClick={enviarMensajeWA} className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"><MessageCircle size={16} /> Notificar Cliente</button>
                         </div>
                      </div>
                   ) : (<div className="text-sm text-[#DF888A] italic bg-white w-full h-32 rounded-xl flex items-center justify-center border border-[#F2E8E6]">Esperando imagen...</div>)}
                </div>
             </div>
           </div>
        )}

        {/* BLOQUE CLIENTE */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#4A2B29] rounded-l-2xl"></div>
          <h4 className="font-bold text-[#4A2B29] mb-4 flex items-center gap-2"><Users size={18} className="text-stone-400"/> Identidad del Cliente</h4>
          {!clienteActivo && !modoNuevo ? (
            <div className="relative">
              <div className="flex items-center border border-stone-200 rounded-xl px-3 bg-stone-50 focus-within:ring-2 focus-within:ring-[#4A2B29] focus-within:bg-white transition-all">
                <Search size={18} className="text-stone-400" />
                <input type="text" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setMostrarDropdown(true); }} onFocus={() => setMostrarDropdown(true)} placeholder="Buscar en la base de datos de clientes..." className="w-full px-3 py-3 outline-none bg-transparent font-medium" />
              </div>
              {mostrarDropdown && busqueda && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-stone-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] max-h-64 overflow-y-auto z-50">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map(c => (
                      <div key={c._docId || c.id} onClick={() => { setClienteActivo(c); setBusqueda(c.nombre); setMostrarDropdown(false); if(c.direcciones?.length > 0) setDireccionSeleccionada(c.direcciones[0].id?.toString()); }} className="p-3 hover:bg-stone-50 cursor-pointer border-b border-stone-100 transition-colors">
                        <p className="font-bold text-[#3D221F] text-sm">{c.nombre}</p><p className="text-[11px] text-stone-500 font-medium">Doc: {c.cedula || 'N/A'} | Tel: {c.telefono || 'N/A'}</p>
                      </div>
                    ))
                  ) : (<div className="p-4 text-sm text-stone-500 italic text-center border-b border-stone-100">Sin coincidencias.</div>)}
                  <div onClick={() => { setModoNuevo(true); setMostrarDropdown(false); setDatosNuevoCliente({...datosNuevoCliente, nombre: busqueda}); setMostrarFormDireccion(true); }} className="p-3 bg-[#FFF9F8] hover:bg-[#F2E8E6] cursor-pointer text-[#4A2B29] font-bold text-sm flex items-center gap-2 transition-colors sticky bottom-0"><Plus size={16} /> Crear nuevo documento: "{busqueda}"</div>
                </div>
              )}
            </div>
          ) : clienteActivo ? (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 relative flex flex-col gap-4">
              <button onClick={() => { setClienteActivo(null); setBusqueda(''); setMostrarFormDireccion(false); }} className="absolute top-3 right-3 text-stone-400 hover:text-[#4A2B29]"><X size={16} /></button>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-[#4A2B29] rounded-full flex items-center justify-center font-bold text-white text-lg shadow-inner">{clienteActivo.nombre.charAt(0).toUpperCase()}</div>
                 <div><h5 className="font-bold text-[#3D221F] text-lg leading-tight">{clienteActivo.nombre}</h5><p className="text-xs text-stone-500 font-medium mt-0.5 tracking-wide">ID: {clienteActivo.id} | C.I: {clienteActivo.cedula || 'N/A'}</p></div>
              </div>
              {requiereFactura && (!clienteActivo.cedula || clienteActivo.cedula.trim() === '') && (
                 <div className="mt-2 pt-3 border-t border-stone-200 animate-in fade-in">
                    <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest block mb-1">Obligatorio para Facturación</label>
                    <input type="text" placeholder="Ingresa Cédula o RUC para guardar en el CRM..." className="w-full px-3 py-2 border border-rose-300 bg-rose-50 rounded-lg outline-none text-sm focus:ring-2 focus:ring-rose-500 text-rose-900 placeholder:text-rose-400" onChange={(e) => setClienteActivo({...clienteActivo, cedula: e.target.value})} />
                 </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-inner">
               <div className="flex justify-between items-center mb-4"><h5 className="font-bold text-emerald-800">Generar Nuevo Registro de Cliente</h5><button onClick={() => { setModoNuevo(false); setMostrarFormDireccion(false); }} className="text-emerald-600 hover:text-emerald-900 bg-white p-1 rounded-md shadow-sm"><X size={16}/></button></div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2"><input type="text" placeholder="Nombre Completo" value={datosNuevoCliente.nombre} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nombre: e.target.value})} className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500 font-medium" /></div>
                 <div><input type="text" placeholder={requiereFactura ? "Cédula / RUC (Obligatorio)*" : "Cédula / RUC"} value={datosNuevoCliente.cedula} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, cedula: e.target.value})} className={`w-full px-3 py-2.5 border rounded-lg outline-none text-sm ${requiereFactura && !datosNuevoCliente.cedula ? 'border-rose-400 bg-rose-50 focus:ring-2 focus:ring-rose-500 placeholder:text-rose-400' : 'border-emerald-200 focus:ring-2 focus:ring-emerald-500'}`} /></div>
                 <div><input type="text" placeholder="Teléfono" value={datosNuevoCliente.telefono} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, telefono: e.target.value})} className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500" /></div>
               </div>
            </div>
          )}
        </div>

        {/* BLOQUE: PRODUCTOS Y CONSTRUCTOR */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative z-20">
           <div className="absolute top-0 left-0 w-1 h-full bg-[#DF888A] rounded-l-2xl"></div>
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-[#4A2B29] flex items-center gap-2"><Cake size={18} className="text-stone-400"/> Constructor de Productos</h4>
              {!builderActivo && (
                 <button onClick={() => setBuilderActivo(true)} className="text-xs font-bold text-white bg-[#4A2B29] px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-[#3D221F] transition"><Plus size={14}/> Agregar Producto</button>
              )}
           </div>

           {builderActivo && (
              <div className="bg-[#FFF9F8] p-5 rounded-xl border border-[#F2E8E6] mb-5 shadow-inner">
                 <div className="flex justify-between items-start mb-3">
                    <h5 className="font-bold text-[#4A2B29] text-sm uppercase tracking-wider">Configurador de Ítem</h5>
                    <button onClick={() => setBuilderActivo(false)} className="text-[#DF888A] hover:text-[#4A2B29]"><X size={16}/></button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                       <label className="text-[10px] font-bold text-[#4A2B29] uppercase block mb-1">Categoría General</label>
                       <select value={prodBuilder.categoria} onChange={e => setProdBuilder({...prodBuilder, categoria: e.target.value, idProducto: '', atributos: {}})} className="w-full px-3 py-2 border border-[#F2E8E6] rounded-md outline-none text-sm focus:ring-2 focus:ring-[#DF888A]">
                          <option value="">Seleccione Categoría...</option>
                          {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-[#4A2B29] uppercase block mb-1">Producto / Subcategoría</label>
                       <select value={prodBuilder.idProducto} onChange={e => setProdBuilder({...prodBuilder, idProducto: e.target.value, atributos: {}})} disabled={!prodBuilder.categoria} className="w-full px-3 py-2 border border-[#F2E8E6] rounded-md outline-none text-sm focus:ring-2 focus:ring-[#DF888A] disabled:opacity-50">
                          <option value="">Seleccione Producto...</option>
                          {productosFiltrados.map(p => <option key={p._docId || p.id} value={p._docId || p.id}>{p.nombre}</option>)}
                       </select>
                    </div>
                 </div>

                 {prodSeleccionadoInfo && prodSeleccionadoInfo.atributos && prodSeleccionadoInfo.atributos.length > 0 && (
                    <div className="border-t border-[#F2E8E6] pt-3 pb-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                       <div className="md:col-span-3 text-[10px] font-bold text-[#DF888A] uppercase tracking-widest flex justify-between">
                          <span>Atributos del Producto</span>
                          {precioSugerido && <span className="text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1"><Sparkles size={10}/>Sugerencia Diccionario: +${precioSugerido}</span>}
                       </div>
                       {prodSeleccionadoInfo.atributos.map(attr => (
                          <div key={attr}><input type="text" placeholder={attr} value={prodBuilder.atributos[attr] || ''} onChange={e => setProdBuilder({...prodBuilder, atributos: {...prodBuilder.atributos, [attr]: e.target.value}})} className="w-full px-3 py-1.5 border border-stone-200 rounded text-sm outline-none focus:ring-1 focus:ring-[#DF888A] bg-white" /></div>
                       ))}
                    </div>
                 )}

                 <div className="flex gap-4 items-end">
                    <div className="flex-1"><label className="text-[10px] font-bold text-[#4A2B29] uppercase block mb-1">Notas especiales (Ej. Dedicatoria)</label><input type="text" value={prodBuilder.notas} onChange={e => setProdBuilder({...prodBuilder, notas: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none text-sm focus:ring-2 focus:ring-[#DF888A]" /></div>
                    <div className="w-32"><label className="text-[10px] font-bold text-[#4A2B29] uppercase block mb-1">Precio Final ($)</label><input type="number" value={prodBuilder.precio} onChange={e => setProdBuilder({...prodBuilder, precio: e.target.value})} placeholder={precioSugerido ? `Sug: ${precioSugerido}` : "0.00"} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none text-sm font-bold text-[#4A2B29] focus:ring-2 focus:ring-[#DF888A] text-right placeholder:text-stone-300" /></div>
                    <button onClick={agregarAlCarrito} disabled={!prodBuilder.idProducto || !prodBuilder.precio} className="bg-[#4A2B29] hover:bg-[#3D221F] disabled:bg-stone-300 text-white px-5 py-2 rounded-md font-bold text-sm h-[38px] shadow-sm transition">Cargar</button>
                 </div>
              </div>
           )}

           {/* LISTA DE CARRITO */}
           {carrito.length > 0 ? (
              <div className="space-y-3">
                 {carrito.map((item, idx) => (
                    <div key={item.idVirtual} className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex justify-between items-start group">
                       <div className="flex-1">
                          <div className="flex items-center gap-2">
                             <span className="font-bold text-[#3D221F] text-sm">{item.productoInfo?.nombre}</span>
                             <span className="text-[10px] bg-[#FFF9F8] border border-[#F2E8E6] px-2 py-0.5 rounded text-[#4A2B29] uppercase tracking-widest">{item.productoInfo?.categoria}</span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1 space-x-2">
                             {Object.entries(item.atributosSeleccionados || {}).map(([k, v]) => (
                                v ? <span key={k} className="inline-block"><strong className="text-stone-400 font-medium">{k}:</strong> {String(v)}</span> : null
                             ))}
                          </div>
                          {item.notas && <p className="text-xs text-[#DF888A] mt-1 italic">"{item.notas}"</p>}
                       </div>
                       <div className="flex flex-col items-end justify-between h-full pl-4 border-l border-stone-200">
                          <button onClick={() => eliminarDelCarrito(item.idVirtual)} className="text-stone-300 hover:text-rose-500"><X size={14}/></button>
                          <span className="font-bold text-[#4A2B29] mt-2">${item.precio.toFixed(2)}</span>
                       </div>
                    </div>
                 ))}
              </div>
           ) : (<div className="text-sm text-stone-400 italic bg-stone-50 p-5 rounded-xl text-center border border-dashed border-stone-200">Aún no has agregado productos a esta orden.</div>)}
           
           <div className="mt-6 pt-5 border-t border-stone-100 space-y-4">
             <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Instrucciones Extras / Generales</label><textarea rows="2" value={instrucciones} onChange={e => setInstrucciones(e.target.value)} placeholder="Ej: Entregar en garita, requiere factura electrónica..." className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#4A2B29] bg-stone-50"></textarea></div>
             <div className="bg-[#FFF9F8] p-4 rounded-xl border border-[#F2E8E6]">
                <label className="flex items-center gap-3 cursor-pointer">
                   <input type="checkbox" checked={llevaCortesia} onChange={e => setLlevaCortesia(e.target.checked)} className="w-5 h-5 text-[#DF888A] rounded focus:ring-[#DF888A] accent-[#DF888A]" />
                   <span className="text-sm font-bold text-[#4A2B29] flex items-center gap-1"><Sparkles size={16} className="text-[#DF888A]"/> Lleva detalle de Cortesía</span>
                </label>
                {llevaCortesia && (
                   <div className="mt-3 pl-8"><input type="text" placeholder="Describir cortesía (Ej. Velas mágicas)" value={detalleCortesia} onChange={e => setDetalleCortesia(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] shadow-sm" /></div>
                )}
             </div>
           </div>
        </div>

        {/* BLOQUE: LOGÍSTICA */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative z-10">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
          <h4 className="font-bold text-[#4A2B29] mb-4">Logística y Rutas</h4>
          
          <div className="flex gap-4 mb-5">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${deliveryType === 'delivery' ? 'bg-[#FFF9F8] border-[#DF888A] text-[#4A2B29] font-bold' : 'border-stone-100 text-stone-500 hover:bg-stone-50'}`}>
              <input type="radio" name="deliveryType" value="delivery" checked={deliveryType === 'delivery'} onChange={() => setDeliveryType('delivery')} className="hidden" />
              <Truck size={18} /> Delivery
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${deliveryType === 'pickup' ? 'bg-[#FFF9F8] border-[#DF888A] text-[#4A2B29] font-bold' : 'border-stone-100 text-stone-500 hover:bg-stone-50'}`}>
              <input type="radio" name="deliveryType" value="pickup" checked={deliveryType === 'pickup'} onChange={() => setDeliveryType('pickup')} className="hidden" />
              <MapPin size={18} /> Retiro en Local
            </label>
          </div>

          {deliveryType === 'delivery' && (
            <div className="space-y-4 animate-in fade-in bg-stone-50 p-5 rounded-xl border border-stone-100">
              {clienteActivo && clienteActivo.direcciones && clienteActivo.direcciones.length > 0 && !mostrarFormDireccion && (
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Direcciones en Perfil</label>
                  <select value={direccionSeleccionada} onChange={handleDireccionChange} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white font-medium text-stone-700 shadow-sm">
                    {clienteActivo.direcciones.map((dir, idx) => (
                      <option key={idx} value={dir.id}>{dir.principal} y {dir.secundaria} {dir.zona ? `(${dir.zona})` : ''}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => { setMostrarFormDireccion(true); setDireccionSeleccionada('new'); setCostoEnvio('0.00'); }} className="mt-3 text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800 transition-colors">
                     <Plus size={14}/> Registrar y usar una nueva dirección
                  </button>
                </div>
              )}

              {(!clienteActivo || !clienteActivo.direcciones?.length || mostrarFormDireccion) && (
                <div className={`space-y-3 ${clienteActivo && clienteActivo.direcciones?.length > 0 ? 'pt-2 border-t border-stone-200 mt-2' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Nueva Dirección</span>
                     {clienteActivo && clienteActivo.direcciones?.length > 0 && (
                        <button type="button" onClick={() => { setMostrarFormDireccion(false); setDireccionSeleccionada(clienteActivo.direcciones[0].id.toString()); }} className="text-stone-400 hover:text-stone-700"><X size={14}/></button>
                     )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2"><input type="text" placeholder="Calle Principal" value={datosNuevaDireccion.principal} onChange={e=>setDatosNuevaDireccion({...datosNuevaDireccion, principal: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white" /></div>
                    <div><input type="text" placeholder="Calle Secundaria" value={datosNuevaDireccion.secundaria} onChange={e=>setDatosNuevaDireccion({...datosNuevaDireccion, secundaria: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white" /></div>
                    <div>
                      <select value={datosNuevaDireccion.zona} onChange={handleZonaChange} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white font-medium text-stone-600">
                        <option value="">Zona de Cobertura...</option>
                        {zonas.map(z => <option key={z._docId || z.id} value={z.nombre}>{z.nombre} (${z.costo})</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                       <div className="relative">
                          <span className="absolute left-3 top-2.5 text-[#DF888A]"><Map size={14}/></span>
                          <input type="url" placeholder="Pegar Link directo de Google Maps (Opcional)" value={datosNuevaDireccion.mapaLink} onChange={e=>setDatosNuevaDireccion({...datosNuevaDireccion, mapaLink: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white" />
                       </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-blue-100 p-3 rounded-lg border border-blue-200 mt-4 shadow-inner">
                <span className="text-sm font-bold text-blue-900">Costo del Delivery:</span>
                <div className="relative w-32">
                  <span className="absolute left-3 top-2 text-blue-600 font-bold">$</span>
                  <input type="number" value={costoEnvio} onChange={e => setCostoEnvio(e.target.value)} className="w-full pl-7 pr-3 py-2 border-none rounded-md outline-none text-sm bg-white font-bold text-blue-900 text-right shadow-sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BLOQUE: FINANZAS */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative z-0">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#DF888A] rounded-l-2xl"></div>
          <h4 className="font-bold text-[#4A2B29] mb-4">Estructura Financiera</h4>
          
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-stone-100 pt-4">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Subtotal Productos</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold">$</span>
                  {carrito.length > 0 ? (
                     <input type="text" value={subtotalCalculado} readOnly className="w-full pl-7 pr-3 py-2.5 border border-stone-100 rounded-lg outline-none text-sm bg-stone-100 font-bold text-stone-600 cursor-not-allowed" title="Calculado desde el carrito" />
                  ) : (
                     <input type="number" value={subtotalManual} onChange={e => setSubtotalManual(e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#4A2B29] bg-stone-50 font-bold text-[#4A2B29] transition-all" />
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Envío (Logística)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-blue-400 font-bold">$</span>
                  <input type="text" value={costoEnvio} readOnly className="w-full pl-7 pr-3 py-2.5 border border-blue-100 rounded-lg outline-none text-sm bg-blue-50 font-bold text-blue-800 cursor-not-allowed" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest block mb-1">Total del Pedido</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-rose-600 font-bold">$</span>
                  <input type="text" value={totalCalculado} readOnly className="w-full pl-7 pr-3 py-2.5 border-none rounded-lg outline-none text-sm bg-rose-50 font-black text-rose-800 cursor-not-allowed shadow-inner" />
                </div>
              </div>
            </div>

            {/* FIX PUNTO 2: Muestra el IVA si está marcado */}
            {requiereFactura && (
               <div className="flex justify-between items-center text-blue-700 bg-blue-50 p-2 rounded-lg text-sm border border-blue-100 animate-in fade-in slide-in-from-left-2">
                  <span className="font-bold flex items-center gap-1"><Receipt size={14}/> IVA Añadido ({ivaPorcentaje}%)</span>
                  <span className="font-black">+${montoIva.toFixed(2)}</span>
               </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-100">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Abono Inicial / Pagado</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-600 font-bold">$</span>
                  <input type="number" value={abono} onChange={e => setAbono(e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-emerald-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500 bg-emerald-50 font-bold text-emerald-900" />
                </div>
              </div>
              <div className={`p-3 rounded-xl flex flex-col justify-center items-end shadow-inner transition-colors ${parseFloat(saldoPendiente) <= 0 ? 'bg-emerald-600' : 'bg-[#4A2B29]'}`}>
                <span className="font-bold text-stone-300 text-[10px] uppercase tracking-wider">{parseFloat(saldoPendiente) <= 0 ? 'Pagado Completamente' : 'Saldo Pendiente'}</span>
                <span className="text-2xl font-black text-white">${parseFloat(saldoPendiente) <= 0 ? '0.00' : saldoPendiente}</span>
              </div>
            </div>
          </div>
        </div>

        <button type="button" onClick={submit} className="w-full py-4 bg-[#4A2B29] hover:bg-[#3D221F] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(74,43,41,0.39)] transition-all">
          <Save size={18} /> {initialData ? 'Actualizar Operación' : 'Procesar Orden (NoSQL)'}
        </button>

        {requiereFactura && estado === 'Listo' && initialData && (
           <button type="button" onClick={() => { setLocalSuccess("Conectando con API SRI..."); setTimeout(() => setLocalSuccess(''), 4000); }} className="w-full mt-3 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] transition-all animate-in slide-in-from-bottom-4">
              <Receipt size={20} /> Emitir Factura Electrónica (SRI)
           </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO HISTORIAL DE PEDIDOS
// ==========================================
function HistorialModule({ user }) {
  const { data: pedidos, loading } = useFirestoreCollection('pedidos', user);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  
  const pedidosCompletados = pedidos.filter(p => 
    (p.estado === 'Entregado' && parseFloat(p.saldo || 0) <= 0) || p.estado === 'Anulado'
  );

  if (loading) return <div className="animate-pulse">Cargando base de datos distribuida...</div>;

  if (pedidoSeleccionado) {
    const p = pedidoSeleccionado;
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-4xl mx-auto pb-10">
         <button onClick={() => setPedidoSeleccionado(null)} className="flex items-center gap-2 text-stone-500 hover:text-[#4A2B29] bg-white border border-stone-200 px-4 py-2 rounded-lg mb-6 shadow-sm transition-colors">
            <ArrowLeft size={16} /> Volver al Archivo
         </button>
         
         <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-md relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${p.estado === 'Anulado' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
            
            <div className="flex justify-between items-start mb-8 pt-4 border-b border-stone-100 pb-6">
               <div>
                  <h3 className="text-3xl font-black text-[#4A2B29] tracking-tight">{p.id}</h3>
                  <p className="text-stone-500 font-medium mt-1">{p.fecha} • {p.hora}</p>
               </div>
               <div className="text-right">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-widest border ${p.estado === 'Anulado' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                     {p.estado}
                  </span>
                  {p.requiereFactura && (
                     <div className="mt-3 flex flex-col items-end gap-2">
                        <div className="text-xs font-bold text-blue-600 flex items-center justify-end gap-1"><Receipt size={12}/> Factura SRI Solicitada</div>
                        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5 shadow-sm transition"><Receipt size={14}/> Imprimir / PDF</button>
                     </div>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
               <div>
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Datos del Cliente</h4>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                     <p className="font-bold text-[#4A2B29] text-lg">{p.cliente}</p>
                     <p className="text-sm text-stone-600 mt-1 flex items-center gap-2"><Truck size={14}/> {p.tipo} {p.zona && p.zona !== 'Local' ? `(${p.zona})` : ''}</p>
                     {p.direccionText && p.direccionText !== 'Retiro en el local' && <p className="text-xs text-stone-500 mt-2">{p.direccionText}</p>}
                  </div>
               </div>
               {p.fotoTerminado && (
                  <div>
                     <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Evidencia Visual</h4>
                     <img src={p.fotoTerminado} alt="Evidencia" className="w-full h-32 object-cover rounded-xl border border-stone-200 shadow-sm" />
                  </div>
               )}
            </div>

            <div className="mb-8">
               <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Detalle del Pedido</h4>
               <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-[#FFF9F8]">
                        <tr><th className="p-3 font-semibold text-stone-600">Producto</th><th className="p-3 font-semibold text-stone-600 text-right">Precio</th></tr>
                     </thead>
                     <tbody className="divide-y divide-stone-100">
                        {p.carrito && p.carrito.map(item => (
                           <tr key={item.idVirtual} className="bg-white">
                              <td className="p-3">
                                 <p className="font-bold text-[#3D221F]">{item.productoInfo?.nombre}</p>
                                 <p className="text-xs text-stone-500 mt-0.5">{Object.entries(item.atributosSeleccionados || {}).map(([k,v]) => `${k}: ${v}`).join(' | ')}</p>
                                 {item.notas && <p className="text-xs text-purple-600 mt-0.5">"{item.notas}"</p>}
                              </td>
                              <td className="p-3 font-bold text-[#4A2B29] text-right">${item.precio.toFixed(2)}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {(p.instrucciones || p.llevaCortesia) && (
               <div className="mb-8 bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm">
                  {p.instrucciones && <p className="text-amber-900"><strong className="font-bold">Instrucciones:</strong> {p.instrucciones}</p>}
                  {p.llevaCortesia && <p className="text-amber-900 mt-2"><strong className="font-bold flex items-center gap-1"><Sparkles size={14}/> Cortesía:</strong> {p.detalleCortesia}</p>}
               </div>
            )}

            <div className="border-t border-stone-200 pt-6 flex flex-col items-end">
               <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between text-stone-600"><span>Subtotal Base</span><span>${p.subtotal}</span></div>
                  <div className="flex justify-between text-stone-600"><span>Logística</span><span>${p.costoEnvio}</span></div>
                  {p.requiereFactura && <div className="flex justify-between text-blue-600"><span>IVA ({p.ivaPorcentaje}%)</span><span>${p.montoIva}</span></div>}
                  <div className="flex justify-between text-lg font-black text-[#4A2B29] pt-2 border-t border-stone-100"><span>Total General</span><span>${p.total}</span></div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Historial de Pedidos</h3>
          <p className="text-stone-500 text-sm mt-1">Órdenes archivadas (Pagadas al 100%) o Anuladas. Haz clic para ver detalles.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-[#FFF9F8] text-stone-500 text-xs uppercase">
              <th className="p-4 font-bold border-b border-stone-200">ID / Cierre</th>
              <th className="p-4 font-bold border-b border-stone-200">Cliente</th>
              <th className="p-4 font-bold border-b border-stone-200">Total Pagado</th>
              <th className="p-4 font-bold border-b border-stone-200">Estado Final</th>
              <th className="p-4 font-bold border-b border-stone-200 text-center">Auditoría</th>
            </tr>
          </thead>
          <tbody>
            {pedidosCompletados.length === 0 && (
               <tr><td colSpan="5" className="p-8 text-center text-stone-400">El historial está vacío.</td></tr>
            )}
            {pedidosCompletados.map((p) => (
              <tr key={p._docId} className={`border-b border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer ${p.estado === 'Anulado' ? 'opacity-60 bg-rose-50/30' : 'opacity-90'}`} onClick={() => setPedidoSeleccionado(p)}>
                <td className="p-4">
                  <div className={`font-bold ${p.estado === 'Anulado' ? 'text-rose-900 line-through' : 'text-[#4A2B29]'}`}>{p.id}</div>
                  <div className="text-[10px] text-stone-500">{p.fecha || 'N/A'}</div>
                </td>
                <td className="p-4 font-medium text-stone-700">{p.cliente}</td>
                <td className="p-4 font-bold text-emerald-700">
                  {p.estado === 'Anulado' ? <span className="text-rose-400">$0.00</span> : `$${parseFloat(p.total).toFixed(2)}`}
                </td>
                <td className="p-4">
                   <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wide border ${p.estado === 'Anulado' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-stone-200 text-stone-600 border-stone-300'}`}>
                     {p.estado === 'Anulado' ? (
                       <span className="flex items-center gap-1"><X size={10} /> Anulado</span>
                     ) : (
                       <span className="flex items-center gap-1"><CheckCircle size={10} /> Archivado</span>
                     )}
                   </span>
                </td>
                <td className="p-4 text-center">
                   <button className="text-stone-400 hover:text-blue-600 p-2 rounded-lg transition-colors"><Eye size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO CRM DE CLIENTES 
// ==========================================
function ClientesModule({ user }) {
  const { data: clientes, loading: cLoad, addDocData, updateDocData, deleteDocData } = useFirestoreCollection('clientes', user);
  const { data: pedidos } = useFirestoreCollection('pedidos', user);
  const { data: zonas } = useFirestoreCollection('zonas', user);

  const [view, setView] = useState('list');
  const [formData, setFormData] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [nuevaDir, setNuevaDir] = useState({ principal: '', secundaria: '', zona: '', mapaLink: '' });
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (msg, type) => {
     setFeedback({ msg, type });
     setTimeout(() => setFeedback(null), 4000);
  };

  const getCategoria = (cliente) => {
    const reales = pedidos.filter(p => p.cliente === cliente.nombre).length;
    const total = Math.max(cliente.pedidos || 0, reales);
    
    if (total === 0) return { label: 'Prospecto', classes: 'bg-stone-100 text-stone-700 border-stone-200' };
    if (total === 1) return { label: 'Nuevo', classes: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (total >= 2 && total <= 10) return { label: 'Recurrente', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    return { label: 'VIP', classes: 'bg-[#FFF9F8] text-[#DF888A] border-[#DF888A]' };
  };

  const abrirPerfil = (cliente = null) => {
    if (cliente) {
      setFormData({ ...cliente });
    } else {
      setFormData({ nombre: '', telefono: '', cedula: '', email: '', cumpleanos: '', direcciones: [] });
    }
    setNuevaDir({ principal: '', secundaria: '', zona: '', mapaLink: '' });
    setView('profile');
  };

  const guardarPerfil = async () => {
    if (!formData.nombre) {
       showFeedback("El nombre es obligatorio.", "error");
       return;
    }
    
    const ced = formData.cedula?.trim();
    if (ced && !/^\d{10}$|^\d{13}$/.test(ced)) {
       showFeedback("Error: La Cédula debe tener 10 números exactos o el RUC 13 números exactos.", "error");
       return;
    }
    const tel = formData.telefono?.trim();
    if (tel && !/^\d{10}$/.test(tel)) {
       showFeedback("Error: El teléfono celular debe tener exactamente 10 números.", "error");
       return;
    }

    if (formData._docId) {
      await updateDocData(formData._docId, formData);
      showFeedback("Perfil actualizado correctamente.", "success");
    } else {
      const customId = `CLI-${Date.now()}`;
      await addDocData({ ...formData, id: customId, pedidos: 0 }, customId);
      showFeedback("Cliente guardado exitosamente.", "success");
    }
    setView('list');
  };

  const eliminarCliente = async (docId) => {
     await deleteDocData(docId);
  };

  const addDireccionToForm = () => {
    if (!nuevaDir.principal || !nuevaDir.zona) {
        showFeedback("Calle principal y Zona son obligatorias.", "error");
        return;
    }
    const nuevasDirecciones = [...(formData.direcciones || []), { id: Date.now().toString(), ...nuevaDir }];
    setFormData({ ...formData, direcciones: nuevasDirecciones });
    setNuevaDir({ principal: '', secundaria: '', zona: '', mapaLink: '' });
  };

  if (cLoad) return <div className="animate-pulse">Cargando CRM distribuido...</div>;

  if (view === 'profile' && formData) {
    const historial = formData.nombre ? pedidos.filter(p => p.cliente === formData.nombre) : [];
    const tag = getCategoria(formData);

    return (
      <div className="animate-in fade-in duration-300 pb-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="p-2 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg text-stone-500 shadow-sm transition-colors"><ChevronRight size={20} className="rotate-180" /></button>
            <h3 className="text-2xl font-bold text-[#4A2B29] flex items-center gap-3">
              {formData._docId ? 'Hoja de Vida de Cliente' : 'Nuevo Cliente Documento'}
              {formData._docId && <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider ${tag.classes}`}>{tag.label}</span>}
            </h3>
          </div>
          <button onClick={guardarPerfil} className="bg-[#4A2B29] hover:bg-[#3D221F] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition"><Save size={18} /> Guardar Documento</button>
        </div>

        {feedback && (
          <div className={`mb-6 w-full p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 ${feedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
             {feedback.type === 'error' ? <Zap size={18} className="shrink-0 text-rose-500"/> : <CheckCircle size={18} className="shrink-0 text-emerald-500"/>}
             {feedback.msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#4A2B29]"></div>
              <h4 className="font-bold text-[#4A2B29] mb-5 flex items-center gap-2"><Users size={18} className="text-stone-400"/> Datos Personales</h4>
              <div className="space-y-4">
                <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Nombre Completo *</label><input type="text" value={formData.nombre} onChange={e=>setFormData({...formData, nombre: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29] font-medium" /></div>
                <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Cédula / RUC (10 o 13 dígitos)</label><input type="text" value={formData.cedula || ''} onChange={e=>setFormData({...formData, cedula: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29]" /></div>
                <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Teléfono</label><input type="text" value={formData.telefono || ''} onChange={e=>setFormData({...formData, telefono: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29]" /></div>
                <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Email</label><input type="email" value={formData.email || ''} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29]" /></div>
                <div className="pt-2 border-t border-stone-100">
                  <label className="text-[10px] font-bold text-[#DF888A] uppercase tracking-widest block mb-1 flex items-center gap-1"><CalendarDays size={12}/> Fecha de Cumpleaños</label>
                  <input type="date" value={formData.cumpleanos || ''} onChange={e=>setFormData({...formData, cumpleanos: e.target.value})} className="w-full px-3 py-2 bg-[#FFF9F8] border border-[#F2E8E6] text-[#4A2B29] rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A] font-medium" />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#DF888A]"></div>
              <h4 className="font-bold text-[#4A2B29] mb-2 flex items-center gap-2"><MapPin size={18} className="text-stone-400"/> Direcciones del Cliente</h4>
              <p className="text-xs text-stone-500 mb-4">Administra las ubicaciones asociadas a este perfil.</p>
              
              <div className="bg-[#FFF9F8] border border-[#F2E8E6] p-4 rounded-xl mb-4">
                 <h5 className="text-[10px] font-bold text-[#DF888A] uppercase tracking-widest mb-3 flex items-center gap-1"><Plus size={12}/> Añadir Dirección al Perfil</h5>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="md:col-span-2"><input type="text" placeholder="Calle Principal" value={nuevaDir.principal} onChange={e=>setNuevaDir({...nuevaDir, principal: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white" /></div>
                    <div><input type="text" placeholder="Calle Secundaria" value={nuevaDir.secundaria} onChange={e=>setNuevaDir({...nuevaDir, secundaria: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white" /></div>
                    <div>
                      <select value={nuevaDir.zona} onChange={e=>setNuevaDir({...nuevaDir, zona: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white font-medium text-stone-600">
                        <option value="">Zona de Cobertura...</option>
                        {zonas.map(z => <option key={z._docId || z.id} value={z.nombre}>{z.nombre}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                       <div className="relative">
                          <span className="absolute left-3 top-2.5 text-[#DF888A]"><Map size={14}/></span>
                          <input type="url" placeholder="Link de Google Maps (Opcional)" value={nuevaDir.mapaLink} onChange={e=>setNuevaDir({...nuevaDir, mapaLink: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white" />
                       </div>
                    </div>
                 </div>
                 <button onClick={addDireccionToForm} className="bg-[#4A2B29] hover:bg-[#3D221F] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Guardar Dirección</button>
              </div>

              {(!formData.direcciones || formData.direcciones.length === 0) ? (
                <div className="text-sm text-stone-400 italic bg-stone-50 p-6 rounded-xl text-center border border-dashed border-stone-200">El arreglo de direcciones está vacío.</div>
              ) : (
                <div className="space-y-3">
                  {formData.direcciones.map((dir, index) => (
                    <div key={dir.id || index} className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex justify-between items-start">
                       <div className="flex-1">
                          <p className="text-sm font-bold text-stone-800">{dir.principal} y {dir.secundaria}</p>
                          <p className="text-xs text-stone-500 mb-2">Zona: {dir.zona || 'No asignada'}</p>
                          {dir.mapaLink && (
                             <a href={dir.mapaLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                                <Map size={10} /> Abrir en Google Maps
                             </a>
                          )}
                       </div>
                       <button onClick={() => setFormData({...formData, direcciones: formData.direcciones.filter(d => d.id !== dir.id)})} className="text-rose-400 p-2 hover:bg-rose-50 rounded"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
              <h4 className="font-bold text-[#4A2B29] mb-5 flex items-center gap-2"><History size={18} className="text-stone-400"/> Historial de Relaciones</h4>
              
              {historial.length === 0 ? (
                <div className="text-sm text-stone-400 italic bg-stone-50 p-6 rounded-xl text-center border border-dashed border-stone-200">No hay relaciones en Pedidos para este nombre.</div>
              ) : (
                <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FFF9F8] text-stone-500 text-xs uppercase">
                      <tr><th className="p-3 font-semibold">N° Orden</th><th className="p-3 font-semibold">Total</th><th className="p-3 font-semibold">Estado</th></tr>
                    </thead>
                    <tbody>
                      {historial.map(h => (
                        <tr key={h._docId || h.id} className="border-t border-stone-100">
                          <td className="p-3 font-bold text-[#4A2B29]">{h.id}</td>
                          <td className="p-3 font-bold text-[#4A2B29]">${h.total}</td>
                          <td className="p-3"><span className="px-2 py-1 text-[10px] rounded-full bg-stone-200 text-stone-700 font-bold uppercase tracking-wider">{h.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-6">
        <div><h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Directorio CRM</h3></div>
        <button onClick={() => abrirPerfil(null)} className="bg-[#4A2B29] hover:bg-[#3D221F] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition"><Plus size={18}/> Nuevo Documento</button>
      </div>

      {feedback && (
        <div className={`mb-6 w-full p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 ${feedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
           {feedback.type === 'error' ? <Zap size={18} className="shrink-0 text-rose-500"/> : <CheckCircle size={18} className="shrink-0 text-emerald-500"/>}
           {feedback.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#FFF9F8] text-stone-500 text-[10px] uppercase tracking-widest">
            <tr><th className="p-4 font-bold border-b border-stone-200">ID / Nombre</th><th className="p-4 font-bold border-b border-stone-200">Contacto</th><th className="p-4 font-bold border-b border-stone-200">Cumpleaños</th><th className="p-4 font-bold border-b border-stone-200">Segmento</th><th className="p-4 font-bold border-b border-stone-200 text-center">Acciones</th></tr>
          </thead>
          <tbody>
            {clientes.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-stone-400">Colección vacía.</td></tr>}
            {clientes.map(c => {
              const tag = getCategoria(c);
              return (
                <tr key={c._docId || c.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors group">
                  <td className="p-4 cursor-pointer" onClick={() => abrirPerfil(c)}>
                     <div className="font-bold text-[#4A2B29]">{c.nombre}</div>
                     <div className="text-[10px] text-stone-400 font-mono mt-0.5">{c.id}</div>
                  </td>
                  <td className="p-4 text-stone-600 font-medium">{c.telefono || '---'}</td>
                  <td className="p-4">
                     {c.cumpleanos ? (
                        <span className="flex items-center gap-1.5 text-xs text-[#DF888A] bg-[#FFF9F8] px-2 py-1 rounded font-bold border border-[#F2E8E6]"><CalendarDays size={12}/> {c.cumpleanos}</span>
                     ) : <span className="text-xs text-stone-300">---</span>}
                  </td>
                  <td className="p-4"><span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border ${tag.classes}`}>{tag.label}</span></td>
                  <td className="p-4 text-center flex justify-center">
                     {confirmDeleteId === c._docId ? (
                        <button onClick={() => { window.setTimeout(()=>eliminarCliente(c._docId),0); setConfirmDeleteId(null); showFeedback("Cliente eliminado.", "success"); }} className="text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors animate-in zoom-in">Confirmar</button>
                     ) : (
                        <button onClick={() => setConfirmDeleteId(c._docId)} className="text-stone-300 hover:text-rose-600 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                     )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO LOGÍSTICA ZONAS
// ==========================================
function ZonasModule({ user }) {
  const { data: zonas, addDocData, deleteDocData, updateDocData } = useFirestoreCollection('zonas', user);
  const [nuevaZona, setNuevaZona] = useState({ nombre: '', costo: '' });
  const [editandoId, setEditandoId] = useState(null);
  const [zonaEdit, setZonaEdit] = useState({ nombre: '', costo: '' });

  const agregar = async () => {
    if(nuevaZona.nombre && nuevaZona.costo) {
      await addDocData({ nombre: nuevaZona.nombre, costo: parseFloat(nuevaZona.costo) });
      setNuevaZona({ nombre: '', costo: '' });
    }
  };

  const iniciarEdicion = (zona) => {
     setEditandoId(zona._docId);
     setZonaEdit({ nombre: zona.nombre, costo: zona.costo });
  };

  const guardarEdicion = async (docId) => {
     await updateDocData(docId, { nombre: zonaEdit.nombre, costo: parseFloat(zonaEdit.costo) });
     setEditandoId(null);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Geolocalización (Config. Global)</h3>
        <p className="text-stone-500 text-sm mt-1">Estas zonas se cargan dinámicamente en el formulario de pedidos.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Nombre de la Zona/Sector</label>
          <input type="text" value={nuevaZona.nombre} onChange={e=>setNuevaZona({...nuevaZona, nombre: e.target.value})} placeholder="Ej: Vía Salitre..." className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A]" />
        </div>
        <div className="w-32">
          <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Costo ($)</label>
          <input type="number" value={nuevaZona.costo} onChange={e=>setNuevaZona({...nuevaZona, costo: e.target.value})} placeholder="0.00" className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A]" />
        </div>
        <button onClick={agregar} className="bg-[#4A2B29] hover:bg-[#3D221F] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition h-[42px]">
          <Plus size={16}/> Insertar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {zonas.map(zona => (
          <div key={zona._docId || zona.id} className={`p-5 rounded-xl border shadow-sm relative group transition-colors ${editandoId === zona._docId ? 'bg-[#FFF9F8] border-[#DF888A]' : 'bg-white border-stone-200'}`}>
            <div className="absolute top-4 right-4 flex gap-2">
               {editandoId === zona._docId ? (
                  <button onClick={() => guardarEdicion(zona._docId)} className="text-emerald-600 hover:text-emerald-700 bg-emerald-100 p-1.5 rounded"><Save size={14}/></button>
               ) : (
                  <div className="flex gap-2">
                     <button onClick={() => iniciarEdicion(zona)} className="text-stone-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={14}/></button>
                     <button onClick={() => deleteDocData(zona._docId)} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                  </div>
               )}
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-[#FFF9F8] text-[#DF888A] border border-[#F2E8E6] rounded-lg"><MapPin size={20}/></div>
              {editandoId === zona._docId ? (
                 <input type="text" value={zonaEdit.nombre} onChange={e => setZonaEdit({...zonaEdit, nombre: e.target.value})} className="font-bold text-stone-800 border border-blue-200 px-2 py-1 rounded outline-none w-full" />
              ) : (
                 <h4 className="font-bold text-stone-800 leading-tight pr-12">{zona.nombre}</h4>
              )}
            </div>
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tarifa:</span>
              {editandoId === zona._docId ? (
                 <input type="number" value={zonaEdit.costo} onChange={e => setZonaEdit({...zonaEdit, costo: e.target.value})} className="font-black text-stone-900 text-lg border border-blue-200 px-2 py-1 rounded outline-none w-24 text-right" />
              ) : (
                 <div className="font-black text-[#4A2B29] text-lg">${parseFloat(zona.costo).toFixed(2)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO 5: GESTOR DE PRODUCTOS (CON DICCIONARIO DE ATRIBUTOS)
// ==========================================
function ProductosModule({ user }) {
  const { data: productos, addDocData, updateDocData, deleteDocData } = useFirestoreCollection('productos', user);
  const { data: atributosPrecio, addDocData: addAtr, updateDocData: updateAtr, deleteDocData: deleteAtr } = useFirestoreCollection('atributos_precio', user);
  
  const [subTab, setSubTab] = useState('jerarquias'); 

  const [nuevoProducto, setNuevoProducto] = useState({ categoria: 'Tortas', nombre: '', atributosStr: '' });
  const [editandoId, setEditandoId] = useState(null);
  const [prodEdit, setProdEdit] = useState({ nombre: '', atributosStr: '' });

  const [nuevoAtr, setNuevoAtr] = useState({ nombre: '', precio: '' });
  const [editAtrId, setEditAtrId] = useState(null);
  const [editAtrVal, setEditAtrVal] = useState({ nombre: '', precio: '' });

  const agregar = async () => { 
    if(nuevoProducto.nombre && nuevoProducto.categoria) {
      const atributosArray = nuevoProducto.atributosStr ? nuevoProducto.atributosStr.split(',').map(a => a.trim()).filter(a => a !== '') : [];
      await addDocData({ categoria: nuevoProducto.categoria, nombre: nuevoProducto.nombre, atributos: atributosArray });
      setNuevoProducto({ ...nuevoProducto, nombre: '', atributosStr: '' }); 
    }
  };

  const iniciarEdicion = (prod) => {
     setEditandoId(prod._docId);
     setProdEdit({ nombre: prod.nombre, atributosStr: (prod.atributos || []).join(', ') });
  };

  const guardarEdicion = async (docId) => {
     const atributosArray = prodEdit.atributosStr ? prodEdit.atributosStr.split(',').map(a => a.trim()).filter(a => a !== '') : [];
     await updateDocData(docId, { nombre: prodEdit.nombre, atributos: atributosArray });
     setEditandoId(null);
  };

  const agregarDiccionario = async () => {
     if(nuevoAtr.nombre && nuevoAtr.precio) {
        await addAtr({ nombre: nuevoAtr.nombre, precio: parseFloat(nuevoAtr.precio) });
        setNuevoAtr({ nombre: '', precio: '' });
     }
  };

  const categoriasUnicas = [...new Set(productos.map(p => p.categoria))];
  ['Tortas', 'Pasteles', 'Cupcakes', 'Negritos', 'Cheesecake', 'Cakepops', 'Alfajores', 'Rosca de Reyes'].forEach(cat => {
     if (!categoriasUnicas.includes(cat)) categoriasUnicas.push(cat);
  });

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex justify-between items-end mb-6">
         <div>
            <h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Arquitectura de Producto</h3>
            <p className="text-stone-500 text-sm mt-1">Configura las jerarquías y el costeo global de los atributos.</p>
         </div>
      </div>

      <div className="flex gap-2 p-1 bg-stone-200 rounded-xl mb-8 w-fit">
         <button onClick={() => setSubTab('jerarquias')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'jerarquias' ? 'bg-white shadow-sm text-[#4A2B29]' : 'text-stone-500 hover:text-stone-700'}`}>1. Jerarquías y Categorías</button>
         <button onClick={() => setSubTab('precios')} className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${subTab === 'precios' ? 'bg-[#DF888A] shadow-sm text-white' : 'text-stone-500 hover:text-stone-700'}`}><Tags size={16}/> 2. Diccionario de Precios de Atributos</button>
      </div>

      {subTab === 'jerarquias' && (
         <div className="animate-in fade-in slide-in-from-left-4">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-end">
              <div className="w-48">
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Categoría Principal</label>
                 <select value={nuevoProducto.categoria} onChange={e=>setNuevoProducto({...nuevoProducto, categoria: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A] text-sm font-medium bg-stone-50">
                    {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Subcategoría / Nombre</label>
                 <input type="text" value={nuevoProducto.nombre} onChange={e=>setNuevoProducto({...nuevoProducto, nombre: e.target.value})} placeholder="Ej: Mojada de Chocolate..." className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A] text-sm font-medium" />
              </div>
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Atributos Requeridos (Separados por coma)</label>
                 <input type="text" value={nuevoProducto.atributosStr} onChange={e=>setNuevoProducto({...nuevoProducto, atributosStr: e.target.value})} placeholder="Sabor, Relleno, Tamaño..." className="w-full px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A] text-sm font-medium" />
              </div>
              <button onClick={agregar} className="bg-[#4A2B29] hover:bg-[#3D221F] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition h-[38px] w-32">
                 <Plus size={16}/> Insertar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoriasUnicas.map(catName => {
                 const prodsInCat = productos.filter(p => p.categoria === catName);
                 if (prodsInCat.length === 0) return null;
                 
                 return (
                   <div key={catName} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                     <div className="flex items-center gap-2 mb-4 border-b border-stone-100 pb-2">
                       <div className="p-1.5 bg-[#FFF9F8] text-[#DF888A] rounded-md"><Cake size={16}/></div>
                       <h4 className="font-bold text-[#4A2B29] text-lg">{catName}</h4>
                     </div>
                     <div className="space-y-3">
                       {prodsInCat.map(prod => (
                          <div key={prod._docId || prod.id} className={`p-3 rounded-lg border relative group pr-10 ${editandoId === prod._docId ? 'bg-[#FFF9F8] border-[#DF888A]' : 'bg-stone-50 border-stone-200'}`}>
                             <div className="absolute top-3 right-3 flex flex-col gap-2">
                                {editandoId === prod._docId ? (
                                   <button onClick={() => guardarEdicion(prod._docId)} className="text-emerald-600 bg-emerald-100 p-1 rounded"><Save size={14}/></button>
                                ) : (
                                   <div className="flex flex-col gap-2">
                                      <button onClick={() => iniciarEdicion(prod)} className="text-stone-300 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={14}/></button>
                                      <button onClick={() => deleteDocData(prod._docId)} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                   </div>
                                )}
                             </div>
                             
                             {editandoId === prod._docId ? (
                                <div className="space-y-2">
                                   <input type="text" value={prodEdit.nombre} onChange={e=>setProdEdit({...prodEdit, nombre: e.target.value})} className="w-full text-sm font-bold text-stone-700 px-2 py-1 border border-purple-200 rounded outline-none" />
                                   <input type="text" value={prodEdit.atributosStr} onChange={e=>setProdEdit({...prodEdit, atributosStr: e.target.value})} className="w-full text-xs text-stone-600 px-2 py-1 border border-purple-200 rounded outline-none" placeholder="Atributos (comas)" />
                                </div>
                             ) : (
                                <div>
                                   <p className="font-bold text-stone-700 text-sm">{prod.nombre}</p>
                                   <div className="flex flex-wrap gap-1 mt-2">
                                      {prod.atributos && prod.atributos.length > 0 ? prod.atributos.map(attr => (
                                         <span key={attr} className="text-[9px] uppercase tracking-wider font-bold bg-white border border-stone-200 text-stone-500 px-1.5 py-0.5 rounded">{attr}</span>
                                      )) : <span className="text-[9px] italic text-stone-400">Sin atributos</span>}
                                   </div>
                                </div>
                             )}
                          </div>
                       ))}
                     </div>
                   </div>
                 );
              })}
            </div>
         </div>
      )}

      {subTab === 'precios' && (
         <div className="animate-in fade-in slide-in-from-right-4 max-w-4xl">
            <div className="bg-[#FFF9F8] p-6 rounded-2xl border border-[#F2E8E6] shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
               <div className="flex-1">
                 <label className="text-[10px] font-bold text-[#DF888A] uppercase tracking-widest block mb-1">Nombre Exacto del Valor de Atributo</label>
                 <input type="text" value={nuevoAtr.nombre} onChange={e=>setNuevoAtr({...nuevoAtr, nombre: e.target.value})} placeholder="Ej: Topper Dorado Acrílico" className="w-full px-4 py-2 border border-[#F2E8E6] rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A] text-sm font-medium" />
               </div>
               <div className="w-32">
                 <label className="text-[10px] font-bold text-[#DF888A] uppercase tracking-widest block mb-1">Costo Extra ($)</label>
                 <input type="number" value={nuevoAtr.precio} onChange={e=>setNuevoAtr({...nuevoAtr, precio: e.target.value})} placeholder="5.00" className="w-full px-4 py-2 border border-[#F2E8E6] rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A] text-sm font-black text-[#4A2B29]" />
               </div>
               <button onClick={agregarDiccionario} className="bg-[#DF888A] hover:bg-[#D48587] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition h-[38px] w-32">
                 <Save size={16}/> Fijar Precio
               </button>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-[#FFF9F8] text-stone-500 text-[10px] uppercase tracking-widest">
                   <tr><th className="p-4 font-bold border-b border-stone-200">Valor de Atributo Global</th><th className="p-4 font-bold border-b border-stone-200 w-32 text-right">Precio Añadido</th><th className="p-4 font-bold border-b border-stone-200 text-center w-24">Acción</th></tr>
                 </thead>
                 <tbody>
                   {atributosPrecio.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-stone-400">El diccionario está vacío. Añade precios extras aquí para sugerencias en órdenes.</td></tr>}
                   {atributosPrecio.map(atr => (
                     <tr key={atr._docId} className={`border-b border-stone-100 transition-colors group ${editAtrId === atr._docId ? 'bg-[#FFF9F8]' : 'hover:bg-stone-50'}`}>
                       <td className="p-4">
                          {editAtrId === atr._docId ? (
                             <input type="text" value={editAtrVal.nombre} onChange={e=>setEditAtrVal({...editAtrVal, nombre: e.target.value})} className="w-full border px-2 py-1.5 text-sm font-bold text-stone-800 rounded outline-none" />
                          ) : <span className="font-bold text-[#4A2B29]">{atr.nombre}</span>}
                       </td>
                       <td className="p-4 text-right">
                          {editAtrId === atr._docId ? (
                             <input type="number" value={editAtrVal.precio} onChange={e=>setEditAtrVal({...editAtrVal, precio: e.target.value})} className="w-20 border px-2 py-1.5 text-sm font-black text-[#4A2B29] text-right rounded outline-none" />
                          ) : <span className="font-black text-[#DF888A]">${parseFloat(atr.precio).toFixed(2)}</span>}
                       </td>
                       <td className="p-4 text-center">
                          {editAtrId === atr._docId ? (
                             <button onClick={async () => { await updateAtr(atr._docId, { nombre: editAtrVal.nombre, precio: parseFloat(editAtrVal.precio) }); setEditAtrId(null); }} className="text-emerald-600 bg-emerald-100 p-2 rounded-lg hover:bg-emerald-200 transition"><Save size={16}/></button>
                          ) : (
                             <div className="flex justify-center gap-2">
                                <button onClick={() => { setEditAtrId(atr._docId); setEditAtrVal({ nombre: atr.nombre, precio: atr.precio }); }} className="text-stone-300 hover:text-[#DF888A] opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={16}/></button>
                                <button onClick={() => deleteAtr(atr._docId)} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                             </div>
                          )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
         </div>
      )}
    </div>
  );
}

// ==========================================
// MÓDULO 6: INVENTARIO (CON IA VISION)
// ==========================================
function InventarioModule({ user }) {
  const { data: inventario, addDocData, updateDocData, deleteDocData } = useFirestoreCollection('inventario', user);
  
  const [nuevoItem, setNuevoItem] = useState({
     item: '', tipo: 'Materia Prima', stock: '', unidad: 'kg', costoTotal: '', tienda: ''
  });
  const [editandoId, setEditandoId] = useState(null);
  const [invEdit, setInvEdit] = useState({});

  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  
  const [feedback, setFeedback] = useState(null);
  const showFeedback = (msg, type) => {
     setFeedback({ msg, type });
     setTimeout(() => setFeedback(null), 5000);
  };

  const agregar = async () => { 
    if(nuevoItem.item && nuevoItem.stock && nuevoItem.costoTotal) {
      await addDocData({ 
         item: nuevoItem.item, 
         tipo: nuevoItem.tipo,
         stock: parseFloat(nuevoItem.stock), 
         unidad: nuevoItem.unidad,
         costoTotal: parseFloat(nuevoItem.costoTotal),
         tienda: nuevoItem.tienda,
         estado: parseFloat(nuevoItem.stock) > 0 ? 'Óptimo' : 'Comprar' 
      });
      setNuevoItem({ item: '', tipo: 'Materia Prima', stock: '', unidad: 'kg', costoTotal: '', tienda: '' }); 
      showFeedback("Insumo agregado al almacén.", "success");
    } else {
      showFeedback("Completar Nombre, Stock y Costo Total del Lote.", "error");
    }
  };

  const guardarScannedItems = async () => {
     for (const item of scannedItems) {
        const existing = inventario.find(i => i.item.trim().toLowerCase() === item.item.trim().toLowerCase());
        if (existing) {
           const newStock = existing.stock + item.cantidad;
           await updateDocData(existing._docId, {
              stock: newStock,
              costoTotal: (existing.costoTotal || 0) + item.costoTotalLote,
              estado: newStock > 10 ? 'Óptimo' : 'Comprar'
           });
        } else {
           await addDocData({
              item: item.item,
              tipo: 'Materia Prima', 
              stock: item.cantidad,
              unidad: item.unidad || 'u',
              costoTotal: item.costoTotalLote,
              tienda: 'Ingreso IA',
              estado: 'Óptimo'
           });
        }
     }
     setScannedItems([]);
     showFeedback("Inspección inteligente guardada y base de datos actualizada.", "success");
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsScanning(true);
    showFeedback("Iniciando análisis de factura con IA...", "success");
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (event) => {
       const base64Full = event.target.result;
       const base64Data = base64Full.split(',')[1];
       const mimeType = file.type;
       
       try {
          const result = await extractInvoiceData(base64Data, mimeType);
          if (result && result.items) {
             setScannedItems(result.items);
             showFeedback("Factura analizada con éxito. Revisa los resultados.", "success");
          } else {
             showFeedback("La IA no pudo estructurar los datos.", "error");
          }
       } catch (error) {
          console.error(error);
          showFeedback("Error en el Motor OCR: " + (error.message || "Fallo de conexión."), "error");
       } finally {
          setIsScanning(false);
          e.target.value = null;
       }
    };
  };

  const iniciarEdicion = (inv) => {
     setEditandoId(inv._docId);
     setInvEdit({ item: inv.item, stock: inv.stock, unidad: inv.unidad || 'kg', costoTotal: inv.costoTotal || 0, tienda: inv.tienda || '' });
  };

  const guardarEdicion = async (docId) => {
     const nStock = parseFloat(invEdit.stock);
     await updateDocData(docId, { 
        item: invEdit.item, stock: nStock, unidad: invEdit.unidad, 
        costoTotal: parseFloat(invEdit.costoTotal), tienda: invEdit.tienda,
        estado: nStock > 0 ? 'Óptimo' : 'Comprar'
     });
     setEditandoId(null);
  };

  const matPrimas = inventario.filter(i => i.tipo === 'Materia Prima');
  const otrosInsumos = inventario.filter(i => i.tipo !== 'Materia Prima');

  return (
    <div className="animate-in fade-in duration-300 pb-10">
      <div className="flex justify-between items-end mb-6">
         <div>
            <h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Almacén Central y Proveedores</h3>
            <p className="text-stone-500 text-sm mt-1">Control manual o ingreso automatizado de facturas con Inteligencia Artificial.</p>
         </div>
         <label className={`cursor-pointer px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all ${isScanning ? 'bg-stone-200 text-stone-500' : 'bg-gradient-to-r from-[#DF888A] to-[#C97779] hover:from-[#D48587] hover:to-[#B56A6C] text-white'}`}>
            {isScanning ? (
              <span className="flex items-center gap-2"><Zap size={16} className="animate-pulse"/> Analizando...</span>
            ) : (
              <span className="flex items-center gap-2"><ScanSearch size={16} /> Escanear Factura (IA)</span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleInvoiceUpload} disabled={isScanning} />
         </label>
      </div>

      {feedback && (
        <div className={`mb-6 w-full p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 ${feedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#FFF9F8] text-[#4A2B29] border border-[#F2E8E6]'}`}>
           {feedback.type === 'error' ? <Zap size={18} className="shrink-0 text-rose-500"/> : <Info size={18} className="shrink-0 text-[#DF888A]"/>}
           {feedback.msg}
        </div>
      )}

      {scannedItems.length > 0 && (
         <div className="bg-[#FFF9F8] border border-[#F2E8E6] p-6 rounded-2xl shadow-sm mb-8 animate-in slide-in-from-top-4">
            <h4 className="font-black text-[#4A2B29] mb-2 flex items-center gap-2"><Bot size={20} className="text-[#DF888A]"/> Resultados de Extracción con IA</h4>
            <p className="text-xs text-stone-600 mb-4">El algoritmo ha extraído estos items y ha prorrateado el IVA en el costo del lote. Revisa e ingresa al inventario.</p>
            <div className="bg-white rounded-xl border border-stone-100 overflow-hidden mb-4">
               <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-stone-600 text-[10px] uppercase tracking-widest">
                     <tr><th className="p-3">Ítem Identificado</th><th className="p-3 text-center">Cant</th><th className="p-3 text-center">Unidad</th><th className="p-3 text-right">Costo Lote (Inc. IVA)</th></tr>
                  </thead>
                  <tbody>
                     {scannedItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-stone-50 last:border-0">
                           <td className="p-3 font-bold text-stone-800">{item.item}</td>
                           <td className="p-3 text-center font-medium text-stone-700">{item.cantidad}</td>
                           <td className="p-3 text-center"><span className="text-[10px] font-bold text-[#DF888A] bg-[#FFF9F8] px-2 py-0.5 rounded">{item.unidad}</span></td>
                           <td className="p-3 text-right font-black text-[#4A2B29]">${parseFloat(item.costoTotalLote).toFixed(2)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            <div className="flex justify-end gap-3">
               <button onClick={() => setScannedItems([])} className="px-4 py-2 text-sm font-bold text-stone-500 hover:bg-white rounded-lg transition">Descartar</button>
               <button onClick={guardarScannedItems} className="px-6 py-2 bg-[#4A2B29] hover:bg-[#3D221F] text-white text-sm font-bold rounded-lg shadow transition">Guardar en Almacén</button>
            </div>
         </div>
      )}
      
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
         <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Registro de Nuevo Lote Manual</h4>
         <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
           <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Tipo</label>
              <select value={nuevoItem.tipo} onChange={e=>setNuevoItem({...nuevoItem, tipo: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm bg-stone-50 focus:ring-2 focus:ring-[#DF888A]">
                 <option value="Materia Prima">Materia Prima (Harina, Azúcar...)</option>
                 <option value="Empaques">Empaques / Soportes / Otros</option>
              </select>
           </div>
           <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Nombre Insumo</label>
              <input type="text" value={nuevoItem.item} onChange={e=>setNuevoItem({...nuevoItem, item: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A]" />
           </div>
           <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Proveedor / Tienda</label>
              <input type="text" value={nuevoItem.tienda} onChange={e=>setNuevoItem({...nuevoItem, tienda: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A]" />
           </div>
           <div className="md:col-span-2 flex gap-2">
              <div className="flex-1">
                 <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Stock Comprado</label>
                 <input type="number" value={nuevoItem.stock} onChange={e=>setNuevoItem({...nuevoItem, stock: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A]" />
              </div>
              <div className="w-24">
                 <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Unidad</label>
                 <UnidadesSelect value={nuevoItem.unidad} onChange={e=>setNuevoItem({...nuevoItem, unidad: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm bg-stone-50 focus:ring-2 focus:ring-[#DF888A]" />
              </div>
           </div>
           <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Costo Total Lote ($)</label>
              <input type="number" value={nuevoItem.costoTotal} onChange={e=>setNuevoItem({...nuevoItem, costoTotal: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm font-bold text-[#4A2B29] focus:ring-2 focus:ring-[#DF888A]" />
           </div>
           <div className="md:col-span-2">
              <button onClick={agregar} className="w-full bg-[#4A2B29] hover:bg-[#3D221F] text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition h-[38px]"><Plus size={16}/> Guardar</button>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* BÓVEDA 1: MATERIA PRIMA */}
         <div>
            <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><Boxes size={18}/> Materia Prima</h4>
            <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-emerald-50 text-emerald-700 text-[10px] uppercase tracking-widest">
                  <tr><th className="p-3">Insumo / Proveedor</th><th className="p-3 text-center">Físico</th><th className="p-3 text-right">Lote</th><th className="p-3 text-center">Acciones</th></tr>
                </thead>
                <tbody>
                  {matPrimas.map(inv => (
                    <tr key={inv._docId} className={`border-b border-stone-100 transition-colors group ${editandoId === inv._docId ? 'bg-emerald-50/50' : 'hover:bg-stone-50'}`}>
                      <td className="p-3">
                         {editandoId === inv._docId ? (
                            <div className="flex flex-col gap-1">
                              <input type="text" value={invEdit.item} onChange={e=>setInvEdit({...invEdit, item: e.target.value})} className="w-full border border-emerald-200 px-2 py-1 text-xs rounded outline-none" />
                              <input type="text" value={invEdit.tienda} onChange={e=>setInvEdit({...invEdit, tienda: e.target.value})} className="w-full border border-emerald-200 px-2 py-1 text-[10px] rounded outline-none" placeholder="Proveedor" />
                            </div>
                         ) : (
                            <div>
                              <p className="font-bold text-stone-800">{inv.item}</p>
                              <p className="text-[10px] text-stone-500">{inv.tienda || 'Sin proveedor'}</p>
                            </div>
                         )}
                      </td>
                      <td className="p-3">
                         {editandoId === inv._docId ? (
                            <div className="flex gap-1 justify-center">
                               <input type="number" value={invEdit.stock} onChange={e=>setInvEdit({...invEdit, stock: e.target.value})} className="w-12 border border-emerald-200 px-1 py-1 text-xs text-center rounded outline-none" />
                               <UnidadesSelect value={invEdit.unidad} onChange={e=>setInvEdit({...invEdit, unidad: e.target.value})} className="border border-emerald-200 px-1 py-1 text-xs rounded outline-none" />
                            </div>
                         ) : (
                            <div className="font-bold text-stone-700 text-center">{inv.stock} <span className="text-xs text-stone-400 font-normal">{inv.unidad || 'u'}</span></div>
                         )}
                      </td>
                      <td className="p-3 text-right">
                         {editandoId === inv._docId ? (
                            <input type="number" value={invEdit.costoTotal} onChange={e=>setInvEdit({...invEdit, costoTotal: e.target.value})} className="w-16 border border-emerald-200 px-2 py-1 text-xs text-right font-bold rounded outline-none" />
                         ) : (
                            <div className="font-bold text-emerald-700">${parseFloat(inv.costoTotal || 0).toFixed(2)}</div>
                         )}
                      </td>
                      <td className="p-3 text-center">
                         {editandoId === inv._docId ? (
                            <button onClick={() => guardarEdicion(inv._docId)} className="text-emerald-600 bg-emerald-100 p-1.5 rounded"><Save size={14}/></button>
                         ) : (
                            <div className="flex flex-col gap-2 items-center">
                               <button onClick={() => iniciarEdicion(inv)} className="text-stone-300 hover:text-emerald-600 opacity-0 group-hover:opacity-100"><Edit3 size={14}/></button>
                               <button onClick={() => deleteDocData(inv._docId)} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </div>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>

         {/* BÓVEDA 2: EMPAQUES Y OTROS */}
         <div>
            <h4 className="font-bold text-[#4A2B29] mb-4 flex items-center gap-2"><Package size={18} className="text-[#DF888A]" /> Empaques / Adicionales</h4>
            <div className="bg-white rounded-xl border border-[#F2E8E6] overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FFF9F8] text-[#4A2B29] text-[10px] uppercase tracking-widest">
                  <tr><th className="p-3">Ítem / Proveedor</th><th className="p-3 text-center">Físico</th><th className="p-3 text-right">Lote</th><th className="p-3 text-center">Acciones</th></tr>
                </thead>
                <tbody>
                  {otrosInsumos.map(inv => (
                    <tr key={inv._docId} className={`border-b border-stone-100 transition-colors group ${editandoId === inv._docId ? 'bg-[#FFF9F8]' : 'hover:bg-stone-50'}`}>
                      <td className="p-3">
                         {editandoId === inv._docId ? (
                            <div className="flex flex-col gap-1">
                              <input type="text" value={invEdit.item} onChange={e=>setInvEdit({...invEdit, item: e.target.value})} className="w-full border border-stone-200 px-2 py-1 text-xs rounded outline-none" />
                              <input type="text" value={invEdit.tienda} onChange={e=>setInvEdit({...invEdit, tienda: e.target.value})} className="w-full border border-stone-200 px-2 py-1 text-[10px] rounded outline-none" placeholder="Proveedor" />
                            </div>
                         ) : (
                            <div>
                              <p className="font-bold text-stone-800">{inv.item}</p>
                              <p className="text-[10px] text-stone-500">{inv.tienda || 'Sin proveedor'}</p>
                            </div>
                         )}
                      </td>
                      <td className="p-3">
                         {editandoId === inv._docId ? (
                            <div className="flex gap-1 justify-center">
                               <input type="number" value={invEdit.stock} onChange={e=>setInvEdit({...invEdit, stock: e.target.value})} className="w-12 border border-stone-200 px-1 py-1 text-xs text-center rounded outline-none" />
                               <UnidadesSelect value={invEdit.unidad} onChange={e=>setInvEdit({...invEdit, unidad: e.target.value})} className="border border-stone-200 px-1 py-1 text-xs rounded outline-none" />
                            </div>
                         ) : (
                            <div className="font-bold text-stone-700 text-center">{inv.stock} <span className="text-xs text-stone-400 font-normal">{inv.unidad || 'u'}</span></div>
                         )}
                      </td>
                      <td className="p-3 text-right">
                         {editandoId === inv._docId ? (
                            <input type="number" value={invEdit.costoTotal} onChange={e=>setInvEdit({...invEdit, costoTotal: e.target.value})} className="w-16 border border-stone-200 px-2 py-1 text-xs text-right font-bold rounded outline-none" />
                         ) : (
                            <div className="font-bold text-[#DF888A]">${parseFloat(inv.costoTotal || 0).toFixed(2)}</div>
                         )}
                      </td>
                      <td className="p-3 text-center">
                         {editandoId === inv._docId ? (
                            <button onClick={() => guardarEdicion(inv._docId)} className="text-emerald-600 bg-emerald-100 p-1.5 rounded"><Save size={14}/></button>
                         ) : (
                            <div className="flex flex-col gap-2 items-center">
                               <button onClick={() => iniciarEdicion(inv)} className="text-stone-300 hover:text-[#4A2B29] opacity-0 group-hover:opacity-100"><Edit3 size={14}/></button>
                               <button onClick={() => deleteDocData(inv._docId)} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </div>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO 7: COSTOS Y FINANZAS
// ==========================================
function CostosModule({ user }) {
  const { data: costos, addDocData, updateDocData, deleteDocData } = useFirestoreCollection('costos', user);
  const { data: inventario } = useFirestoreCollection('inventario', user);

  const [nuevoIngrediente, setNuevoIngrediente] = useState({ docId: null, idInsumo: '', cantidad: '', unidadReceta: 'gr' });
  const [nuevaReceta, setNuevaReceta] = useState('');

  const agregarReceta = async () => {
    if (nuevaReceta) {
      await addDocData({ producto: nuevaReceta, ingredientes: [], costoTotal: 0 });
      setNuevaReceta('');
    }
  };

  const agregarIngrediente = async (receta) => {
    if (!nuevoIngrediente.idInsumo || !nuevoIngrediente.cantidad || nuevoIngrediente.docId !== receta._docId) return;
    
    const insumoAlmacen = inventario.find(i => i._docId === nuevoIngrediente.idInsumo);
    if (!insumoAlmacen) return;

    // MAGIA SAS: Calcula el costo proporcional basado en el lote del inventario y la conversión de unidades
    const costoProporcionalCalculado = calcularCostoConvertido(
       insumoAlmacen.costoTotal, insumoAlmacen.stock, insumoAlmacen.unidad || 'kg', 
       nuevoIngrediente.cantidad, nuevoIngrediente.unidadReceta
    );

    const ingredientesActualizados = [...(receta.ingredientes || []), { 
       id: Date.now().toString(), 
       idInsumo: insumoAlmacen._docId,
       nombre: insumoAlmacen.item, 
       cantidad: parseFloat(nuevoIngrediente.cantidad),
       unidad: nuevoIngrediente.unidadReceta,
       costo: costoProporcionalCalculado 
    }];
    
    const nuevoTotal = ingredientesActualizados.reduce((acc, ing) => acc + ing.costo, 0);

    await updateDocData(receta._docId, { ingredientes: ingredientesActualizados, costoTotal: nuevoTotal });
    setNuevoIngrediente({ docId: null, idInsumo: '', cantidad: '', unidadReceta: 'gr' });
  };

  const eliminarIngrediente = async (receta, idIngrediente) => {
    const ingredientesRestantes = receta.ingredientes.filter(i => i.id !== idIngrediente);
    const nuevoTotal = ingredientesRestantes.reduce((acc, ing) => acc + ing.costo, 0);
    await updateDocData(receta._docId, { ingredientes: ingredientesRestantes, costoTotal: nuevoTotal });
  };

  return (
    <div className="animate-in fade-in duration-300 pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
           <h3 className="text-2xl font-bold text-[#4A2B29] tracking-tight">Costeador Inteligente (SAS Engine)</h3>
           <p className="text-stone-500 text-sm mt-1">El costo unitario se extrae directamente del Módulo de Control de Almacén mediante conversión de unidades.</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm mb-8 flex gap-4">
        <input type="text" value={nuevaReceta} onChange={e=>setNuevaReceta(e.target.value)} placeholder="Nombre del nuevo producto/receta maestro..." className="flex-1 px-4 py-2 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29] text-sm font-medium shadow-sm" />
        <button onClick={agregarReceta} className="bg-[#4A2B29] hover:bg-[#3D221F] text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition">
          <Plus size={16}/> Crear Receta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {costos.length === 0 && <div className="col-span-3 text-stone-400 italic">No hay recetas registradas.</div>}
        {costos.map(receta => (
          <div key={receta._docId || receta.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm relative group flex flex-col h-full">
            <button onClick={() => deleteDocData(receta._docId)} className="absolute top-4 right-4 text-stone-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
            <h4 className="font-bold text-lg text-[#4A2B29] mb-4 border-b border-stone-100 pb-3 pr-6">{receta.producto}</h4>
            
            <div className="space-y-2 mb-5 flex-1 overflow-y-auto">
              {(!receta.ingredientes || receta.ingredientes.length === 0) && <p className="text-xs text-stone-400 italic">Receta vacía.</p>}
              {receta.ingredientes && receta.ingredientes.map((ing) => (
                <div key={ing.id} className="flex justify-between items-center text-sm bg-stone-50 p-2 rounded-lg border border-stone-100 group/ing">
                  <div>
                     <span className="text-stone-700 font-bold block leading-tight">{ing.nombre}</span>
                     <span className="text-[10px] text-stone-400 uppercase font-bold">{ing.cantidad} {ing.unidad}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">${(ing.costo || 0).toFixed(2)}</span>
                    <button onClick={() => eliminarIngrediente(receta, ing.id)} className="text-stone-300 hover:text-rose-500 opacity-0 group-hover/ing:opacity-100 transition-opacity"><X size={14}/></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-auto mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100 shadow-inner">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Inyectar Insumo del Almacén</label>
              <select value={nuevoIngrediente.docId === receta._docId ? nuevoIngrediente.idInsumo : ''} onChange={e => setNuevoIngrediente({ docId: receta._docId, idInsumo: e.target.value, cantidad: nuevoIngrediente.cantidad, unidadReceta: nuevoIngrediente.unidadReceta })} className="w-full border border-stone-200 bg-white rounded px-2 py-1.5 outline-none text-xs font-bold text-stone-700">
                 <option value="">Buscar en Inventario...</option>
                 {inventario.map(inv => (
                    <option key={inv._docId} value={inv._docId}>{inv.item} (Bodega en {inv.unidad || 'u'})</option>
                 ))}
              </select>
              <div className="flex gap-2 items-center">
                 <input type="number" value={nuevoIngrediente.docId === receta._docId ? nuevoIngrediente.cantidad : ''} onChange={e => setNuevoIngrediente({ docId: receta._docId, cantidad: e.target.value, idInsumo: nuevoIngrediente.idInsumo, unidadReceta: nuevoIngrediente.unidadReceta })} placeholder="Cant" className="w-16 border border-stone-200 bg-white rounded px-2 py-1.5 outline-none text-xs text-center font-bold" />
                 <select value={nuevoIngrediente.docId === receta._docId ? nuevoIngrediente.unidadReceta : 'gr'} onChange={e => setNuevoIngrediente({ docId: receta._docId, unidadReceta: e.target.value, idInsumo: nuevoIngrediente.idInsumo, cantidad: nuevoIngrediente.cantidad })} className="flex-1 border border-stone-200 bg-white rounded px-2 py-1.5 outline-none text-xs">
                    <option value="kg">Kilos (kg)</option><option value="gr">Gramos (gr)</option>
                    <option value="l">Litros (l)</option><option value="ml">Mililitros (ml)</option>
                    <option value="u">Unidades (u)</option>
                 </select>
                 <button onClick={() => agregarIngrediente(receta)} className="text-white font-bold p-1.5 bg-[#4A2B29] rounded-md hover:bg-[#3D221F] shadow-sm"><Plus size={14}/></button>
              </div>
            </div>

            <div className="bg-[#FFF9F8] p-4 rounded-xl flex justify-between items-center border border-[#F2E8E6]">
               <span className="font-bold text-blue-800 text-xs uppercase tracking-wider">Costo Final Producción:</span>
               <span className="text-2xl font-black text-[#DF888A]">${(receta.costoTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO 8: SEGURIDAD Y ACCESOS (IAM Avanzado)
// ==========================================
function AccesosModule({ user }) {
  const { data: usuariosRoles, addDocData, deleteDocData } = useFirestoreCollection('usuarios_permisos', user);

  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', rol: 'Empleado', modulos: ['pedidos', 'dashboard'] });
  
  const MODULOS_DISPONIBLES = [
     { id: 'dashboard', nombre: 'Centro de Comando' },
     { id: 'pedidos', nombre: 'Operaciones / Pedidos' },
     { id: 'mapa', nombre: 'Logística y Mapa' },
     { id: 'historial', nombre: 'Historial' },
     { id: 'clientes', nombre: 'Directorio CRM' },
     { id: 'zonas', nombre: 'Logística Zonas' },
     { id: 'productos', nombre: 'Gestor Productos' },
     { id: 'inventario', nombre: 'Control Almacén' },
     { id: 'costos', nombre: 'Finanzas' }
  ];

  const handleToggleModulo = (modId) => {
     if (nuevoUsuario.modulos.includes(modId)) {
        setNuevoUsuario({ ...nuevoUsuario, modulos: nuevoUsuario.modulos.filter(m => m !== modId) });
     } else {
        setNuevoUsuario({ ...nuevoUsuario, modulos: [...nuevoUsuario.modulos, modId] });
     }
  };

  const agregarUsuario = async () => {
     if (!nuevoUsuario.nombre || !nuevoUsuario.email) return;
     await addDocData({
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        modulos: nuevoUsuario.rol === 'SuperAdmin' ? MODULOS_DISPONIBLES.map(m=>m.id) : nuevoUsuario.modulos
     });
     setNuevoUsuario({ nombre: '', email: '', rol: 'Empleado', modulos: ['pedidos', 'dashboard'] });
  };

  return (
    <div className="animate-in fade-in duration-300 pb-20">
      <h3 className="text-2xl font-bold text-[#4A2B29] mb-6 tracking-tight">Seguridad y Centro de Accesos (IAM)</h3>
      
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-8 max-w-4xl">
        <h4 className="font-bold text-[#4A2B29] mb-4 pb-4 border-b border-stone-100 flex items-center gap-2">
           <Settings className="text-stone-400" size={20} /> Autenticación Maestra Activa
        </h4>
        
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 mb-6">
           <div className="flex justify-between items-start mb-4">
              <div>
                 <p className="font-bold text-[#4A2B29] text-lg">Propietario / Super Admin</p>
                 <p className="text-sm text-stone-500 font-mono mt-1 break-all">{user?.uid ? String(user.uid) : 'No identificado'}</p>
              </div>
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                 <ShieldCheck size={12}/> Acceso Total
              </span>
           </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-[#4A2B29] mb-4 tracking-tight flex items-center gap-2"><UserPlus size={20}/> Gestión del Personal</h3>
      
      <div className="flex flex-col xl:flex-row gap-6">
         <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 w-full xl:w-1/3 h-fit">
            <h4 className="font-bold text-[#4A2B29] mb-4 text-sm uppercase tracking-widest border-b border-stone-100 pb-2">Crear Nuevo Acceso</h4>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Nombre del Colaborador</label>
                  <input type="text" value={nuevoUsuario.nombre} onChange={e=>setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A]" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Email de Acceso</label>
                  <input type="email" value={nuevoUsuario.email} onChange={e=>setNuevoUsuario({...nuevoUsuario, email: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A]" />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Nivel de Privilegio</label>
                  <select value={nuevoUsuario.rol} onChange={e=>setNuevoUsuario({...nuevoUsuario, rol: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm font-bold focus:ring-2 focus:ring-[#DF888A]">
                     <option value="Empleado">Empleado (Acceso Restringido)</option>
                     <option value="SuperAdmin">Co-Administrador (Acceso Total)</option>
                  </select>
               </div>
               
               {nuevoUsuario.rol === 'Empleado' && (
                  <div className="bg-[#FFF9F8] p-4 rounded-xl border border-[#F2E8E6]">
                     <label className="text-[10px] font-bold text-[#DF888A] uppercase block mb-3">Módulos Permitidos</label>
                     <div className="space-y-2">
                        {MODULOS_DISPONIBLES.map(m => (
                           <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={nuevoUsuario.modulos.includes(m.id)} onChange={() => handleToggleModulo(m.id)} className="text-[#DF888A] rounded focus:ring-[#DF888A] accent-[#DF888A]" />
                              <span className="text-xs text-stone-700 font-medium">{m.nombre}</span>
                           </label>
                        ))}
                     </div>
                  </div>
               )}
               <button onClick={agregarUsuario} className="w-full bg-[#4A2B29] hover:bg-[#3D221F] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition mt-2"><Plus size={16}/> Otorgar Acceso</button>
            </div>
         </div>

         <div className="w-full xl:w-2/3">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
               <table className="w-full text-left text-sm">
                 <thead className="bg-[#FFF9F8] text-stone-500 text-[10px] uppercase tracking-widest">
                   <tr><th className="p-4 font-bold border-b border-stone-200">Personal</th><th className="p-4 font-bold border-b border-stone-200">Rol</th><th className="p-4 font-bold border-b border-stone-200">Permisos Visuales</th><th className="p-4 font-bold border-b border-stone-200 text-center">Acción</th></tr>
                 </thead>
                 <tbody>
                   {usuariosRoles.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-stone-400">No hay cuentas de personal configuradas.</td></tr>}
                   {usuariosRoles.map(u => (
                     <tr key={u._docId} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                       <td className="p-4">
                          <p className="font-bold text-[#4A2B29]">{u.nombre}</p>
                          <p className="text-[10px] text-stone-500">{u.email}</p>
                       </td>
                       <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.rol === 'SuperAdmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{u.rol}</span>
                       </td>
                       <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                             {u.rol === 'SuperAdmin' ? (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1"><Lock size={10}/> Acceso Restringido a Todos</span>
                             ) : (
                                u.modulos?.map(mod => <span key={mod} className="text-[9px] uppercase tracking-wider font-bold bg-white border border-stone-200 text-stone-500 px-1.5 py-0.5 rounded">{mod}</span>)
                             )}
                          </div>
                       </td>
                       <td className="p-4 text-center">
                          <button onClick={() => deleteDocData(u._docId)} className="text-stone-300 hover:text-rose-500 p-2 rounded-lg transition-colors"><Trash2 size={16}/></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}

// UI HELPER
function MetricCard({ title, value, trend, isPositive, icon: Icon }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4"><h4 className="text-stone-500 text-sm font-bold tracking-wide">{title}</h4><div className="p-2 bg-[#FFF9F8] text-[#DF888A] border border-[#F2E8E6] rounded-lg group-hover:bg-[#4A2B29] group-hover:text-white transition-colors"><Icon size={18} /></div></div>
      <div className="text-3xl font-black text-[#4A2B29] tracking-tight">{value}</div>
      <div className="mt-4 flex items-center gap-2 text-sm"><span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{trend}</span></div>
    </div>
  );
}