// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc, query, limit, enableIndexedDbPersistence } from 'firebase/firestore';
import { 
  LayoutDashboard, ShoppingBag, Users, History, 
  Cake, Boxes, MapPin, Receipt, Settings, Plus, Search, 
  Truck, ChevronRight, TrendingUp, Zap, Sparkles, 
  Edit3, Trash2, Save, X, CheckCircle, Map, Camera, MessageCircle, Eye, ArrowLeft, Package,
  Bot, ScanSearch, CalendarDays, Tags, MapPinned, BarChart3, Navigation, Info, ShieldCheck, UserPlus, Lock, Menu
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

const rootPath = `produccion/erp`;

// === INICIO MODO OFFLINE ===
try {
   enableIndexedDbPersistence(db).catch((err) => {
     if (err.code == 'failed-precondition') {
       console.warn("Múltiples pestañas abiertas. El modo offline solo funciona en una.");
     } else if (err.code == 'unimplemented') {
       console.warn("El navegador no soporta el modo offline.");
     }
   });
 } catch (e) { console.log(e); }
 // === FIN MODO OFFLINE ===

// ==========================================
// 2. DATOS DE SIEMBRA (CON NUEVA COLECCIÓN DE CATEGORÍAS)
// ==========================================
const SEED_DATA = {
  pedidos: [], 
  clientes: [], 
  zonas: [], 
  productos: [], 
  inventario: [], 
  costos: [], 
  atributos_precio: [], 
  usuarios_permisos: [],
  categorias_productos: [
    { id: 'cat-1', nombre: 'Tortas' }, 
    { id: 'cat-2', nombre: 'Pasteles' }, 
    { id: 'cat-3', nombre: 'Cupcakes' },
    { id: 'cat-4', nombre: 'Negritos' }, 
    { id: 'cat-5', nombre: 'Cheesecake' }, 
    { id: 'cat-6', nombre: 'Cakepops' },
    { id: 'cat-7', nombre: 'Alfajores' }, 
    { id: 'cat-8', nombre: 'Rosca de Reyes' }
  ]
};

// ==========================================
// 3. HOOK DE ARQUITECTURA: GESTOR DE COLECCIONES
// ==========================================
function useFirestoreCollection(collectionName, user, maxDocs = null) {
   const [data, setData] = useState([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (!user) {
       setLoading(false);
       return;
     }
 
     const colPath = `${rootPath}/${collectionName}`;
     let colRef = collection(db, colPath);
     
     // === INICIO PROTECCIÓN OOM (RAM) ===
     if (maxDocs) {
       colRef = query(colRef, limit(maxDocs));
     }
     // === FIN PROTECCIÓN ===
 
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
// === INICIO HELPER INVENTARIO ===
const calcularCantidadConvertida = (cantidadReceta, unidadReceta, unidadInventario) => {
   if (!cantidadReceta) return 0;
   const uR = String(unidadReceta).toLowerCase();
   const uI = String(unidadInventario).toLowerCase();
   let cantidad = parseFloat(cantidadReceta);
 
   if (uI === 'kg' && uR === 'gr') return cantidad / 1000;
   if (uI === 'gr' && uR === 'kg') return cantidad * 1000;
   if (uI === 'l' && uR === 'ml') return cantidad / 1000;
   if (uI === 'ml' && uR === 'l') return cantidad * 1000;
   return cantidad; 
 };
 // === FIN HELPER INVENTARIO ===

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
// 4. PORTAL DE ACCESO (LOGIN PRODUCCIÓN)
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
    <div className="h-screen w-full flex items-center justify-center bg-[#FFF9F8] font-sans selection:bg-[#E29596]/30 px-4">
       <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_20px_50px_-12px_rgba(74,43,41,0.15)] w-full max-w-md border border-[#F2E8E6] flex flex-col items-center">
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
                   <Zap size={14} className="shrink-0"/> <span>{error}</span>
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
// 5. COMPONENTE PRINCIPAL (ENRUTADOR Y DISEÑO RESPONSIVO)
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
  
  // Nuevo Estado para Diseño Responsivo Móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

 // === INICIO AUTO-LOGOUT POR INACTIVIDAD ===
 useEffect(() => {
   if (!user) return;
   let timeoutId;
   
   const resetTimer = () => {
     clearTimeout(timeoutId);
     // Cierra sesión a los 15 minutos (900,000 milisegundos) de inactividad
     timeoutId = setTimeout(() => {
        signOut(auth);
        alert("Sesión cerrada automáticamente por inactividad. Ingresa de nuevo.");
     }, 900000); 
   };

   window.addEventListener('mousemove', resetTimer);
   window.addEventListener('keydown', resetTimer);
   window.addEventListener('click', resetTimer);
   resetTimer(); 

   return () => {
     clearTimeout(timeoutId);
     window.removeEventListener('mousemove', resetTimer);
     window.removeEventListener('keydown', resetTimer);
     window.removeEventListener('click', resetTimer);
   };
 }, [user]);
 // === FIN AUTO-LOGOUT ===

  // === INICIO PWA ===
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };
  // === FIN PWA ===

 // === INICIO DETECCIÓN iOS (NUEVO) ===
 const [isIOS, setIsIOS] = useState(false);
 const [showIOSBanner, setShowIOSBanner] = useState(false);

 useEffect(() => {
   // Detectar si es un dispositivo Apple (iPhone/iPad)
   const userAgent = window.navigator.userAgent.toLowerCase();
   const isApple = /iphone|ipad|ipod/.test(userAgent);
   
   // Detectar si ya está instalada (pantalla completa)
   const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone);

   // Si es Apple y NO está instalada, mostramos el banner
   if (isApple && !isStandalone) {
     setIsIOS(true);
     setShowIOSBanner(true);
   }
 }, []);
 // === FIN DETECCIÓN iOS ===


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleTabChange = (tabId) => {
     setCurrentTab(tabId);
     setIsMobileMenuOpen(false); // Cierra el menú al seleccionar en móvil
  };

  if (authLoading) return <div className="h-screen w-full flex items-center justify-center bg-[#FFF9F8] text-stone-500 font-medium">Cargando Sistema...</div>;

  if (!user) {
     return <LoginScreen />;
  }

  return (
    <div className="flex h-screen bg-[#FFF9F8] font-sans text-[#4A2B29] overflow-hidden selection:bg-[#E29596]/30">
      
      {/* OVERLAY MÓVIL (Oscurece el fondo al abrir menú) */}
      {isMobileMenuOpen && (
         <div 
            className="fixed inset-0 bg-[#3D221F]/60 backdrop-blur-sm z-40 lg:hidden transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)} 
         />
      )}

      {/* SIDEBAR RESPONSIVO */}
      <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 w-64 bg-white border-r border-stone-200 flex flex-col z-50 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] transition-transform duration-300 ease-in-out`}>
        <div className="p-6 flex items-center justify-between border-b border-stone-100">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#4A2B29] rounded-xl flex items-center justify-center shadow-md">
               <Cake size={20} className="text-white" />
             </div>
             <div>
               <h1 className="text-lg font-bold text-[#4A2B29] tracking-tight leading-none">Mamina</h1>
               <p className="text-[10px] text-[#DF888A] uppercase tracking-widest font-bold mt-1">ERP Enterprise</p>
             </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-stone-400 hover:text-rose-500 p-1 bg-stone-50 rounded-md">
             <X size={18}/>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <p className="text-xs font-bold text-stone-400 mb-4 px-2 tracking-wider uppercase">Navegación</p>
          <ul className="space-y-1">
          {TABS.map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                        currentTab === tab.id ? 'bg-[#4A2B29] text-white shadow-md' : 'text-stone-500 hover:bg-stone-50 hover:text-[#4A2B29]'
                      }`}
                    >
                      <tab.icon size={18} className={currentTab === tab.id ? 'text-[#DF888A]' : 'text-stone-400 group-hover:text-stone-700'} />
                      <span className="text-sm font-medium">{tab.name}</span>
                    </button>
                  </li>
                ))}
                
                {/* INICIO BOTÓN AUDITORÍA (Estilo Nativo) */}
                <li>
                  <button onClick={() => {setCurrentTab('auditoria'); setIsMobileMenuOpen(false);}} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${currentTab === 'auditoria' ? 'bg-[#4A2B29] text-white shadow-md' : 'text-stone-500 hover:bg-stone-50 hover:text-[#4A2B29]'}`}>
                    <ShieldCheck size={18} className={currentTab === 'auditoria' ? 'text-[#DF888A]' : 'text-stone-400 group-hover:text-stone-700'} />
                    <span className="text-sm font-medium">Auditoría</span>
                  </button>
                </li>
                {/* FIN BOTÓN AUDITORÍA */}
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
              <button onClick={() => signOut(auth)} className="text-stone-400 hover:text-rose-500 p-1" title="Cerrar Sesión"><X size={14}/></button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative w-full">

 {/* BANNER INSTRUCTIVO PARA iOS */}
 {showIOSBanner && (
          <div className="bg-blue-50 border-b border-blue-200 p-3 flex justify-between items-start md:items-center z-30 relative shrink-0">
             <div className="flex items-start md:items-center gap-3 text-blue-800 text-[11px] md:text-sm">
                <Info size={18} className="shrink-0 text-blue-600 mt-0.5 md:mt-0"/>
                <p><strong>¿Quieres instalar esta App en tu iPhone?</strong> Toca el ícono Compartir <span className="inline-block bg-white px-1 rounded shadow-sm text-blue-600 text-[10px] mx-1">↑</span> en la barra de Safari y selecciona <strong>"Agregar a Inicio"</strong>.</p>
             </div>
             <button onClick={() => setShowIOSBanner(false)} className="text-blue-400 hover:text-blue-600 p-1 shrink-0"><X size={16}/></button>
          </div>
        )}


        {/* HEADER RESPONSIVO */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
              {/* BOTÓN INSTALAR PWA */}
              {installPrompt && (
               <button 
                 onClick={handleInstallClick} 
                 className="px-3 md:px-4 py-2 bg-emerald-600 text-white text-xs md:text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition flex items-center gap-1.5"
               >
                 <Zap size={16} className="hidden sm:block"/> <span className="hidden sm:inline">Instalar App</span><span className="sm:hidden">Instalar</span>
               </button>
            )}

             <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-stone-500 hover:text-[#4A2B29] hover:bg-stone-100 rounded-lg transition-colors">
                <Menu size={22} />
             </button>
             <h2 className="text-lg md:text-xl font-bold text-[#3D221F] tracking-tight flex items-center gap-2">
               {TABS.find((t) => t.id === currentTab)?.name || 'Módulo'}
             </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button className="px-3 md:px-4 py-2 bg-[#4A2B29] text-white text-xs md:text-sm font-medium rounded-lg shadow-sm hover:bg-[#3D221F] transition shadow-[0_4px_14px_0_rgba(74,43,41,0.39)]" onClick={() => handleTabChange('pedidos')}>
              <span className="hidden md:inline">Nueva Orden Rápida</span>
              <span className="md:hidden"><Plus size={16}/></span>
            </button>
          </div>
        </header>

        {/* ÁREA DE CONTENIDO CON PADDING AJUSTADO PARA MÓVIL */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#FFF9F8] w-full">
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
          {currentTab === 'auditoria' && <AuditoriaModule user={user} />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// MÓDULO 1: DASHBOARD
// ==========================================
function DashboardModule({ user }) {
  const { data: pedidos, loading } = useFirestoreCollection('pedidos', user, 300);

  const pedidosValidos = pedidos.filter(p => p.estado !== 'Anulado');
  const ingresosBrutos = pedidosValidos.reduce((acc, p) => acc + parseFloat(p.total || 0), 0);
  const ordenesActivas = pedidosValidos.filter(p => p.estado !== 'Entregado').length;
  const ticketPromedio = pedidosValidos.length > 0 ? (ingresosBrutos / pedidosValidos.length) : 0;

  if (loading) return <div className="animate-pulse flex flex-col md:flex-row gap-6"><div className="w-full md:w-1/4 h-32 bg-stone-200 rounded-2xl"></div></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-2 mb-6 md:mb-8">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] tracking-tight">Visión General Operativa</h3>
          <p className="text-stone-500 mt-1 text-xs md:text-sm">Lectura directa desde Firestore.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <MetricCard title="Ingreso Bruto" value={`$${ingresosBrutos.toFixed(2)}`} trend="En vivo" isPositive={true} icon={TrendingUp} />
          <MetricCard title="Órdenes Activas" value={String(ordenesActivas)} trend="En proceso" isPositive={true} icon={Zap} />
          <MetricCard title="Ticket Promedio" value={`$${ticketPromedio.toFixed(2)}`} trend="Calculado" isPositive={true} icon={Receipt} />
          <MetricCard title="Total Pedidos" value={String(pedidosValidos.length)} trend="Válidos" isPositive={true} icon={ShoppingBag} />
        </div>
        <div className="col-span-12 md:col-span-4 bg-[#4A2B29] rounded-2xl shadow-xl p-6 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#DF888A]/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/10 rounded-lg"><Sparkles size={20} className="text-[#DF888A]" /></div>
            <h4 className="text-white font-semibold">Consejo de Expertos</h4>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-stone-300 text-sm leading-relaxed space-y-3">
            <p>💡 <strong className="text-white">Actualización Móvil:</strong> El sistema ahora usa contenedores de desbordamiento horizontal (`overflow-x-auto`) para que las tablas no rompan la pantalla en tu celular.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO LOGÍSTICA Y MAPA
// ==========================================
function MapaModule({ user }) {
   const { data: pedidos, loading } = useFirestoreCollection('pedidos', user, 300);
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
         <div className="flex flex-col md:flex-row justify-between md:items-end gap-2 mb-6">
            <div>
               <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] tracking-tight">Inteligencia de Logística</h3>
               <p className="text-stone-500 text-xs md:text-sm mt-1">Despachos activos y analítica de zonas calientes.</p>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto md:h-[600px] mb-6">
            <div className="lg:col-span-8 flex flex-col gap-6 h-[500px] md:h-full">
               <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex-1 flex flex-col overflow-hidden relative">
                  <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center z-10">
                     <h4 className="font-bold text-[#3D221F] flex items-center gap-2"><Navigation size={18} className="text-blue-500"/> Monitor de Entregas</h4>
                     <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{activos.length} en ruta</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
                     <div className="w-full md:w-1/3 border-r border-b md:border-b-0 border-stone-100 bg-white overflow-y-auto max-h-[200px] md:max-h-full">
                        {activos.length === 0 ? (
                           <div className="p-6 text-center text-stone-400 italic text-sm">No hay entregas activas.</div>
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
                     
                     <div className="w-full md:w-2/3 bg-stone-100 relative flex-1 flex flex-col min-h-[300px] md:min-h-full">
                        {ordenSeleccionada ? (
                           <React.Fragment>
                              <div className="absolute top-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg z-10 border border-stone-200">
                                 <p className="font-bold text-[#4A2B29] text-sm">Destino: {ordenSeleccionada.zona}</p>
                                 <p className="text-xs text-stone-600">{ordenSeleccionada.direccionText}</p>
                              </div>
                              <iframe 
                                 title="Mapa de Entrega"
                                 width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" 
                                 className="flex-1 w-full h-full"
                                 src={`https://maps.google.com/maps?q=${encodeURIComponent(ordenSeleccionada.direccionText + ' Ecuador')}&output=embed`}
                              ></iframe>
                           </React.Fragment>
                        ) : (
                           <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-6 text-center">
                              <MapPinned size={48} className="mb-4 opacity-50 text-stone-300" />
                              <p className="text-sm">Selecciona una entrega de la lista para localizar el destino.</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6 h-auto md:h-full overflow-hidden">
               <div className="bg-[#4A2B29] rounded-2xl border border-[#3D221F] shadow-xl p-6 flex flex-col relative overflow-hidden h-[300px] md:h-auto md:flex-1">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  <h4 className="font-bold text-white mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-[#DF888A]"/> Zonas Calientes</h4>
                  
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                     {topZonas.length === 0 && <p className="text-stone-400 text-sm italic">Faltan datos de entregas.</p>}
                     {topZonas.map((z, idx) => (
                        <div key={z.zona} className="bg-white/5 border border-white/10 rounded-xl p-3">
                           <div className="flex justify-between items-start mb-1">
                              <p className="font-bold text-[#FCF6F5] text-sm truncate pr-2">{idx + 1}. {z.zona}</p>
                              <span className="text-[10px] font-bold bg-[#DF888A]/20 text-[#DF888A] px-2 py-0.5 rounded shrink-0">{z.count} pd</span>
                           </div>
                           <div className="flex justify-between items-center text-xs mt-2">
                              <span className="text-stone-400">Ingresos:</span>
                              <span className="font-black text-emerald-400">${z.ingresos.toFixed(2)}</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 shrink-0">
                  <h4 className="font-bold text-[#3D221F] mb-2 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500"/> Entregas Exitosas</h4>
                  <div className="text-3xl md:text-4xl font-black text-[#4A2B29]">{pasados.length}</div>
                  <p className="text-xs text-stone-500 mt-1">Despachos completados histórico.</p>
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
  const { data: pedidos, loading: pLoad, addDocData, updateDocData } = useFirestoreCollection('pedidos', user, 300);
  const { data: clientes, addDocData: addCliente, updateDocData: updateCliente } = useFirestoreCollection('clientes', user);
  const { data: zonas } = useFirestoreCollection('zonas', user);
  const { data: productos } = useFirestoreCollection('productos', user);
  const { data: atributos_precio } = useFirestoreCollection('atributos_precio', user);
  const { data: categoriasDB } = useFirestoreCollection('categorias_productos', user);
  const { data: costosRecetas } = useFirestoreCollection('costos', user);
// === CONEXIÓN A CAJA NEGRA ===
const { addDocData: addAudit } = useFirestoreCollection('auditoria_logs', user);


// === INICIO MOTOR DE INVENTARIO ===
const { data: inventario, updateDocData: updateInventario } = useFirestoreCollection('inventario', user);

// Factor: -1 (restar al crear), 1 (sumar al anular)
const procesarInventarioPedido = async (carrito, factor) => {
   const impactos = {}; // Agrupador Anti-Crash
   
   for (const item of carrito) {
      // 1. Buscar si existe receta para este producto
      const receta = costosRecetas.find(r => r.producto.toLowerCase() === item.productoInfo?.nombre?.toLowerCase());
      if (!receta || !receta.ingredientes) continue;

      // 2. Acumular ingredientes
      for (const ing of receta.ingredientes) {
         const nombreInsumo = ing.nombre.toLowerCase();
         const insumoInv = inventario.find(inv => inv.item.toLowerCase() === nombreInsumo);
         if (!insumoInv) continue; // Si no existe en inventario, ignoramos

         const cantidadConvertida = calcularCantidadConvertida(ing.cantidad, ing.unidad, insumoInv.unidad);
         
         if (!impactos[nombreInsumo]) {
            impactos[nombreInsumo] = { 
               docId: insumoInv._docId, 
               stockActual: parseFloat(insumoInv.stock), 
               cambio: 0 
            };
         }
         impactos[nombreInsumo].cambio += (cantidadConvertida * factor);
      }
   }

   // 3. Ejecutar descuentos en Firestore de forma segura
   for (const key in impactos) {
      const { docId, stockActual, cambio } = impactos[key];
      const nuevoStock = Math.max(0, stockActual + cambio); // Evita que baje de 0
      const nuevoEstado = nuevoStock > 0 ? 'Óptimo' : 'Comprar';
      await updateInventario(docId, { stock: nuevoStock, estado: nuevoEstado });
   }
};
// === FIN MOTOR DE INVENTARIO ===


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
        // 1. Quita el candado al guardar
        const payloadActualizacion = { ...ordenData, bloqueadoPor: null };
        await updateDocData(pedidoActual._docId, payloadActualizacion);
        
        // === GATILLO: DEVOLUCIÓN POR ANULACIÓN (Intacto) ===
        if (pedidoActual.estado !== 'Anulado' && ordenData.estado === 'Anulado') {
           await procesarInventarioPedido(ordenData.carrito || [], 1);
        }
        else if (pedidoActual.estado === 'Anulado' && ordenData.estado !== 'Anulado') {
           await procesarInventarioPedido(ordenData.carrito || [], -1);
        }
        // ==========================================

        // 2. REGISTRO DE AUDITORÍA
        await addAudit({
           fechaHora: new Date().toISOString(),
           usuario: user.email,
           accion: "MODIFICÓ / ACTUALIZÓ ORDEN",
           idOrden: pedidoActual.id
        });

        showFeedback("Operación actualizada correctamente.", "success");
     } else {
        const customHumanId = `ORD-${Math.floor(Math.random() * 10000) + 90000}`;
        // 1. Nace sin candados
        const nuevaOrden = { ...ordenData, id: customHumanId, bloqueadoPor: null };
        await addDocData(nuevaOrden, customHumanId);
        
        // === GATILLO: DESCUENTO AL CREAR (Intacto) ===
        if (nuevaOrden.estado !== 'Anulado') {
           await procesarInventarioPedido(nuevaOrden.carrito || [], -1);
        }
        // ===================================

        // 2. REGISTRO DE AUDITORÍA
        await addAudit({
           fechaHora: new Date().toISOString(),
           usuario: user.email,
           accion: "CREÓ NUEVA ORDEN",
           idOrden: customHumanId
        });

        showFeedback("Nueva orden registrada exitosamente.", "success");
     }
     setView('list');
   } catch (error) {
     console.error(error);
     showFeedback(String("Error de Sistema: " + (error.message || "Fallo en Firebase.")), "error");
   }
 };

  // === INICIO CONCURRENCIA ===
  const handleEditar = async (pedido) => {
   if (pedido.bloqueadoPor && pedido.bloqueadoPor !== user.email) {
      showFeedback(`🔒 Candado: ${pedido.bloqueadoPor} está editando esta orden ahora mismo.`, 'error');
      return;
   }
   await updateDocData(pedido._docId, { bloqueadoPor: user.email });
   setPedidoActual(pedido);
   setView('edit');
 };

 const cancelarEdicion = async () => {
   if (pedidoActual && pedidoActual._docId) {
      await updateDocData(pedidoActual._docId, { bloqueadoPor: null });
   }
   setPedidoActual(null);
   setView('list');
 };
 // === FIN CONCURRENCIA ===

  if (pLoad) return <div className="animate-pulse">Cargando base de datos...</div>;

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] tracking-tight">Centro de Operaciones</h3>
        </div>
        {view === 'list' ? (
          <button onClick={() => { setPedidoActual(null); setView('new'); }} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#4A2B29] text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:bg-[#3D221F] transition">
            <Plus size={18} /> Nueva Orden
          </button>
        ) : (
         <button onClick={cancelarEdicion} className="w-full sm:w-auto flex items-center justify-center gap-2 text-stone-500 px-4 py-2 bg-white rounded-lg border border-stone-200 shadow-sm hover:bg-stone-50 transition">
            <ChevronRight size={18} className="rotate-180" /> Cancelar
          </button>
        )}
      </div>

      {feedback && (
        <div className={`mb-6 w-full p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 ${feedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
           {feedback.type === 'error' ? <Zap size={18} className="shrink-0"/> : <CheckCircle size={18} className="shrink-0"/>}
           {feedback.msg}
        </div>
      )}

      {view === 'list' ? (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden w-full">
          {/* CONTENEDOR PARA HACER LA TABLA DESLIZABLE EN MÓVIL */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-sm min-w-[800px]">
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
        </div>
      ) : (
        <PedidoFormulario 
           onGuardar={handleGuardar} 
           initialData={pedidoActual} 
           clientes={clientes} 
           zonas={zonas}
           productos={productos}
           diccionarioAtributos={atributos_precio}
           categoriasDB={categoriasDB}
           costosRecetas={costosRecetas}
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
function PedidoFormulario({ onGuardar, initialData, clientes, zonas, productos, diccionarioAtributos, categoriasDB, costosRecetas, guardarNuevoCliente, actualizarCliente }) {

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

  const productosFiltrados = productos?.filter(p => p.categoria === prodBuilder.categoria) || [];
  const prodSeleccionadoInfo = productos?.find(p => (p._docId || p.id) === prodBuilder.idProducto);

  const precioSugerido = useMemo(() => {
   let suma = 0;
   
   if (prodSeleccionadoInfo && costosRecetas) {
      const recetaBase = costosRecetas.find(r => r.producto.toLowerCase() === prodSeleccionadoInfo.nombre.toLowerCase());
      if (recetaBase && recetaBase.costoTotal) {
         suma += parseFloat(recetaBase.costoTotal);
      }
   }

   // === RESOLUCIÓN DE LA PARADOJA NUTELLA ===
   // Iteramos 'Object.entries' para conocer la Clase (key) y el Nombre (val)
   Object.entries(prodBuilder.atributos).forEach(([claseGral, valorSel]) => {
      if (!valorSel) return; // Si el input está vacío, lo saltamos
      
      const atr = diccionarioAtributos.find(d => {
         // 1. Que el nombre sea igual (Ej. Nutella === Nutella)
         const coincideNombre = d.nombre.toLowerCase() === String(valorSel).toLowerCase();
         
         // 2. Que la clase general sea igual (Ej. Relleno === Relleno). 
         // Si en el diccionario no le pusimos clase, ignoramos este paso para no romper compatibilidad antigua.
         const coincideClase = d.categoriaAtr ? d.categoriaAtr.toLowerCase() === String(claseGral).toLowerCase() : true;
         
         return coincideNombre && coincideClase;
      });
      
      if (atr && atr.precio) suma += parseFloat(atr.precio);
   });

   return suma > 0 ? suma.toFixed(2) : null;
}, [prodBuilder.atributos, diccionarioAtributos, prodSeleccionadoInfo, costosRecetas]);


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
    <div className="flex flex-col xl:flex-row gap-6 items-start pb-20 w-full animate-in fade-in duration-300">
      <div className="flex-1 space-y-6 w-full">
        
        {localError && (
          <div className="w-full bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-xl text-sm font-bold flex items-center gap-3">
            <Zap size={18} className="shrink-0 text-rose-500"/> {localError}
          </div>
        )}
        {localSuccess && (
          <div className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-xl text-sm font-bold flex items-center gap-3">
            <CheckCircle size={18} className="shrink-0 text-emerald-500"/> {localSuccess}
          </div>
        )}

        {/* ESTADO Y TIEMPOS */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative w-full">
           <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl"></div>
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-[#4A2B29] flex items-center gap-2"><Settings size={18} className="text-stone-400"/> Atributos de la Orden</h4>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
           
           <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                 <input type="checkbox" checked={requiereFactura} onChange={e => setRequiereFactura(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 accent-blue-600" />
                 <span className="text-sm font-bold text-stone-700 flex items-center gap-1.5"><Receipt size={16} className="text-blue-500"/> Factura Electrónica</span>
              </label>
              {requiereFactura && (
                 <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">IVA % :</span>
                    <input type="number" value={ivaPorcentaje} onChange={e => setIvaPorcentaje(e.target.value)} className="w-16 border border-blue-200 rounded px-2 py-1 text-sm font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
              )}
           </div>
        </div>

        {/* EVIDENCIA VISUAL */}
        {estadoPermiteFoto && (
           <div className="bg-[#FFF9F8] p-4 md:p-6 rounded-2xl border border-[#E29596] shadow-sm relative w-full">
             <div className="absolute top-0 left-0 w-1 h-full bg-[#DF888A] rounded-l-2xl"></div>
             <h4 className="font-bold text-[#4A2B29] mb-4 flex items-center gap-2"><Camera size={18} className="text-[#DF888A]"/> Evidencia Visual de Producción</h4>
             <div className="flex flex-col sm:flex-row gap-4 md:gap-6 items-start">
                <div className="w-full sm:w-1/3">
                   <label className="cursor-pointer w-full bg-white border-2 border-dashed border-[#DF888A] hover:border-[#4A2B29] rounded-xl p-4 flex flex-col items-center justify-center text-[#DF888A] hover:text-[#4A2B29] hover:bg-[#FFF9F8] transition-colors h-32">
                     <Camera size={24} className="mb-2" />
                     <span className="text-xs font-bold text-center">Cargar Fotografía</span>
                     <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                   </label>
                </div>
                <div className="w-full sm:w-2/3 flex flex-col items-start justify-center h-full">
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

        {/* CLIENTE */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative w-full">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#4A2B29] rounded-l-2xl"></div>
          <h4 className="font-bold text-[#4A2B29] mb-4 flex items-center gap-2"><Users size={18} className="text-stone-400"/> Identidad del Cliente</h4>
          {!clienteActivo && !modoNuevo ? (
            <div className="relative">
              <div className="flex items-center border border-stone-200 rounded-xl px-3 bg-stone-50 focus-within:ring-2 focus-within:ring-[#4A2B29] focus-within:bg-white transition-all">
                <Search size={18} className="text-stone-400" />
                <input type="text" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setMostrarDropdown(true); }} onFocus={() => setMostrarDropdown(true)} placeholder="Buscar en base de clientes..." className="w-full px-3 py-3 outline-none bg-transparent font-medium" />
              </div>
              {mostrarDropdown && busqueda && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-stone-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-50">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map(c => (
                      <div key={c._docId || c.id} onClick={() => { setClienteActivo(c); setBusqueda(c.nombre); setMostrarDropdown(false); if(c.direcciones?.length > 0) setDireccionSeleccionada(c.direcciones[0].id?.toString()); }} className="p-3 hover:bg-stone-50 cursor-pointer border-b border-stone-100 transition-colors">
                        <p className="font-bold text-[#3D221F] text-sm">{c.nombre}</p>
                        <p className="text-[11px] text-stone-500 font-medium">Doc: {c.cedula || 'N/A'} | Tel: {c.telefono || 'N/A'}</p>
                      </div>
                    ))
                  ) : (<div className="p-4 text-sm text-stone-500 italic text-center border-b border-stone-100">Sin coincidencias.</div>)}
                  <div onClick={() => { setModoNuevo(true); setMostrarDropdown(false); setDatosNuevoCliente({...datosNuevoCliente, nombre: busqueda}); setMostrarFormDireccion(true); }} className="p-3 bg-[#FFF9F8] hover:bg-[#F2E8E6] cursor-pointer text-[#4A2B29] font-bold text-sm flex items-center gap-2 transition-colors sticky bottom-0"><Plus size={16} /> Crear nuevo: "{busqueda}"</div>
                </div>
              )}
            </div>
          ) : clienteActivo ? (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 relative flex flex-col sm:flex-row gap-4">
              <button onClick={() => { setClienteActivo(null); setBusqueda(''); setMostrarFormDireccion(false); }} className="absolute top-3 right-3 text-stone-400 hover:text-[#4A2B29]"><X size={16} /></button>
              <div className="flex items-center gap-4 w-full">
                 <div className="w-10 h-10 md:w-12 md:h-12 bg-[#4A2B29] rounded-full flex items-center justify-center font-bold text-white text-lg shadow-inner shrink-0">{clienteActivo.nombre.charAt(0).toUpperCase()}</div>
                 <div className="overflow-hidden flex-1">
                    <h5 className="font-bold text-[#3D221F] text-base md:text-lg leading-tight truncate">{clienteActivo.nombre}</h5>
                    <p className="text-[10px] md:text-xs text-stone-500 font-medium mt-0.5 tracking-wide truncate">ID: {clienteActivo.id} | C.I: {clienteActivo.cedula || 'N/A'}</p>
                 </div>
              </div>
              {requiereFactura && (!clienteActivo.cedula || clienteActivo.cedula.trim() === '') && (
                 <div className="w-full mt-2 sm:mt-0">
                    <input type="text" placeholder="Ingresa Cédula o RUC..." className="w-full px-3 py-2 border border-rose-300 bg-rose-50 rounded-lg outline-none text-sm focus:ring-2 focus:ring-rose-500 text-rose-900 placeholder:text-rose-400" onChange={(e) => setClienteActivo({...clienteActivo, cedula: e.target.value})} />
                 </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5 shadow-inner">
               <div className="flex justify-between items-center mb-4"><h5 className="font-bold text-emerald-800 text-sm md:text-base">Generar Nuevo Registro</h5><button onClick={() => { setModoNuevo(false); setMostrarFormDireccion(false); }} className="text-emerald-600 hover:text-emerald-900 bg-white p-1 rounded-md shadow-sm"><X size={16}/></button></div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                 <div className="sm:col-span-2"><input type="text" placeholder="Nombre Completo" value={datosNuevoCliente.nombre} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, nombre: e.target.value})} className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500 font-medium bg-white" /></div>
                 <div><input type="text" placeholder={requiereFactura ? "Cédula/RUC (Oblig)*" : "Cédula/RUC"} value={datosNuevoCliente.cedula} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, cedula: e.target.value})} className={`w-full px-3 py-2.5 border rounded-lg outline-none text-sm bg-white ${requiereFactura && !datosNuevoCliente.cedula ? 'border-rose-400 bg-rose-50 focus:ring-2 focus:ring-rose-500 placeholder:text-rose-400' : 'border-emerald-200 focus:ring-2 focus:ring-emerald-500'}`} /></div>
                 <div><input type="text" placeholder="Teléfono" value={datosNuevoCliente.telefono} onChange={e => setDatosNuevoCliente({...datosNuevoCliente, telefono: e.target.value})} className="w-full px-3 py-2.5 border border-emerald-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-emerald-500 bg-white" /></div>
               </div>
            </div>
          )}
        </div>

        {/* CONSTRUCTOR PRODUCTOS */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative z-20 w-full">
           <div className="absolute top-0 left-0 w-1 h-full bg-[#DF888A] rounded-l-2xl"></div>
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h4 className="font-bold text-[#4A2B29] flex items-center gap-2"><Cake size={18} className="text-stone-400"/> Constructor de Productos</h4>
              {!builderActivo && (
                 <button onClick={() => setBuilderActivo(true)} className="w-full sm:w-auto text-xs font-bold text-white bg-[#4A2B29] px-3 py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-[#3D221F] transition"><Plus size={14}/> Agregar Producto</button>
              )}
           </div>

           {builderActivo && (
              <div className="bg-[#FFF9F8] p-4 md:p-5 rounded-xl border border-[#F2E8E6] mb-5 shadow-inner">
                 <div className="flex justify-between items-start mb-3">
                    <h5 className="font-bold text-[#4A2B29] text-xs md:text-sm uppercase tracking-wider">Configurador de Ítem</h5>
                    <button onClick={() => setBuilderActivo(false)} className="text-[#DF888A] hover:text-[#4A2B29]"><X size={16}/></button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                    <div>
                       <label className="text-[10px] font-bold text-[#4A2B29] uppercase block mb-1">Categoría General</label>
                       <select value={prodBuilder.categoria} onChange={e => setProdBuilder({...prodBuilder, categoria: e.target.value, idProducto: '', atributos: {}})} className="w-full px-3 py-2 border border-[#F2E8E6] rounded-md outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white">
                          <option value="">Seleccione Categoría...</option>
                          {categoriasDB?.map(c => <option key={c._docId} value={c.nombre}>{c.nombre}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-[#4A2B29] uppercase block mb-1">Producto / Subcategoría</label>
                       <select value={prodBuilder.idProducto} onChange={e => setProdBuilder({...prodBuilder, idProducto: e.target.value, atributos: {}})} disabled={!prodBuilder.categoria} className="w-full px-3 py-2 border border-[#F2E8E6] rounded-md outline-none text-sm focus:ring-2 focus:ring-[#DF888A] disabled:opacity-50 bg-white">
                          <option value="">Seleccione Producto...</option>
                          {productosFiltrados.map(p => <option key={p._docId || p.id} value={p._docId || p.id}>{p.nombre}</option>)}
                       </select>
                    </div>
                 </div>

                 {prodSeleccionadoInfo?.atributos?.length > 0 && (
                    <div className="border-t border-[#F2E8E6] pt-3 pb-4 mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                       <div className="col-span-1 sm:col-span-2 md:col-span-3 text-[10px] font-bold text-[#DF888A] uppercase tracking-widest flex flex-col sm:flex-row sm:justify-between gap-1">
                          <span>Atributos del Producto</span>
                          {precioSugerido && <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shadow-sm border border-emerald-200 flex items-center gap-1 w-fit"><Sparkles size={10}/>Costo Base Sugerido: ${precioSugerido}</span>}

                       </div>
                       {prodSeleccionadoInfo.atributos.map(attr => (
                          <div key={attr}><input type="text" placeholder={attr} value={prodBuilder.atributos[attr] || ''} onChange={e => setProdBuilder({...prodBuilder, atributos: {...prodBuilder.atributos, [attr]: e.target.value}})} className="w-full px-3 py-2 md:py-1.5 border border-stone-200 rounded text-sm outline-none focus:ring-1 focus:ring-[#DF888A] bg-white" /></div>
                       ))}
                    </div>
                 )}

                 <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-end">
                    <div className="flex-1 w-full"><label className="text-[10px] font-bold text-[#4A2B29] uppercase block mb-1">Notas especiales</label><input type="text" value={prodBuilder.notas} onChange={e => setProdBuilder({...prodBuilder, notas: e.target.value})} placeholder="Ej. Dedicatoria..." className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white" /></div>
                    <div className="w-full sm:w-32"><label className="text-[10px] font-bold text-[#4A2B29] uppercase block mb-1">Precio Final ($)</label><input type="number" value={prodBuilder.precio} onChange={e => setProdBuilder({...prodBuilder, precio: e.target.value})} placeholder={precioSugerido ? `Sug: ${precioSugerido}` : "0.00"} className="w-full px-3 py-2 border border-stone-200 rounded-md outline-none text-sm font-bold text-[#4A2B29] focus:ring-2 focus:ring-[#DF888A] text-right bg-white" /></div>
                    <button onClick={agregarAlCarrito} disabled={!prodBuilder.idProducto || !prodBuilder.precio} className="w-full sm:w-auto bg-[#4A2B29] hover:bg-[#3D221F] disabled:bg-stone-300 text-white px-5 py-2 rounded-md font-bold text-sm h-[38px] shadow-sm transition">Cargar</button>
                 </div>
              </div>
           )}

           {/* LISTA DE CARRITO */}
           {carrito.length > 0 ? (
              <div className="space-y-3 w-full">
                 {carrito.map((item) => (
                    <div key={item.idVirtual} className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                       <div className="flex-1 pr-2">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                             <span className="font-bold text-[#3D221F] text-sm leading-tight">{item.productoInfo?.nombre}</span>
                             <span className="text-[10px] bg-[#FFF9F8] border border-[#F2E8E6] px-2 py-0.5 rounded text-[#4A2B29] uppercase tracking-widest">{item.productoInfo?.categoria}</span>
                          </div>
                          <div className="text-[11px] md:text-xs text-stone-500 space-x-2 leading-tight">
                             {Object.entries(item.atributosSeleccionados || {}).map(([k, v]) => (
                                v ? <span key={k} className="inline-block"><strong className="text-stone-400 font-medium">{k}:</strong> {String(v)}</span> : null
                             ))}
                          </div>
                          {item.notas && <p className="text-[11px] md:text-xs text-[#DF888A] mt-1 italic">"{item.notas}"</p>}
                       </div>
                       <div className="flex sm:flex-col items-center sm:items-end justify-between sm:pl-3 sm:border-l border-stone-200 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                          <button onClick={() => eliminarDelCarrito(item.idVirtual)} className="text-stone-400 hover:text-rose-500 p-1"><X size={14}/></button>
                          <span className="font-bold text-[#4A2B29] mt-2">${item.precio.toFixed(2)}</span>
                       </div>
                    </div>
                 ))}
              </div>
           ) : (<div className="text-sm text-stone-400 italic bg-stone-50 p-5 rounded-xl text-center border border-dashed border-stone-200">Aún no has agregado productos a esta orden.</div>)}
           
           <div className="mt-6 pt-5 border-t border-stone-100 space-y-4">
             <div><label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Instrucciones Extras / Generales</label><textarea rows="2" value={instrucciones} onChange={e => setInstrucciones(e.target.value)} placeholder="Ej: Entregar en garita..." className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#4A2B29] bg-stone-50"></textarea></div>
             <div className="bg-[#FFF9F8] p-4 rounded-xl border border-[#F2E8E6] flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer shrink-0">
                   <input type="checkbox" checked={llevaCortesia} onChange={e => setLlevaCortesia(e.target.checked)} className="w-5 h-5 text-[#DF888A] rounded focus:ring-[#DF888A] accent-[#DF888A]" />
                   <span className="text-sm font-bold text-[#4A2B29] flex items-center gap-1"><Sparkles size={16} className="text-[#DF888A]"/> Lleva detalle de Cortesía</span>
                </label>
                {llevaCortesia && (
                   <input type="text" placeholder="Describir cortesía (Ej. Velas mágicas)" value={detalleCortesia} onChange={e => setDetalleCortesia(e.target.value)} className="w-full sm:flex-1 px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#DF888A] bg-white shadow-sm" />
                )}
             </div>
           </div>
        </div>

        {/* LOGÍSTICA */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative z-10 w-full">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl"></div>
          <h4 className="font-bold text-[#4A2B29] mb-4">Logística y Rutas</h4>
          
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-5">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${deliveryType === 'delivery' ? 'bg-[#FFF9F8] border-[#DF888A] text-[#4A2B29] font-bold' : 'border-stone-100 text-stone-500 hover:bg-stone-50'}`}>
              <input type="radio" name="deliveryType" value="delivery" checked={deliveryType === 'delivery'} onChange={() => setDeliveryType('delivery')} className="hidden" />
              <Truck size={18} /> Delivery
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${deliveryType === 'pickup' ? 'bg-[#FFF9F8] border-[#DF888A] text-[#4A2B29] font-bold' : 'border-stone-100 text-stone-500 hover:bg-stone-50'}`}>
              <input type="radio" name="deliveryType" value="pickup" checked={deliveryType === 'pickup'} onChange={() => setDeliveryType('pickup')} className="hidden" />
              <MapPin size={18} /> Retiro Local
            </label>
          </div>

          {deliveryType === 'delivery' && (
            <div className="space-y-4 bg-stone-50 p-4 md:p-5 rounded-xl border border-stone-100 w-full">
              {clienteActivo?.direcciones?.length > 0 && !mostrarFormDireccion && (
                <div className="w-full">
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-2">Direcciones en Perfil</label>
                  <select value={direccionSeleccionada} onChange={handleDireccionChange} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg outline-none text-sm bg-white font-medium text-stone-700 shadow-sm">
                    {clienteActivo.direcciones.map((dir, idx) => (
                      <option key={idx} value={dir.id}>{dir.principal} y {dir.secundaria} {dir.zona ? `(${dir.zona})` : ''}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => { setMostrarFormDireccion(true); setDireccionSeleccionada('new'); setCostoEnvio('0.00'); }} className="mt-3 text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800 transition-colors w-full sm:w-auto">
                     <Plus size={14}/> Usar nueva dirección
                  </button>
                </div>
              )}

              {(!clienteActivo?.direcciones?.length || mostrarFormDireccion) && (
                <div className={`space-y-3 w-full ${clienteActivo?.direcciones?.length > 0 ? 'pt-2 border-t border-stone-200 mt-2' : ''}`}>
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Nueva Dirección</span>
                     {clienteActivo?.direcciones?.length > 0 && (
                        <button type="button" onClick={() => { setMostrarFormDireccion(false); setDireccionSeleccionada(clienteActivo.direcciones[0].id.toString()); }} className="text-stone-400 hover:text-stone-700 p-1"><X size={14}/></button>
                     )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    <div className="md:col-span-2"><input type="text" placeholder="Calle Principal" value={datosNuevaDireccion.principal} onChange={e=>setDatosNuevaDireccion({...datosNuevaDireccion, principal: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm bg-white" /></div>
                    <div><input type="text" placeholder="Calle Secundaria" value={datosNuevaDireccion.secundaria} onChange={e=>setDatosNuevaDireccion({...datosNuevaDireccion, secundaria: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm bg-white" /></div>
                    <div>
                      <select value={datosNuevaDireccion.zona} onChange={handleZonaChange} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm bg-white font-medium text-stone-600">
                        <option value="">Zona de Cobertura...</option>
                        {zonas.map(z => <option key={z._docId || z.id} value={z.nombre}>{z.nombre} (${z.costo})</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                       <div className="relative">
                          <span className="absolute left-3 top-2.5 text-[#DF888A]"><Map size={14}/></span>
                          <input type="url" placeholder="Pegar Link directo de Google Maps (Opcional)" value={datosNuevaDireccion.mapaLink} onChange={e=>setDatosNuevaDireccion({...datosNuevaDireccion, mapaLink: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg outline-none text-sm bg-white" />
                       </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center bg-blue-100 p-3 rounded-lg border border-blue-200 mt-4 shadow-inner">
                <span className="text-sm font-bold text-blue-900">Costo del Delivery:</span>
                <div className="relative w-24 sm:w-32">
                  <span className="absolute left-3 top-2 text-blue-600 font-bold">$</span>
                  <input type="number" value={costoEnvio} onChange={e => setCostoEnvio(e.target.value)} className="w-full pl-7 pr-3 py-2 border-none rounded-md outline-none text-sm bg-white font-bold text-blue-900 text-right shadow-sm" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FINANZAS */}
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative z-0 w-full">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#DF888A] rounded-l-2xl"></div>
          <h4 className="font-bold text-[#4A2B29] mb-4">Estructura Financiera</h4>
          
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-stone-100 pt-4">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Subtotal Productos</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold">$</span>
                  {carrito.length > 0 ? (
                     <input type="text" value={subtotalCalculado} readOnly className="w-full pl-7 pr-3 py-2.5 border border-stone-100 rounded-lg outline-none text-sm bg-stone-100 font-bold text-stone-600 cursor-not-allowed" />
                  ) : (
                     <input type="number" value={subtotalManual} onChange={e => setSubtotalManual(e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-stone-200 rounded-lg outline-none text-sm bg-stone-50 font-bold text-[#4A2B29]" />
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block mb-1">Envío</label>
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

            {requiereFactura && (
               <div className="flex justify-between items-center text-blue-700 bg-blue-50 p-3 rounded-lg text-sm border border-blue-100 animate-in fade-in">
                  <span className="font-bold flex items-center gap-1"><Receipt size={14}/> IVA ({ivaPorcentaje}%)</span>
                  <span className="font-black">+${montoIva.toFixed(2)}</span>
               </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block mb-1">Abono Inicial / Pagado</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-600 font-bold">$</span>
                  <input type="number" value={abono} onChange={e => setAbono(e.target.value)} className="w-full pl-7 pr-3 py-2.5 border border-emerald-200 rounded-lg outline-none text-sm bg-emerald-50 font-bold text-emerald-900" />
                </div>
              </div>
              <div className={`p-3 rounded-xl flex flex-col justify-center items-end shadow-inner transition-colors ${parseFloat(saldoPendiente) <= 0 ? 'bg-emerald-600' : 'bg-[#4A2B29]'}`}>
                <span className="font-bold text-stone-300 text-[10px] uppercase tracking-wider">{parseFloat(saldoPendiente) <= 0 ? 'Pagado Completamente' : 'Saldo Pendiente'}</span>
                <span className="text-3xl font-black text-white">${parseFloat(saldoPendiente) <= 0 ? '0.00' : saldoPendiente}</span>
              </div>
            </div>
          </div>
        </div>

        <button type="button" onClick={submit} className="w-full py-4 bg-[#4A2B29] hover:bg-[#3D221F] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-lg mt-4">
          <Save size={20} /> {initialData ? 'Actualizar Operación' : 'Procesar Orden (NoSQL)'}
        </button>

        {requiereFactura && estado === 'Listo' && initialData && (
           <button type="button" onClick={() => window.print()} className="w-full mt-3 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all">
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
  const { data: pedidos, loading } = useFirestoreCollection('pedidos', user, 300);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  
  const pedidosCompletados = pedidos.filter(p => 
    (p.estado === 'Entregado' && parseFloat(p.saldo || 0) <= 0) || p.estado === 'Anulado'
  );

  if (loading) return <div className="animate-pulse p-4">Cargando base de datos distribuida...</div>;

  if (pedidoSeleccionado) {
    const p = pedidoSeleccionado;
    return (
      <div className="animate-in fade-in duration-300 max-w-4xl mx-auto pb-10 w-full">
         <button onClick={() => setPedidoSeleccionado(null)} className="flex items-center gap-2 text-stone-500 hover:text-[#4A2B29] bg-white border border-stone-200 px-4 py-2 rounded-lg mb-6 shadow-sm w-fit">
            <ArrowLeft size={16} /> Volver al Archivo
         </button>
         
         <div className="bg-white p-4 md:p-8 rounded-2xl border border-stone-200 shadow-md relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 ${p.estado === 'Anulado' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 pt-4 border-b border-stone-100 pb-6">
               <div className="w-full overflow-hidden">
                  <h3 className="text-2xl md:text-3xl font-black text-[#4A2B29] tracking-tight truncate break-words">{p.id}</h3>
                  <p className="text-stone-500 font-medium mt-1 text-sm">{p.fecha} • {p.hora}</p>
               </div>
               <div className="flex flex-col sm:items-end w-full sm:w-auto">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-widest border w-fit ${p.estado === 'Anulado' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                     {p.estado}
                  </span>
                  {p.requiereFactura && (
                     <div className="mt-3 flex flex-col sm:items-end gap-2">
                        <div className="text-xs font-bold text-blue-600 flex items-center gap-1"><Receipt size={12}/> Factura SRI Solicitada</div>
                        <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold flex items-center gap-1.5 w-fit"><Receipt size={14}/> Imprimir PDF</button>
                     </div>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
               <div className="w-full overflow-hidden">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Datos del Cliente</h4>
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 h-full">
                     <p className="font-bold text-[#4A2B29] text-lg truncate">{p.cliente}</p>
                     <p className="text-sm text-stone-600 mt-1 flex items-center gap-2 truncate"><Truck size={14}/> {p.tipo} {p.zona && p.zona !== 'Local' ? `(${p.zona})` : ''}</p>
                     {p.direccionText && p.direccionText !== 'Retiro en el local' && <p className="text-xs text-stone-500 mt-2 truncate">{p.direccionText}</p>}
                  </div>
               </div>
               {p.fotoTerminado && (
                  <div className="w-full">
                     <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Evidencia Visual</h4>
                     <img src={p.fotoTerminado} alt="Evidencia" className="w-full h-32 md:h-40 object-cover rounded-xl border border-stone-200 shadow-sm" />
                  </div>
               )}
            </div>

            <div className="mb-8 w-full">
               <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Detalle del Pedido</h4>
               <div className="border border-stone-200 rounded-xl overflow-hidden w-full">
                  <div className="overflow-x-auto w-full">
                     <table className="w-full text-left text-sm min-w-[500px]">
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
            </div>

            {(p.instrucciones || p.llevaCortesia) && (
               <div className="mb-8 bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm">
                  {p.instrucciones && <p className="text-amber-900"><strong className="font-bold">Instrucciones:</strong> {p.instrucciones}</p>}
                  {p.llevaCortesia && <p className="text-amber-900 mt-2"><strong className="font-bold flex items-center gap-1"><Sparkles size={14}/> Cortesía:</strong> {p.detalleCortesia}</p>}
               </div>
            )}

            <div className="border-t border-stone-200 pt-6 flex flex-col items-end w-full">
               <div className="w-full sm:w-64 space-y-2 text-sm bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div className="flex justify-between text-stone-600"><span>Subtotal Base</span><span>${p.subtotal}</span></div>
                  <div className="flex justify-between text-stone-600"><span>Logística</span><span>${p.costoEnvio}</span></div>
                  {p.requiereFactura && <div className="flex justify-between text-blue-600"><span>IVA ({p.ivaPorcentaje}%)</span><span>${p.montoIva}</span></div>}
                  <div className="flex justify-between text-lg font-black text-[#4A2B29] pt-2 border-t border-stone-200 mt-2"><span>Total General</span><span>${p.total}</span></div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-300 w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] tracking-tight">Historial de Pedidos</h3>
          <p className="text-stone-500 text-xs md:text-sm mt-1">Órdenes archivadas o Anuladas.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm min-w-[700px]">
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
                         <span className="flex items-center gap-1 w-fit"><X size={10} /> Anulado</span>
                       ) : (
                         <span className="flex items-center gap-1 w-fit"><CheckCircle size={10} /> Archivado</span>
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
    </div>
  );
}

// ==========================================
// MÓDULO CRM DE CLIENTES 
// ==========================================
function ClientesModule({ user }) {
  const { data: clientes, loading: cLoad, addDocData, updateDocData, deleteDocData } = useFirestoreCollection('clientes', user);
  const { data: pedidos } = useFirestoreCollection('pedidos', user, 300);
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
    if (cliente) { setFormData({ ...cliente }); } else { setFormData({ nombre: '', telefono: '', cedula: '', email: '', cumpleanos: '', direcciones: [] }); }
    setNuevaDir({ principal: '', secundaria: '', zona: '', mapaLink: '' });
    setView('profile');
  };

  const guardarPerfil = async () => {
    if (!formData.nombre) { showFeedback("El nombre es obligatorio.", "error"); return; }
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

  const eliminarCliente = async (docId) => { await deleteDocData(docId); };

  const addDireccionToForm = () => {
    if (!nuevaDir.principal || !nuevaDir.zona) { showFeedback("Calle principal y Zona son obligatorias.", "error"); return; }
    const nuevasDirecciones = [...(formData.direcciones || []), { id: Date.now().toString(), ...nuevaDir }];
    setFormData({ ...formData, direcciones: nuevasDirecciones });
    setNuevaDir({ principal: '', secundaria: '', zona: '', mapaLink: '' });
  };

  if (cLoad) return <div className="animate-pulse p-4">Cargando CRM...</div>;

  if (view === 'profile' && formData) {
    const historial = formData.nombre ? pedidos.filter(p => p.cliente === formData.nombre) : [];
    const tag = getCategoria(formData);

    return (
      <div className="animate-in fade-in duration-300 pb-10 w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 w-full">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button onClick={() => setView('list')} className="p-2 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg text-stone-500 shadow-sm shrink-0"><ChevronRight size={20} className="rotate-180" /></button>
            <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] flex items-center gap-2 truncate">
              {formData._docId ? 'Perfil Cliente' : 'Nuevo Cliente'}
              {formData._docId && <span className={`hidden md:inline-block px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider ${tag.classes}`}>{tag.label}</span>}
            </h3>
          </div>
          <button onClick={guardarPerfil} className="w-full sm:w-auto bg-[#4A2B29] hover:bg-[#3D221F] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm"><Save size={18} /> Guardar Perfil</button>
        </div>

        {feedback && (
          <div className={`mb-6 w-full p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 ${feedback.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
             {feedback.type === 'error' ? <Zap size={18} className="shrink-0"/> : <CheckCircle size={18} className="shrink-0"/>}
             {feedback.msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          <div className="lg:col-span-4 space-y-6 w-full">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#4A2B29]"></div>
              <h4 className="font-bold text-[#4A2B29] mb-5 flex items-center gap-2"><Users size={18} className="text-stone-400"/> Datos Personales</h4>
              <div className="space-y-4">
                <div><label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Nombre Completo *</label><input type="text" value={formData.nombre} onChange={e=>setFormData({...formData, nombre: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29] font-medium" /></div>
                <div><label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Cédula / RUC</label><input type="text" value={formData.cedula || ''} onChange={e=>setFormData({...formData, cedula: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29]" /></div>
                <div><label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Teléfono</label><input type="text" value={formData.telefono || ''} onChange={e=>setFormData({...formData, telefono: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29]" /></div>
                <div><label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Email</label><input type="email" value={formData.email || ''} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-[#4A2B29]" /></div>
                <div className="pt-2 border-t border-stone-100">
                  <label className="text-[10px] font-bold text-[#DF888A] uppercase block mb-1 flex items-center gap-1"><CalendarDays size={12}/> Cumpleaños</label>
                  <input type="date" value={formData.cumpleanos || ''} onChange={e=>setFormData({...formData, cumpleanos: e.target.value})} className="w-full px-3 py-2 bg-[#FFF9F8] border border-[#F2E8E6] text-[#4A2B29] rounded-lg outline-none focus:ring-2 focus:ring-[#DF888A] font-medium" />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6 w-full">
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#DF888A]"></div>
              <h4 className="font-bold text-[#4A2B29] mb-2 flex items-center gap-2"><MapPin size={18} className="text-stone-400"/> Direcciones</h4>
              
              <div className="bg-[#FFF9F8] border border-[#F2E8E6] p-4 rounded-xl mb-4 w-full">
                 <h5 className="text-[10px] font-bold text-[#DF888A] uppercase mb-3 flex items-center gap-1"><Plus size={12}/> Añadir Dirección</h5>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 w-full">
                    <div className="md:col-span-2"><input type="text" placeholder="Calle Principal" value={nuevaDir.principal} onChange={e=>setNuevaDir({...nuevaDir, principal: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none text-sm bg-white" /></div>
                    <div><input type="text" placeholder="Calle Secundaria" value={nuevaDir.secundaria} onChange={e=>setNuevaDir({...nuevaDir, secundaria: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none text-sm bg-white" /></div>
                    <div>
                      <select value={nuevaDir.zona} onChange={e=>setNuevaDir({...nuevaDir, zona: e.target.value})} className="w-full px-3 py-2 border rounded-lg outline-none text-sm bg-white">
                        <option value="">Zona...</option>
                        {zonas.map(z => <option key={z._docId || z.id} value={z.nombre}>{z.nombre}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                       <div className="relative">
                          <span className="absolute left-3 top-2.5 text-[#DF888A]"><Map size={14}/></span>
                          <input type="url" placeholder="Link Google Maps (Opcional)" value={nuevaDir.mapaLink} onChange={e=>setNuevaDir({...nuevaDir, mapaLink: e.target.value})} className="w-full pl-9 pr-3 py-2 border rounded-lg outline-none text-sm bg-white" />
                       </div>
                    </div>
                 </div>
                 <button onClick={addDireccionToForm} className="bg-[#4A2B29] text-white px-4 py-2 rounded-lg text-xs font-bold w-full sm:w-auto">Guardar Dirección</button>
              </div>

              {(!formData.direcciones || formData.direcciones.length === 0) ? (
                <div className="text-sm text-stone-400 italic bg-stone-50 p-6 rounded-xl text-center border border-dashed">Sin direcciones registradas.</div>
              ) : (
                <div className="space-y-3 w-full">
                  {formData.direcciones.map((dir, index) => (
                    <div key={dir.id || index} className="bg-stone-50 p-3 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                       <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-stone-800 truncate">{dir.principal} y {dir.secundaria}</p>
                          <p className="text-xs text-stone-500 mb-1">Zona: {dir.zona}</p>
                          {dir.mapaLink && <a href={dir.mapaLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded w-fit"><Map size={10}/> Abrir Maps</a>}
                       </div>
                       <button onClick={() => setFormData({...formData, direcciones: formData.direcciones.filter(d => d.id !== dir.id)})} className="text-rose-400 p-2 shrink-0 self-end sm:self-auto"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden w-full">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
              <h4 className="font-bold text-[#4A2B29] mb-5 flex items-center gap-2"><History size={18} className="text-stone-400"/> Historial de Relaciones</h4>
              {historial.length === 0 ? (
                <div className="text-sm text-stone-400 italic bg-stone-50 p-6 rounded-xl text-center border border-dashed">No hay compras registradas.</div>
              ) : (
                <div className="border rounded-xl overflow-hidden shadow-sm overflow-x-auto w-full">
                  <table className="w-full text-left text-sm min-w-[400px]">
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
    <div className="animate-in fade-in duration-300 w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] tracking-tight">Directorio CRM</h3>
        <button onClick={() => abrirPerfil(null)} className="w-full sm:w-auto bg-[#4A2B29] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md"><Plus size={18}/> Nuevo Documento</button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm min-w-[700px]">
            <thead className="bg-[#FFF9F8] text-stone-500 text-[10px] uppercase tracking-widest">
              <tr><th className="p-4 font-bold border-b">ID / Nombre</th><th className="p-4 font-bold border-b">Contacto</th><th className="p-4 font-bold border-b">Cumpleaños</th><th className="p-4 font-bold border-b">Segmento</th><th className="p-4 font-bold border-b text-center">Acciones</th></tr>
            </thead>
            <tbody>
              {clientes.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-stone-400">Colección vacía.</td></tr>}
              {clientes.map(c => {
                const tag = getCategoria(c);
                return (
                  <tr key={c._docId || c.id} className="border-b hover:bg-stone-50 group">
                    <td className="p-4 cursor-pointer" onClick={() => abrirPerfil(c)}>
                       <div className="font-bold text-[#4A2B29]">{c.nombre}</div>
                       <div className="text-[10px] text-stone-400 font-mono mt-0.5">{c.id}</div>
                    </td>
                    <td className="p-4 text-stone-600 font-medium">{c.telefono || '---'}</td>
                    <td className="p-4">
                       {c.cumpleanos ? <span className="flex items-center gap-1.5 text-xs text-[#DF888A] bg-[#FFF9F8] px-2 py-1 rounded font-bold border w-fit"><CalendarDays size={12}/> {c.cumpleanos}</span> : <span className="text-xs text-stone-300">---</span>}
                    </td>
                    <td className="p-4"><span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border w-fit block ${tag.classes}`}>{tag.label}</span></td>
                    <td className="p-4 text-center flex justify-center">
                       {confirmDeleteId === c._docId ? (
                          <button onClick={() => { window.setTimeout(()=>eliminarCliente(c._docId),0); setConfirmDeleteId(null); }} className="text-white bg-rose-500 px-3 py-1.5 rounded-lg text-xs font-bold">Confirmar</button>
                       ) : (
                          <button onClick={() => setConfirmDeleteId(c._docId)} className="text-stone-300 hover:text-rose-600 p-2"><Trash2 size={16}/></button>
                       )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

  return (
    <div className="animate-in fade-in duration-300 w-full">
      <div className="mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] tracking-tight">Geolocalización</h3>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl border shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-end w-full">
        <div className="flex-1 w-full"><label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Nombre de la Zona</label><input type="text" value={nuevaZona.nombre} onChange={e=>setNuevaZona({...nuevaZona, nombre: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none" /></div>
        <div className="w-full md:w-32"><label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Costo ($)</label><input type="number" value={nuevaZona.costo} onChange={e=>setNuevaZona({...nuevaZona, costo: e.target.value})} className="w-full px-4 py-2 border rounded-lg outline-none font-bold" /></div>
        <button onClick={() => { if(nuevaZona.nombre && nuevaZona.costo) { addDocData({ nombre: nuevaZona.nombre, costo: parseFloat(nuevaZona.costo) }); setNuevaZona({ nombre: '', costo: '' }); } }} className="w-full md:w-auto bg-[#4A2B29] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 h-[42px]"><Plus size={16}/> Insertar</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {zonas.map(zona => (
          <div key={zona._docId} className={`p-4 md:p-5 rounded-xl border shadow-sm relative group ${editandoId === zona._docId ? 'bg-[#FFF9F8] border-[#DF888A]' : 'bg-white'}`}>
            <div className="absolute top-4 right-4 flex gap-2">
               {editandoId === zona._docId ? (
                  <button onClick={() => { updateDocData(zona._docId, { nombre: zonaEdit.nombre, costo: parseFloat(zonaEdit.costo) }); setEditandoId(null); }} className="text-emerald-600 bg-emerald-100 p-1.5 rounded"><Save size={14}/></button>
               ) : (
                  <div className="flex gap-2">
                     <button onClick={() => { setEditandoId(zona._docId); setZonaEdit({ nombre: zona.nombre, costo: zona.costo }); }} className="text-stone-400 md:opacity-0 group-hover:opacity-100"><Edit3 size={14}/></button>
                     <button onClick={() => deleteDocData(zona._docId)} className="text-stone-400 hover:text-rose-500 md:opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                  </div>
               )}
            </div>
            
            <div className="flex items-center gap-3 mb-3 pr-10">
              <div className="p-2 bg-[#FFF9F8] text-[#DF888A] rounded-lg shrink-0"><MapPin size={20}/></div>
              {editandoId === zona._docId ? <input type="text" value={zonaEdit.nombre} onChange={e => setZonaEdit({...zonaEdit, nombre: e.target.value})} className="font-bold border px-2 py-1 rounded outline-none w-full" /> : <h4 className="font-bold text-stone-800 truncate">{zona.nombre}</h4>}
            </div>
            <div className="pt-3 border-t flex justify-between items-center">
              <span className="text-[10px] font-bold text-stone-400 uppercase">Tarifa:</span>
              {editandoId === zona._docId ? <input type="number" value={zonaEdit.costo} onChange={e => setZonaEdit({...zonaEdit, costo: e.target.value})} className="font-black text-lg border px-2 py-1 rounded outline-none w-24 text-right" /> : <div className="font-black text-[#4A2B29] text-lg">${parseFloat(zona.costo).toFixed(2)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO PRODUCTOS (CON CATEGORÍAS CRUD)
// ==========================================
function ProductosModule({ user }) {
   // === MODIFICACIÓN: AÑADIDO updateProd Y addCosto ===
   const { data: productos, addDocData, deleteDocData, updateDocData: updateProd } = useFirestoreCollection('productos', user);
   // === INICIO MODIFICACIÓN: AÑADIDO costosData y updateCosto ===
  const { data: costosData, addDocData: addCosto, updateDocData: updateCosto } = useFirestoreCollection('costos', user); 
  // === FIN MODIFICACIÓN === 
   const { data: atributosPrecio, addDocData: addAtr, deleteDocData: deleteAtr, updateDocData: updateAtr } = useFirestoreCollection('atributos_precio', user);
   const { data: categoriasDB, addDocData: addCatDB, deleteDocData: deleteCatDB, updateDocData: updateCatDB } = useFirestoreCollection('categorias_productos', user);
   
   const [subTab, setSubTab] = useState('categorias'); 
   
   const [nuevaCat, setNuevaCat] = useState('');
   const [editCatId, setEditCatId] = useState(null);
   const [editCatVal, setEditCatVal] = useState('');
 
   const [nuevoProd, setNuevoProd] = useState({ categoria: '', nombre: '', atributosStr: '' });
   
   // === ESTADOS PARA EDITAR PRODUCTOS ===
   const [editProdId, setEditProdId] = useState(null);
   const [editProdVal, setEditProdVal] = useState({ nombre: '', atributosStr: '' });
 
   // === MODIFICACIÓN: AÑADIDO categoriaAtr (Clase General) ===
   const [nuevoAtr, setNuevoAtr] = useState({ categoriaAtr: '', nombre: '', precio: '' });
   const [editAtrId, setEditAtrId] = useState(null);
   const [editAtrVal, setEditAtrVal] = useState({ categoriaAtr: '', nombre: '', precio: '' });
 

  return (
    <div className="animate-in fade-in duration-300 w-full">
      <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] tracking-tight mb-6">Arquitectura de Producto</h3>
      
      <div className="flex flex-col sm:flex-row gap-2 p-1 bg-stone-200 rounded-xl mb-6 md:mb-8 w-full md:w-fit">
         <button onClick={() => setSubTab('categorias')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'categorias' ? 'bg-white shadow-sm text-[#4A2B29]' : 'text-stone-500 hover:text-stone-700'}`}>1. Categorías</button>
         <button onClick={() => setSubTab('productos')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'productos' ? 'bg-white shadow-sm text-[#4A2B29]' : 'text-stone-500 hover:text-stone-700'}`}>2. Productos</button>
         <button onClick={() => setSubTab('precios')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'precios' ? 'bg-[#DF888A] shadow-sm text-white' : 'text-stone-500 hover:text-stone-700'}`}>3. Diccionario</button>
      </div>

      {/* PESTAÑA CATEGORÍAS */}
      {subTab === 'categorias' && (
         <div className="max-w-3xl w-full">
            <div className="bg-[#FFF9F8] p-4 md:p-6 rounded-2xl border shadow-sm mb-6 flex flex-col md:flex-row gap-3">
               <input type="text" value={nuevaCat} onChange={e=>setNuevaCat(e.target.value)} placeholder="Nueva Categoría Principal..." className="flex-1 px-4 py-2 border rounded-lg outline-none font-medium w-full" />
               <button onClick={() => { if(nuevaCat.trim()) { addCatDB({nombre: nuevaCat.trim()}); setNuevaCat(''); } }} className="w-full md:w-auto bg-[#DF888A] hover:bg-[#C97779] text-white px-5 py-2 rounded-lg font-bold flex justify-center items-center gap-2 h-[42px]"><Plus size={16}/> Guardar</button>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden w-full">
               <div className="overflow-x-auto w-full">
                 <table className="w-full text-left text-sm min-w-[400px]">
                   <thead className="bg-[#FFF9F8] text-stone-500 text-[10px] uppercase tracking-widest">
                     <tr><th className="p-4 border-b">Nombre de Categoría</th><th className="p-4 border-b text-center w-24">Acción</th></tr>
                   </thead>
                   <tbody>
                     {categoriasDB.length === 0 && <tr><td colSpan="2" className="p-8 text-center text-stone-400">Sin categorías creadas.</td></tr>}
                     {categoriasDB.map(cat => (
                       <tr key={cat._docId} className="border-b hover:bg-stone-50 group">
                         <td className="p-4 font-bold text-[#4A2B29] text-base">
                            {editCatId === cat._docId ? (
                               <input type="text" value={editCatVal} onChange={e=>setEditCatVal(e.target.value)} className="w-full border border-[#DF888A] px-3 py-1.5 rounded outline-none" />
                            ) : cat.nombre}
                         </td>
                         <td className="p-4 text-center">
                            {editCatId === cat._docId ? (
                               <button onClick={async () => { await updateCatDB(cat._docId, {nombre: editCatVal}); setEditCatId(null); }} className="text-emerald-600 bg-emerald-100 p-2 rounded-lg mx-auto block"><Save size={16}/></button>
                            ) : (
                               <div className="flex justify-center gap-2">
                                  <button onClick={() => {setEditCatId(cat._docId); setEditCatVal(cat.nombre);}} className="text-stone-400 hover:text-[#DF888A] md:opacity-0 group-hover:opacity-100"><Edit3 size={16}/></button>
                                  <button onClick={() => deleteCatDB(cat._docId)} className="text-stone-400 hover:text-rose-500 md:opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
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
      )}

      {/* PESTAÑA PRODUCTOS */}
      {subTab === 'productos' && (
         <div className="w-full">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm mb-8 flex flex-col md:flex-row gap-3 border w-full">
              <select value={nuevoProd.categoria} onChange={e=>setNuevoProd({...nuevoProd, categoria: e.target.value})} className="w-full md:w-48 px-3 py-2 border rounded-lg outline-none font-medium bg-stone-50">
                 <option value="">Categoría Padre...</option>
                 {categoriasDB.map(c => <option key={c._docId} value={c.nombre}>{c.nombre}</option>)}
              </select>
              <input type="text" value={nuevoProd.nombre} onChange={e=>setNuevoProd({...nuevoProd, nombre: e.target.value})} placeholder="Nombre de Subcategoría..." className="w-full md:flex-1 px-4 py-2 border rounded-lg outline-none font-medium" />
              <input type="text" value={nuevoProd.atributosStr} onChange={e=>setNuevoProd({...nuevoProd, atributosStr: e.target.value})} placeholder="Atributos requeridos (Separados por coma)..." className="w-full md:flex-1 px-4 py-2 border rounded-lg outline-none text-sm" />
              <button onClick={() => { 
    if(nuevoProd.nombre && nuevoProd.categoria) { 
        const prodName = nuevoProd.nombre.trim();
        addDocData({ categoria: nuevoProd.categoria, nombre: prodName, atributos: nuevoProd.atributosStr.split(',').map(s=>s.trim()).filter(s=>s) }); 
        // === MAGIA: AUTO-CREA LA RECETA EN COSTOS ===
        addCosto({ producto: prodName, ingredientes: [], costoTotal: 0 }); 
        setNuevoProd({categoria:'', nombre:'', atributosStr:''}); 
    } 
}} className="w-full md:w-auto bg-[#4A2B29] text-white px-5 py-2 rounded-lg font-bold flex justify-center items-center gap-2 h-[42px]"><Plus size={16}/> Insertar</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {categoriasDB.map(cat => {
                 const prodsInCat = productos.filter(p => p.categoria === cat.nombre);
                 if (prodsInCat.length === 0) return null;
                 return (
                   <div key={cat._docId} className="bg-white p-5 rounded-xl border shadow-sm w-full overflow-hidden">
                     <h4 className="font-bold text-[#4A2B29] text-lg mb-4 border-b pb-2 flex items-center gap-2"><Cake size={16} className="text-[#DF888A] shrink-0"/>{cat.nombre}</h4>
                     <div className="space-y-3">
                     {prodsInCat.map(prod => (
                          <div key={prod._docId} className="p-3 bg-stone-50 rounded-lg border flex justify-between items-start group">
                             <div className="pr-2 overflow-hidden w-full">
                                {editProdId === prod._docId ? (
                                   <div className="flex flex-col gap-2 w-full pr-2">
                                      <input type="text" value={editProdVal.nombre} onChange={e=>setEditProdVal({...editProdVal, nombre: e.target.value})} className="w-full border border-[#DF888A] px-2 py-1 text-sm rounded font-bold outline-none" placeholder="Nombre" />
                                      <input type="text" value={editProdVal.atributosStr} onChange={e=>setEditProdVal({...editProdVal, atributosStr: e.target.value})} className="w-full border border-[#DF888A] px-2 py-1 text-xs rounded outline-none" placeholder="Ej: Sabor, Relleno..." />
                                      <button onClick={async () => { 
    await updateProd(prod._docId, { nombre: editProdVal.nombre, atributos: editProdVal.atributosStr.split(',').map(s=>s.trim()).filter(s=>s) }); 
    // === INICIO SINCRONIZACIÓN EN CASCADA CON FINANZAS ===
    if (prod.nombre !== editProdVal.nombre && costosData) {
        const receta = costosData.find(c => c.producto === prod.nombre);
        if (receta) {
            await updateCosto(receta._docId, { producto: editProdVal.nombre });
        }
    }
    // === FIN SINCRONIZACIÓN ===
    setEditProdId(null); 
}} className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded text-xs font-bold w-fit mt-1"><Save size={14} className="inline mr-1"/>Guardar Edición</button>

                                   </div>
                                ) : (
                                   <>
                                      <p className="font-bold text-sm text-stone-800 truncate">{prod.nombre}</p>
                                      <div className="flex flex-wrap gap-1 mt-2">
                                         {prod.atributos?.length > 0 ? prod.atributos.map(attr => (
                                            <span key={attr} className="text-[9px] uppercase tracking-wider font-bold bg-white border px-1.5 py-0.5 rounded break-all">{attr}</span>
                                         )) : <span className="text-[9px] italic text-stone-400">Sin atributos</span>}
                                      </div>
                                   </>
                                )}
                             </div>
                             {editProdId !== prod._docId && (
                                <div className="flex justify-center gap-2 shrink-0">
                                   <button onClick={() => { setEditProdId(prod._docId); setEditProdVal({nombre: prod.nombre, atributosStr: prod.atributos?.join(', ') || ''}); }} className="text-stone-300 hover:text-[#DF888A] md:opacity-0 group-hover:opacity-100 p-1"><Edit3 size={14}/></button>
                                   <button onClick={() => deleteDocData(prod._docId)} className="text-stone-300 hover:text-rose-500 md:opacity-0 group-hover:opacity-100 p-1"><Trash2 size={14}/></button>
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

      {/* PESTAÑA DICCIONARIO */}
      {subTab === 'precios' && (
         <div className="max-w-4xl w-full">
            <div className="bg-[#FFF9F8] p-4 md:p-6 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-3 border border-[#F2E8E6]">
               <div className="w-full md:w-1/3"><label className="text-[10px] font-bold text-[#DF888A] uppercase block mb-1">Clase Gral. (Ej: Relleno)</label><input type="text" value={nuevoAtr.categoriaAtr} onChange={e=>setNuevoAtr({...nuevoAtr, categoriaAtr: e.target.value})} placeholder="Clasificación..." className="w-full px-4 py-2 border rounded-lg font-medium outline-none" /></div>
               <div className="flex-1 w-full"><label className="text-[10px] font-bold text-[#DF888A] uppercase block mb-1">Nombre Exacto (Ej: Nutella)</label><input type="text" value={nuevoAtr.nombre} onChange={e=>setNuevoAtr({...nuevoAtr, nombre: e.target.value})} className="w-full px-4 py-2 border rounded-lg font-medium outline-none" /></div>
               <div className="w-full md:w-32"><label className="text-[10px] font-bold text-[#DF888A] uppercase block mb-1">Costo Extra ($)</label><input type="number" value={nuevoAtr.precio} onChange={e=>setNuevoAtr({...nuevoAtr, precio: e.target.value})} className="w-full px-4 py-2 border rounded-lg font-black text-[#4A2B29] outline-none" /></div>
               <button onClick={() => { if(nuevoAtr.nombre) { addAtr({categoriaAtr: nuevoAtr.categoriaAtr.trim(), nombre: nuevoAtr.nombre.trim(), precio: parseFloat(nuevoAtr.precio)}); setNuevoAtr({categoriaAtr:'', nombre:'', precio:''}); } }} className="w-full md:w-auto bg-[#DF888A] hover:bg-[#D48587] text-white px-5 py-2 rounded-lg font-bold flex justify-center items-center gap-2 h-[42px] mt-auto"><Save size={16}/>Fijar Precio</button>
            </div>
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden w-full">
               <div className="overflow-x-auto w-full">
                 <table className="w-full text-left text-sm min-w-[500px]">
                   <thead className="bg-[#FFF9F8] text-stone-500 text-[10px] uppercase tracking-widest">
                     <tr><th className="p-4 border-b">Atributo Global</th><th className="p-4 border-b text-right">Precio Añadido</th><th className="p-4 border-b text-center">Acción</th></tr>
                   </thead>
                   <tbody>
                     {atributosPrecio.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-stone-400">Diccionario vacío.</td></tr>}
                     {atributosPrecio.map(atr => (
                       <tr key={atr._docId} className="border-b hover:bg-stone-50 group">
                         <td className="p-4">
                            {editAtrId === atr._docId ? (
                               <div className="flex flex-col gap-1">
                                  <input type="text" value={editAtrVal.categoriaAtr} onChange={e=>setEditAtrVal({...editAtrVal, categoriaAtr: e.target.value})} className="w-full border border-stone-300 px-2 py-1 text-[10px] rounded outline-none text-stone-500 uppercase" placeholder="Clase General (Opcional)" />
                                  <input type="text" value={editAtrVal.nombre} onChange={e=>setEditAtrVal({...editAtrVal, nombre: e.target.value})} className="w-full border border-stone-300 px-2 py-1.5 text-sm rounded outline-none font-bold" />
                               </div>
                            ) : (
                               <>
                                  {atr.categoriaAtr && <div className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-0.5">{atr.categoriaAtr}</div>}
                                  <div className="font-bold text-[#4A2B29]">{atr.nombre}</div>
                               </>
                            )}
                         </td>
                         <td className="p-4 text-right">
                            {editAtrId === atr._docId ? (
                               <input type="number" value={editAtrVal.precio} onChange={e=>setEditAtrVal({...editAtrVal, precio: e.target.value})} className="w-20 border border-stone-300 px-2 py-1.5 text-sm text-right rounded outline-none font-bold float-right" />
                            ) : <span className="font-black text-[#DF888A] text-lg">+${parseFloat(atr.precio).toFixed(2)}</span>}
                         </td>
                         <td className="p-4 text-center">
                            {editAtrId === atr._docId ? (
                               <button onClick={async () => { await updateAtr(atr._docId, {categoriaAtr: editAtrVal.categoriaAtr.trim(), nombre: editAtrVal.nombre.trim(), precio: parseFloat(editAtrVal.precio)}); setEditAtrId(null); }} className="text-emerald-600 bg-emerald-100 p-2 rounded-lg mx-auto block mt-1"><Save size={16}/></button>
                            ) : (
                               <div className="flex justify-center gap-2">
                                  <button onClick={() => { setEditAtrId(atr._docId); setEditAtrVal({categoriaAtr: atr.categoriaAtr || '', nombre: atr.nombre, precio: atr.precio}); }} className="text-stone-400 hover:text-[#DF888A] md:opacity-0 group-hover:opacity-100"><Edit3 size={16}/></button>
                                  <button onClick={() => deleteAtr(atr._docId)} className="text-stone-400 hover:text-rose-500 md:opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
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
      )}
    </div>
  );
}

// ==========================================
// MÓDULO INVENTARIO CON IA (RESPONSIVO Y ORIGINAL)
// ==========================================
function InventarioModule({ user }) {
  const { data: inventario, addDocData, updateDocData, deleteDocData } = useFirestoreCollection('inventario', user);
  
  const [nuevoItem, setNuevoItem] = useState({ item: '', tipo: 'Materia Prima', stock: '', unidad: 'kg', costoTotal: '', tienda: '' });
  const [editandoId, setEditandoId] = useState(null);
  const [invEdit, setInvEdit] = useState({});

  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);

  const agregar = async () => { 
    if(nuevoItem.item && nuevoItem.stock && nuevoItem.costoTotal) {
      await addDocData({ item: nuevoItem.item, tipo: nuevoItem.tipo, stock: parseFloat(nuevoItem.stock), unidad: nuevoItem.unidad, costoTotal: parseFloat(nuevoItem.costoTotal), tienda: nuevoItem.tienda, estado: parseFloat(nuevoItem.stock) > 0 ? 'Óptimo' : 'Comprar' });
      setNuevoItem({ item: '', tipo: 'Materia Prima', stock: '', unidad: 'kg', costoTotal: '', tienda: '' }); 
    } else {
      alert("Completar Nombre, Stock y Costo Total.");
    }
  };

  const guardarScannedItems = async () => {
     for (const item of scannedItems) {
        const existing = inventario.find(i => i.item.trim().toLowerCase() === item.item.trim().toLowerCase());
        if (existing) {
           await updateDocData(existing._docId, { stock: existing.stock + item.cantidad, costoTotal: (existing.costoTotal || 0) + item.costoTotalLote, estado: (existing.stock + item.cantidad) > 10 ? 'Óptimo' : 'Comprar' });
        } else {
           await addDocData({ item: item.item, tipo: 'Materia Prima', stock: item.cantidad, unidad: item.unidad || 'u', costoTotal: item.costoTotalLote, tienda: 'Ingreso IA', estado: 'Óptimo' });
        }
     }
     setScannedItems([]);
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0]; 
    if (!file) return;
    setIsScanning(true);
    const reader = new FileReader(); 
    reader.readAsDataURL(file);
    reader.onload = async (ev) => {
       try {
          const res = await extractInvoiceData(ev.target.result.split(',')[1], file.type);
          if (res?.items) setScannedItems(res.items);
       } catch (err) { console.error(err); alert("Error de conexión IA."); }
       finally { setIsScanning(false); e.target.value = null; }
    };
  };

  const iniciarEdicion = (inv) => {
     setEditandoId(inv._docId);
     setInvEdit({ item: inv.item, stock: inv.stock, unidad: inv.unidad || 'kg', costoTotal: inv.costoTotal || 0, tienda: inv.tienda || '' });
  };

  const guardarEdicion = async (docId) => {
     await updateDocData(docId, { item: invEdit.item, stock: parseFloat(invEdit.stock), unidad: invEdit.unidad, costoTotal: parseFloat(invEdit.costoTotal), tienda: invEdit.tienda, estado: parseFloat(invEdit.stock) > 0 ? 'Óptimo' : 'Comprar' });
     setEditandoId(null);
  };

  const matPrimas = inventario.filter(i => i.tipo === 'Materia Prima');
  const otrosInsumos = inventario.filter(i => i.tipo !== 'Materia Prima');

  return (
    <div className="animate-in fade-in duration-300 pb-10 w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6 w-full">
         <div>
            <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] tracking-tight">Almacén y Proveedores</h3>
            <p className="text-stone-500 text-xs md:text-sm mt-1">Control manual o escáner IA.</p>
         </div>
         <label className={`cursor-pointer w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-md transition-all ${isScanning ? 'bg-stone-200 text-stone-500' : 'bg-gradient-to-r from-[#DF888A] to-[#C97779] text-white'}`}>
            {isScanning ? <><Zap size={16} className="animate-pulse"/> Analizando...</> : <><ScanSearch size={16} /> Escanear Factura (IA)</>}
            <input type="file" accept="image/*" className="hidden" onChange={handleInvoiceUpload} disabled={isScanning} />
         </label>
      </div>

      {scannedItems.length > 0 && (
         <div className="bg-[#FFF9F8] border border-[#F2E8E6] p-4 md:p-6 rounded-2xl shadow-sm mb-8 w-full animate-in slide-in-from-top-4">
            <h4 className="font-black text-[#4A2B29] mb-4 flex items-center gap-2"><Bot size={20} className="text-[#DF888A]"/> Resultados IA</h4>
            <div className="overflow-x-auto w-full mb-4 border rounded-xl bg-white">
               <table className="w-full text-left text-sm min-w-[500px]">
                 <thead className="bg-stone-50 text-[10px] uppercase">
                   <tr><th className="p-3">Ítem Identificado</th><th className="p-3 text-center">Cant</th><th className="p-3 text-center">Unidad</th><th className="p-3 text-right">Costo Lote (Inc. IVA)</th></tr>
                 </thead>
                 <tbody>
                   {scannedItems.map((item, idx) => (
                     <tr key={idx} className="border-b">
                       <td className="p-3 font-bold">{item.item}</td>
                       <td className="p-3 text-center font-medium">{item.cantidad}</td>
                       <td className="p-3 text-center"><span className="text-[10px] bg-[#FFF9F8] text-[#DF888A] px-2 rounded font-bold">{item.unidad}</span></td>
                       <td className="p-3 text-right font-black text-[#4A2B29]">${parseFloat(item.costoTotalLote).toFixed(2)}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
              <button onClick={() => setScannedItems([])} className="w-full sm:w-auto px-4 py-2 text-stone-500 font-bold bg-white rounded-lg border">Descartar</button>
              <button onClick={guardarScannedItems} className="w-full sm:w-auto px-6 py-2 bg-[#4A2B29] text-white font-bold rounded-lg">Guardar en Almacén</button>
            </div>
         </div>
      )}
      
      <div className="bg-white p-4 md:p-6 rounded-2xl border shadow-sm mb-8 w-full">
         <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Registro Manual</h4>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 items-end">
           <div className="sm:col-span-2">
             <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Tipo</label>
             <select value={nuevoItem.tipo} onChange={e=>setNuevoItem({...nuevoItem, tipo: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-stone-50 outline-none focus:ring-2 focus:ring-[#DF888A]">
               <option value="Materia Prima">Materia Prima</option>
               <option value="Empaques">Empaques</option>
             </select>
           </div>
           <div className="sm:col-span-2 md:col-span-2">
             <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Nombre Insumo</label>
             <input type="text" value={nuevoItem.item} onChange={e=>setNuevoItem({...nuevoItem, item: e.target.value})} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#DF888A]" />
           </div>
           <div className="sm:col-span-2 md:col-span-2">
             <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Proveedor / Tienda</label>
             <input type="text" value={nuevoItem.tienda} onChange={e=>setNuevoItem({...nuevoItem, tienda: e.target.value})} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#DF888A]" />
           </div>
           <div className="sm:col-span-2 flex gap-2">
             <div className="flex-1">
               <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Stock</label>
               <input type="number" value={nuevoItem.stock} onChange={e=>setNuevoItem({...nuevoItem, stock: e.target.value})} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#DF888A]" />
             </div>
             <div className="w-24">
               <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Unidad</label>
               <UnidadesSelect value={nuevoItem.unidad} onChange={e=>setNuevoItem({...nuevoItem, unidad: e.target.value})} className="w-full p-2 border rounded-lg text-sm bg-stone-50 outline-none" />
             </div>
           </div>
           <div className="sm:col-span-2">
             <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Costo Total ($)</label>
             <input type="number" value={nuevoItem.costoTotal} onChange={e=>setNuevoItem({...nuevoItem, costoTotal: e.target.value})} className="w-full p-2 border rounded-lg text-sm font-bold text-[#4A2B29] outline-none focus:ring-2 focus:ring-[#DF888A]" />
           </div>
           <div className="sm:col-span-2">
             <button onClick={agregar} className="w-full bg-[#4A2B29] text-white py-2 rounded-lg font-bold flex justify-center items-center gap-2 h-[38px]"><Plus size={16}/> Guardar</button>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
         <div className="w-full overflow-hidden">
            <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2"><Boxes size={18}/>Materia Prima</h4>
            <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-x-auto w-full">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-emerald-50 text-[10px] uppercase tracking-widest text-emerald-700">
                  <tr><th className="p-3 border-b border-emerald-100">Insumo</th><th className="p-3 border-b border-emerald-100 text-center">Físico</th><th className="p-3 border-b border-emerald-100 text-right">Lote</th><th className="p-3 border-b border-emerald-100 text-center">Acciones</th></tr>
                </thead>
                <tbody>
                  {matPrimas.length===0 && <tr><td colSpan="4" className="p-4 text-center text-emerald-600/50">Vacío</td></tr>}
                  {matPrimas.map(inv => (
                    <tr key={inv._docId} className="border-b border-stone-100 hover:bg-stone-50 group">
                      <td className="p-3">
                         {editandoId === inv._docId ? (
                            <div className="flex flex-col gap-1 w-full">
                              <input type="text" value={invEdit.item} onChange={e=>setInvEdit({...invEdit, item: e.target.value})} className="w-full border border-emerald-300 px-2 py-1 text-xs rounded" />
                              <input type="text" value={invEdit.tienda} onChange={e=>setInvEdit({...invEdit, tienda: e.target.value})} className="w-full border border-emerald-300 px-2 py-1 text-[10px] rounded" placeholder="Proveedor" />
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
                               <input type="number" value={invEdit.stock} onChange={e=>setInvEdit({...invEdit, stock: e.target.value})} className="w-12 border border-emerald-300 px-1 py-1 text-xs text-center rounded" />
                               <UnidadesSelect value={invEdit.unidad} onChange={e=>setInvEdit({...invEdit, unidad: e.target.value})} className="border border-emerald-300 px-1 py-1 text-xs rounded w-14" />
                            </div>
                         ) : (
                            <div className="font-bold text-stone-700 text-center">{inv.stock} <span className="text-xs text-stone-400 font-normal">{inv.unidad}</span></div>
                         )}
                      </td>
                      <td className="p-3 text-right">
                         {editandoId === inv._docId ? (
                            <input type="number" value={invEdit.costoTotal} onChange={e=>setInvEdit({...invEdit, costoTotal: e.target.value})} className="w-16 border border-emerald-300 px-2 py-1 text-xs text-right font-bold rounded float-right" />
                         ) : (
                            <div className="font-bold text-emerald-700">${parseFloat(inv.costoTotal || 0).toFixed(2)}</div>
                         )}
                      </td>
                      <td className="p-3 text-center">
                         {editandoId === inv._docId ? (
                            <button onClick={() => guardarEdicion(inv._docId)} className="text-emerald-600 bg-emerald-100 p-1.5 rounded mx-auto block"><Save size={14}/></button>
                         ) : (
                            <div className="flex justify-center gap-2">
                               <button onClick={() => iniciarEdicion(inv)} className="text-stone-300 hover:text-emerald-600 md:opacity-0 group-hover:opacity-100"><Edit3 size={14}/></button>
                               <button onClick={() => deleteDocData(inv._docId)} className="text-stone-300 hover:text-rose-500 md:opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </div>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>
         
         <div className="w-full overflow-hidden">
            <h4 className="font-bold text-[#4A2B29] mb-4 flex items-center gap-2"><Package size={18} className="text-[#DF888A]"/>Empaques</h4>
            <div className="bg-white rounded-xl border border-[#F2E8E6] shadow-sm overflow-x-auto w-full">
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-[#FFF9F8] text-[#4A2B29] text-[10px] uppercase tracking-widest">
                  <tr><th className="p-3 border-b border-[#F2E8E6]">Ítem</th><th className="p-3 border-b border-[#F2E8E6] text-center">Físico</th><th className="p-3 border-b border-[#F2E8E6] text-right">Lote</th><th className="p-3 border-b border-[#F2E8E6] text-center">Acciones</th></tr>
                </thead>
                <tbody>
                  {otrosInsumos.length===0 && <tr><td colSpan="4" className="p-4 text-center text-stone-400">Vacío</td></tr>}
                  {otrosInsumos.map(inv => (
                    <tr key={inv._docId} className="border-b border-stone-100 hover:bg-stone-50 group">
                      <td className="p-3">
                         {editandoId === inv._docId ? (
                            <div className="flex flex-col gap-1 w-full">
                              <input type="text" value={invEdit.item} onChange={e=>setInvEdit({...invEdit, item: e.target.value})} className="w-full border border-[#DF888A] px-2 py-1 text-xs rounded" />
                              <input type="text" value={invEdit.tienda} onChange={e=>setInvEdit({...invEdit, tienda: e.target.value})} className="w-full border border-[#DF888A] px-2 py-1 text-[10px] rounded" placeholder="Proveedor" />
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
                               <input type="number" value={invEdit.stock} onChange={e=>setInvEdit({...invEdit, stock: e.target.value})} className="w-12 border border-[#DF888A] px-1 py-1 text-xs text-center rounded" />
                               <UnidadesSelect value={invEdit.unidad} onChange={e=>setInvEdit({...invEdit, unidad: e.target.value})} className="border border-[#DF888A] px-1 py-1 text-xs rounded w-14" />
                            </div>
                         ) : (
                            <div className="font-bold text-stone-700 text-center">{inv.stock} <span className="text-xs text-stone-400 font-normal">{inv.unidad}</span></div>
                         )}
                      </td>
                      <td className="p-3 text-right">
                         {editandoId === inv._docId ? (
                            <input type="number" value={invEdit.costoTotal} onChange={e=>setInvEdit({...invEdit, costoTotal: e.target.value})} className="w-16 border border-[#DF888A] px-2 py-1 text-xs text-right font-bold rounded float-right" />
                         ) : (
                            <div className="font-bold text-[#DF888A]">${parseFloat(inv.costoTotal || 0).toFixed(2)}</div>
                         )}
                      </td>
                      <td className="p-3 text-center">
                         {editandoId === inv._docId ? (
                            <button onClick={() => guardarEdicion(inv._docId)} className="text-emerald-600 bg-emerald-100 p-1.5 rounded mx-auto block"><Save size={14}/></button>
                         ) : (
                            <div className="flex justify-center gap-2">
                               <button onClick={() => iniciarEdicion(inv)} className="text-stone-300 hover:text-[#4A2B29] md:opacity-0 group-hover:opacity-100"><Edit3 size={14}/></button>
                               <button onClick={() => deleteDocData(inv._docId)} className="text-stone-300 hover:text-rose-500 md:opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
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
// MÓDULO COSTOS Y FINANZAS
// ==========================================
function CostosModule({ user }) {
  const { data: costos, addDocData, updateDocData, deleteDocData } = useFirestoreCollection('costos', user);
  const { data: inventario } = useFirestoreCollection('inventario', user);
  const [nuevaReceta, setNuevaReceta] = useState('');
  const [ingrediente, setIngrediente] = useState({ docId: null, idInsumo: '', cantidad: '', unidadReceta: 'gr' });

  const agregarIngrediente = async (receta) => {
    const insumo = inventario.find(i => i._docId === ingrediente.idInsumo); 
    if (!insumo) return;
    const costoProp = calcularCostoConvertido(insumo.costoTotal, insumo.stock, insumo.unidad||'kg', ingrediente.cantidad, ingrediente.unidadReceta);
    const arr = [...(receta.ingredientes||[]), { id: Date.now().toString(), nombre: insumo.item, cantidad: parseFloat(ingrediente.cantidad), unidad: ingrediente.unidadReceta, costo: costoProp }];
    await updateDocData(receta._docId, { ingredientes: arr, costoTotal: arr.reduce((a,b)=>a+b.costo,0) });
    setIngrediente({ docId: null, idInsumo: '', cantidad: '', unidadReceta: 'gr' });
  };
  
  const eliminarIngrediente = async (receta, idIng) => {
    const arr = receta.ingredientes.filter(i => i.id !== idIng);
    await updateDocData(receta._docId, { ingredientes: arr, costoTotal: arr.reduce((a,b)=>a+b.costo,0) });
  };

  return (
    <div className="animate-in fade-in pb-10 w-full">
      <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] mb-6">Costeador Inteligente</h3>
      
      <div className="bg-white p-4 md:p-5 rounded-xl flex flex-col md:flex-row gap-3 mb-8 border border-stone-200 shadow-sm w-full">
        <input type="text" value={nuevaReceta} onChange={e=>setNuevaReceta(e.target.value)} placeholder="Nombre Receta Maestro..." className="flex-1 w-full p-2 border border-stone-200 rounded-lg outline-none font-medium" />
        <button onClick={() => { if(nuevaReceta) { addDocData({ producto: nuevaReceta, ingredientes: [], costoTotal: 0 }); setNuevaReceta(''); } }} className="w-full md:w-auto bg-[#4A2B29] hover:bg-[#3D221F] text-white px-6 py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors">
          <Plus size={16}/> Crear Receta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
        {costos.length === 0 && <div className="col-span-1 md:col-span-2 xl:col-span-3 text-stone-400 italic text-sm text-center p-8 bg-stone-50 rounded-xl border border-dashed">No hay recetas.</div>}
        {costos.map(r => (
          <div key={r._docId} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col h-full relative overflow-hidden w-full">
            <button onClick={() => deleteDocData(r._docId)} className="absolute top-4 right-4 text-stone-300 hover:text-rose-500 p-2"><Trash2 size={16}/></button>
            <h4 className="font-bold text-lg mb-4 text-[#4A2B29] border-b border-stone-100 pb-3 pr-8 truncate">{r.producto}</h4>
            
            <div className="space-y-2 mb-4 flex-1">
              {(!r.ingredientes || r.ingredientes.length === 0) && <p className="text-xs text-stone-400 italic">Sin ingredientes.</p>}
              {r.ingredientes?.map(i => (
                <div key={i.id} className="flex justify-between items-center text-sm bg-stone-50 p-2 rounded-lg border border-stone-100 group">
                  <div className="overflow-hidden pr-2">
                    <span className="font-bold block text-stone-800 truncate">{i.nombre}</span>
                    <span className="text-[10px] text-stone-500 uppercase">{i.cantidad} {i.unidad}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-stone-900">${(i.costo || 0).toFixed(2)}</span>
                    <button onClick={()=>eliminarIngrediente(r, i.id)} className="text-stone-300 hover:text-rose-500 md:opacity-0 group-hover:opacity-100 p-1"><X size={14}/></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-auto mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100 shadow-inner">
              <label className="text-[10px] font-bold text-stone-400 uppercase">Inyectar Insumo</label>
              <select value={ingrediente.docId===r._docId?ingrediente.idInsumo:''} onChange={e=>setIngrediente({docId:r._docId, idInsumo:e.target.value, cantidad:ingrediente.cantidad, unidadReceta:ingrediente.unidadReceta})} className="w-full border border-stone-200 p-1.5 rounded text-xs bg-white outline-none">
                <option value="">Buscar en Inventario...</option>
                {inventario.map(inv=><option key={inv._docId} value={inv._docId}>{inv.item} ({inv.unidad})</option>)}
              </select>
              <div className="flex gap-2 w-full">
                <input type="number" value={ingrediente.docId===r._docId?ingrediente.cantidad:''} onChange={e=>setIngrediente({...ingrediente, docId:r._docId, cantidad:e.target.value})} placeholder="Cant" className="w-16 border border-stone-200 p-1.5 text-xs text-center rounded bg-white outline-none" />
                <select value={ingrediente.docId===r._docId?ingrediente.unidadReceta:'gr'} onChange={e=>setIngrediente({...ingrediente, docId:r._docId, unidadReceta:e.target.value})} className="flex-1 border border-stone-200 p-1.5 text-xs rounded bg-white outline-none">
                  <option value="kg">kg</option><option value="gr">gr</option><option value="l">lt</option><option value="ml">ml</option><option value="u">u</option>
                </select>
                <button onClick={()=>agregarIngrediente(r)} className="bg-[#4A2B29] text-white p-1.5 rounded font-bold hover:bg-[#3D221F]"><Plus size={14}/></button>
              </div>
            </div>

            <div className="bg-[#FFF9F8] p-3 rounded-xl flex justify-between items-center border border-[#F2E8E6]">
              <span className="font-bold text-[10px] uppercase text-[#4A2B29] leading-tight">Costo Final<br/>Producción</span>
              <span className="text-2xl font-black text-[#DF888A]">${(r.costoTotal||0).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO 8: SEGURIDAD Y ACCESOS
// ==========================================
function AccesosModule({ user }) {
  const { data: usuariosRoles, addDocData, deleteDocData } = useFirestoreCollection('usuarios_permisos', user);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: '', email: '', rol: 'Empleado', modulos: [] });
  
  const MODULOS_DISPONIBLES = [
     { id: 'dashboard', nombre: 'Centro de Comando' }, { id: 'pedidos', nombre: 'Operaciones / Pedidos' },
     { id: 'mapa', name: 'Logística y Mapa' }, { id: 'historial', nombre: 'Historial' }, { id: 'clientes', nombre: 'Directorio CRM' },
     { id: 'zonas', nombre: 'Logística Zonas' }, { id: 'productos', nombre: 'Gestor Productos' },
     { id: 'inventario', nombre: 'Control Almacén' }, { id: 'costos', nombre: 'Finanzas' }
  ];

  const handleToggleModulo = (modId) => {
     if (nuevoUsuario.modulos.includes(modId)) setNuevoUsuario({ ...nuevoUsuario, modulos: nuevoUsuario.modulos.filter(m => m !== modId) });
     else setNuevoUsuario({ ...nuevoUsuario, modulos: [...nuevoUsuario.modulos, modId] });
  };

  const agregarUsuario = async () => {
     if (!nuevoUsuario.nombre || !nuevoUsuario.email) return;
     await addDocData({ nombre: nuevoUsuario.nombre, email: nuevoUsuario.email, rol: nuevoUsuario.rol, modulos: nuevoUsuario.rol === 'SuperAdmin' ? MODULOS_DISPONIBLES.map(m=>m.id) : nuevoUsuario.modulos });
     setNuevoUsuario({ nombre: '', email: '', rol: 'Empleado', modulos: [] });
  };

  return (
    <div className="animate-in fade-in pb-20 w-full">
      <h3 className="text-xl md:text-2xl font-bold text-[#4A2B29] mb-6">Seguridad IAM</h3>
      
      <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-8 w-full border border-stone-200">
        <h4 className="font-bold text-[#4A2B29] mb-4 border-b border-stone-100 pb-3 flex items-center gap-2"><Settings className="text-stone-400" size={18} /> Propietario / Super Admin</h4>
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div className="w-full overflow-hidden">
              <p className="text-xs text-stone-500 font-mono truncate">{user?.uid || 'No identificado'}</p>
           </div>
           <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shrink-0">
              <ShieldCheck size={12}/> Acceso Total
           </span>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 w-full">
         <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 w-full xl:w-1/3 border border-stone-200 h-fit">
            <h4 className="font-bold text-[#4A2B29] text-sm uppercase mb-4 border-b border-stone-100 pb-2">Crear Acceso</h4>
            <div className="space-y-4 w-full">
               <div><label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Nombre</label><input type="text" value={nuevoUsuario.nombre} onChange={e=>setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm bg-white focus:ring-2 focus:ring-[#DF888A]" /></div>
               <div><label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Email</label><input type="email" value={nuevoUsuario.email} onChange={e=>setNuevoUsuario({...nuevoUsuario, email: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm bg-white focus:ring-2 focus:ring-[#DF888A]" /></div>
               <div>
                 <label className="text-[10px] font-bold text-stone-500 uppercase block mb-1">Privilegio</label>
                 <select value={nuevoUsuario.rol} onChange={e=>setNuevoUsuario({...nuevoUsuario, rol: e.target.value})} className="w-full px-3 py-2 border border-stone-200 rounded-lg outline-none text-sm font-bold bg-white focus:ring-2 focus:ring-[#DF888A]">
                   <option value="Empleado">Empleado (Restringido)</option>
                   <option value="SuperAdmin">Co-Administrador</option>
                 </select>
               </div>
               
               {nuevoUsuario.rol === 'Empleado' && (
                  <div className="bg-[#FFF9F8] p-4 rounded-xl border border-[#F2E8E6]">
                     <label className="text-[10px] font-bold text-[#DF888A] uppercase block mb-3">Módulos Permitidos</label>
                     <div className="space-y-2">
                        {MODULOS_DISPONIBLES.map(m => (
                           <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={nuevoUsuario.modulos.includes(m.id)} onChange={() => handleToggleModulo(m.id)} className="text-[#DF888A] rounded w-4 h-4 shrink-0" />
                              <span className="text-xs text-stone-700 font-medium">{m.nombre}</span>
                           </label>
                        ))}
                     </div>
                  </div>
               )}

               <button onClick={agregarUsuario} className="w-full bg-[#4A2B29] hover:bg-[#3D221F] text-white py-2.5 rounded-lg text-sm font-bold mt-2 transition-colors flex justify-center items-center gap-2"><UserPlus size={16}/> Otorgar Acceso</button>
            </div>
         </div>

         <div className="w-full xl:w-2/3 bg-white rounded-2xl shadow-sm overflow-hidden border border-stone-200">
             <div className="overflow-x-auto w-full">
               <table className="w-full text-left text-sm min-w-[500px]">
                 <thead className="bg-[#FFF9F8] text-stone-500 text-[10px] uppercase">
                   <tr><th className="p-4 border-b border-stone-200">Personal</th><th className="p-4 border-b border-stone-200">Rol / Permisos</th><th className="p-4 border-b border-stone-200 text-center">Acción</th></tr>
                 </thead>
                 <tbody>
                   {usuariosRoles.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-stone-400">Sin cuentas configuradas.</td></tr>}
                   {usuariosRoles.map(u => (
                     <tr key={u._docId} className="border-b border-stone-100 hover:bg-stone-50">
                       <td className="p-4">
                         <p className="font-bold text-[#4A2B29]">{u.nombre}</p>
                         <p className="text-[10px] text-stone-500 mt-0.5">{u.email}</p>
                       </td>
                       <td className="p-4">
                         <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase inline-block mb-2 ${u.rol==='SuperAdmin'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}`}>{u.rol}</span>
                         <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {u.rol === 'SuperAdmin' ? (
                               <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1"><Lock size={10}/> Acceso Total</span>
                            ) : (
                               u.modulos?.map(mod => <span key={mod} className="text-[9px] uppercase tracking-wider font-bold bg-white border border-stone-200 text-stone-500 px-1.5 py-0.5 rounded">{mod}</span>)
                            )}
                         </div>
                       </td>
                       <td className="p-4 text-center">
                         <button onClick={() => deleteDocData(u._docId)} className="text-stone-300 hover:text-rose-500 p-2"><Trash2 size={16}/></button>
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

// === INICIO MÓDULO DE AUDITORÍA ===
function AuditoriaModule({ user }) {
   // Solo cargamos los últimos 200 logs para no saturar
   const { data: logs } = useFirestoreCollection('auditoria_logs', user, 200);
 
   // Ordenar los logs del más reciente al más antiguo
   const logsOrdenados = [...logs].sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
 
   return (
     <div className="h-full flex flex-col p-4 md:p-6 bg-stone-50">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
             <h2 className="text-2xl font-black text-[#4A2B29] flex items-center gap-2"><ShieldCheck className="text-[#DF888A]"/> Registro de Auditoría (Logs)</h2>
             <p className="text-stone-500 text-sm">Caja negra transaccional. Registra las últimas 200 acciones de los usuarios.</p>
          </div>
       </div>
       <div className="flex-1 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#FFF9F8] text-[#4A2B29] font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4">Acción Realizada</th>
                  <th className="p-4">ID Afectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {logsOrdenados.map((log) => (
                  <tr key={log._docId} className="hover:bg-stone-50">
                    <td className="p-4 whitespace-nowrap font-medium text-stone-600">
                      {new Date(log.fechaHora).toLocaleString()}
                    </td>
                    <td className="p-4 text-emerald-600 font-bold">{log.usuario}</td>
                    <td className="p-4">
                       <span className="bg-stone-100 px-2 py-1 rounded text-stone-700 font-medium text-xs">
                         {log.accion}
                       </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-stone-500">{log.idOrden}</td>
                  </tr>
                ))}
                {logsOrdenados.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-stone-400">No hay registros de auditoría aún.</td></tr>
                )}
              </tbody>
            </table>
          </div>
       </div>
     </div>
   );
 }
 // === FIN MÓDULO DE AUDITORÍA ===
 

// UI HELPER
function MetricCard({ title, value, trend, isPositive, icon: Icon }) {
  return (
    <div className="bg-white p-4 md:p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group w-full">
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <h4 className="text-stone-500 text-xs md:text-sm font-bold tracking-wide">{title}</h4>
        <div className="p-1.5 bg-[#FFF9F8] text-[#DF888A] border border-[#F2E8E6] rounded-lg group-hover:bg-[#4A2B29] group-hover:text-white transition-colors">
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-black text-[#4A2B29] tracking-tight">{value}</div>
      <div className="mt-3 md:mt-4">
        <span className={`px-2 py-0.5 text-[9px] md:text-[10px] uppercase font-bold tracking-wider rounded-md ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{trend}</span>
      </div>
    </div>
  );
}