/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  LayoutDashboard, 
  Calendar, 
  User as UserIcon, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronRight,
  LogOut,
  ShieldCheck,
  Activity,
  Clock,
  Flame,
  Utensils,
  MessageSquare,
  Send,
  Bot,
  X,
  Search
} from 'lucide-react';
import { User, Workout, Routine, Recipe } from './types';
import { GoogleGenAI } from "@google/genai";

// --- AI ChatBot Component (Persistent) ---

const ChatBot = ({ user, workouts }: { user: User, workouts: Workout[] }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/chat/${user.id}`);
        const data = await res.json();
        if (data.length === 0) {
          setMessages([{ role: 'model', text: `¡Hola ${user.name.split(' ')[0]}! Soy tu asistente de FitTrack Pro. ¿En qué puedo ayudarte hoy con tu entrenamiento o nutrición?` }]);
        } else {
          setMessages(data);
        }
      } catch (err) {
        console.error("Error fetching chat history:", err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchHistory();
  }, [user.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const saveMessage = async (role: 'user' | 'model', text: string) => {
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role, text })
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, text: userMessage }];
    setMessages(newMessages);
    setLoading(true);
    await saveMessage('user', userMessage);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `Eres un experto entrenador personal y nutricionista de la app FitTrack Pro. 
      Tu objetivo es ayudar al usuario (${user.name}) con sus dudas de fitness y alimentación.
      Tienes acceso a los siguientes entrenamientos disponibles en la app: ${workouts.map(w => w.title).join(', ')}.
      Sé motivador, profesional y conciso. Responde en español.`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          ...newMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
        ],
        config: {
          systemInstruction
        }
      });

      const botText = response.text || "Lo siento, no he podido procesar tu solicitud.";
      setMessages(prev => [...prev, { role: 'model', text: botText }]);
      await saveMessage('model', botText);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Hubo un error al conectar con mi cerebro artificial. Inténtalo de nuevo." }]);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex items-center justify-center h-full text-zinc-400">Cargando chat...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      <header className="p-6 bg-white border-b border-zinc-100">
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <Bot className="text-emerald-600" /> Asistente IA
        </h2>
        <p className="text-zinc-500 text-sm">Memoria activa • Consejos personalizados</p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
              m.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-white border border-zinc-100 text-zinc-900 rounded-tl-none shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregúntame algo..."
          className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button 
          type="submit"
          disabled={loading}
          className="w-11 h-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

// --- Nutrition View Component ---

const NutritionView = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const categories = ['Todos', 'Desayuno', 'Comida', 'Cena', 'Snack'];

  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => {
        setRecipes(data);
        setLoading(false);
      });
  }, []);

  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || 
                         r.ingredients.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || r.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-display font-bold text-zinc-900">Nutrición</h2>
        <p className="text-zinc-500 text-sm">Recetas saludables para tu rutina</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar recetas o ingredientes..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat 
                ? 'bg-emerald-600 text-white' 
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-zinc-400 py-12">Cargando recetas...</p>
        ) : filteredRecipes.length > 0 ? (
          filteredRecipes.map(recipe => (
            <motion.div 
              key={recipe.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-zinc-900">{recipe.title}</h3>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-lg">
                    {recipe.calories}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">{recipe.ingredients}</p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">{recipe.category}</span>
                  <button className="text-emerald-600 text-sm font-bold flex items-center gap-1">
                    Ver receta <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200">
            <Utensils className="mx-auto text-zinc-300 mb-2" size={32} />
            <p className="text-zinc-500 text-sm">No se encontraron recetas.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedRecipe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedRecipe(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-lg mb-2 inline-block">
                      {selectedRecipe.category}
                    </span>
                    <h3 className="text-2xl font-display font-bold text-zinc-900">{selectedRecipe.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedRecipe(null)}
                    className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-1 p-4 bg-zinc-50 rounded-2xl">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Calorías</p>
                      <p className="font-bold text-zinc-900">{selectedRecipe.calories}</p>
                    </div>
                    <div className="flex-1 p-4 bg-zinc-50 rounded-2xl">
                      <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Dificultad</p>
                      <p className="font-bold text-zinc-900">Media</p>
                    </div>
                  </div>

                  <section className="space-y-3">
                    <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                      <Utensils size={18} className="text-emerald-600" />
                      Ingredientes
                    </h4>
                    <div className="bg-zinc-50 p-4 rounded-2xl">
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {selectedRecipe.ingredients}
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                      <Activity size={18} className="text-emerald-600" />
                      Preparación
                    </h4>
                    <div className="bg-zinc-50 p-4 rounded-2xl">
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {selectedRecipe.preparation}
                      </p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h4 className="font-bold text-zinc-900 flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      Beneficios
                    </h4>
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-sm text-emerald-800 leading-relaxed">
                        {selectedRecipe.benefits}
                      </p>
                    </div>
                  </section>
                </div>
              </div>
              
              <div className="p-6 bg-zinc-50 border-t border-zinc-100">
                <Button onClick={() => setSelectedRecipe(null)} className="w-full">
                  Cerrar Receta
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button' }: any) => {
  const variants: any = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    outline: 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
  };
  return (
    <button 
      type={type}
      onClick={onClick} 
      className={`px-4 py-2 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-zinc-700">{label}</label>}
    <input 
      {...props} 
      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
    />
  </div>
);

// --- Views ---

const LoginView = ({ onLogin, onSwitch }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      const user = await res.json();
      onLogin(user);
    } else {
      setError('Credenciales inválidas');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 flex flex-col justify-center min-h-screen"
    >
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Dumbbell size={32} />
        </div>
        <h1 className="text-3xl font-display font-bold text-zinc-900">FitTrack Pro</h1>
        <p className="text-zinc-500">Tu compañero de entrenamiento inteligente</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Email" 
          type="email" 
          placeholder="tu@email.com" 
          value={email} 
          onChange={(e: any) => setEmail(e.target.value)}
          required 
        />
        <Input 
          label="Contraseña" 
          type="password" 
          placeholder="••••••••" 
          value={password} 
          onChange={(e: any) => setPassword(e.target.value)}
          required 
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full py-3 mt-2">Iniciar Sesión</Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        ¿No tienes cuenta?{' '}
        <button onClick={onSwitch} className="text-emerald-600 font-semibold hover:underline">Regístrate</button>
      </p>
    </motion.div>
  );
};

const RegisterView = ({ onLogin, onSwitch }: any) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (res.ok) {
      const user = await res.json();
      onLogin(user);
    } else {
      setError('El email ya está registrado');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 flex flex-col justify-center min-h-screen"
    >
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-display font-bold text-zinc-900">Crear Cuenta</h1>
        <p className="text-zinc-500">Únete a la comunidad fitness</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Nombre Completo" 
          type="text" 
          placeholder="Juan Pérez" 
          value={name} 
          onChange={(e: any) => setName(e.target.value)}
          required 
        />
        <Input 
          label="Email" 
          type="email" 
          placeholder="tu@email.com" 
          value={email} 
          onChange={(e: any) => setEmail(e.target.value)}
          required 
        />
        <Input 
          label="Contraseña" 
          type="password" 
          placeholder="••••••••" 
          value={password} 
          onChange={(e: any) => setPassword(e.target.value)}
          required 
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full py-3 mt-2">Registrarse</Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        ¿Ya tienes cuenta?{' '}
        <button onClick={onSwitch} className="text-emerald-600 font-semibold hover:underline">Inicia sesión</button>
      </p>
    </motion.div>
  );
};

const Dashboard = ({ user, availableWorkouts, onUpdateWorkouts }: { user: User, availableWorkouts: Workout[], onUpdateWorkouts: () => void }) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('All');

  const bodyParts = ['All', 'Chest', 'Back', 'Legs', 'Arms', 'Core', 'Full Body'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const routRes = await fetch(`/api/routines/${user.id}`);
      
      if (!routRes.ok) throw new Error('Failed to fetch data');

      const routinesData = await routRes.json();
      setRoutines(routinesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const addToRoutine = async (workoutId: number) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const day = days[new Date().getDay()];
    await fetch('/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, workoutId, dayOfWeek: day })
    });
    fetchData();
    setShowAddRoutine(false);
  };

  const removeRoutine = async (id: number) => {
    await fetch(`/api/routines/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-zinc-900">Hola, {user.name.split(' ')[0]} 👋</h2>
          <p className="text-zinc-500 text-sm">¡Es hora de moverse!</p>
        </div>
        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
          <UserIcon size={20} className="text-zinc-600" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <Activity className="text-emerald-600 mb-2" size={20} />
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Entrenamientos</p>
          <p className="text-2xl font-bold text-zinc-900">{routines.length}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
          <Flame className="text-orange-600 mb-2" size={20} />
          <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">Calorías Est.</p>
          <p className="text-2xl font-bold text-zinc-900">{routines.length * 250}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display font-bold text-lg">Tu Rutina</h3>
          <button 
            onClick={() => setShowAddRoutine(true)}
            className="text-emerald-600 text-sm font-semibold flex items-center gap-1"
          >
            <Plus size={16} /> Añadir
          </button>
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <p className="text-zinc-400 text-center py-8">Cargando...</p>
          ) : routines.length > 0 ? (
            routines.map((routine) => (
              <motion.div 
                key={routine.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm"
              >
                <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Dumbbell size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-zinc-900">{routine.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                    <span className="flex items-center gap-1"><Clock size={12} /> {routine.duration} min</span>
                    <span className="flex items-center gap-1"><Activity size={12} /> {routine.category}</span>
                  </div>
                </div>
                <button 
                  onClick={() => removeRoutine(routine.id)}
                  className="p-2 text-zinc-300 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
              <Calendar className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-zinc-500 text-sm">No tienes rutinas asignadas aún.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddRoutine && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Explorar Entrenamientos</h3>
                <button onClick={() => setShowAddRoutine(false)} className="text-zinc-400">Cerrar</button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {bodyParts.map(part => (
                  <button
                    key={part}
                    onClick={() => setSelectedBodyPart(part)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedBodyPart === part 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {part}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {availableWorkouts
                  .filter(w => selectedBodyPart === 'All' || w.body_part === selectedBodyPart)
                  .map(workout => (
                  <div key={workout.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl">
                    <div className="flex-1">
                      <h4 className="font-semibold">{workout.title}</h4>
                      <p className="text-xs text-zinc-500">{workout.category} • {workout.body_part} • {workout.duration} min</p>
                    </div>
                    <Button onClick={() => addToRoutine(workout.id)} className="py-1.5 text-xs">Añadir</Button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminPanel = ({ onUpdateWorkouts }: { onUpdateWorkouts: () => void }) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newWorkout, setNewWorkout] = useState({
    title: '',
    description: '',
    category: 'Strength',
    difficulty: 'Beginner',
    duration: 30,
    body_part: 'Full Body'
  });

  const bodyParts = ['Full Body', 'Chest', 'Back', 'Legs', 'Arms', 'Core'];

  const fetchWorkouts = () => {
    fetch('/api/workouts')
      .then(res => res.json())
      .then(setWorkouts);
  };

  useEffect(fetchWorkouts, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWorkout)
    });
    if (res.ok) {
      setShowAdd(false);
      fetchWorkouts();
      onUpdateWorkouts();
      setNewWorkout({ title: '', description: '', category: 'Strength', difficulty: 'Beginner', duration: 30, body_part: 'Full Body' });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Estás seguro de eliminar este entrenamiento?')) {
      await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
      fetchWorkouts();
      onUpdateWorkouts();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-zinc-900">Gestión</h2>
          <p className="text-zinc-500 text-sm">Panel de Administrador</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-full w-10 h-10 p-0">
          <Plus size={20} />
        </Button>
      </header>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-lg space-y-4"
          >
            <h3 className="font-bold text-lg">Nuevo Entrenamiento</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <Input 
                label="Título" 
                value={newWorkout.title} 
                onChange={(e: any) => setNewWorkout({...newWorkout, title: e.target.value})} 
                required 
              />
              <Input 
                label="Duración (min)" 
                type="number" 
                value={newWorkout.duration} 
                onChange={(e: any) => setNewWorkout({...newWorkout, duration: parseInt(e.target.value)})} 
                required 
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">Categoría</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                    value={newWorkout.category}
                    onChange={(e) => setNewWorkout({...newWorkout, category: e.target.value})}
                  >
                    <option>Strength</option>
                    <option>Cardio</option>
                    <option>Yoga</option>
                    <option>HIIT</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">Parte del Cuerpo</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                    value={newWorkout.body_part}
                    onChange={(e) => setNewWorkout({...newWorkout, body_part: e.target.value})}
                  >
                    {bodyParts.map(part => <option key={part}>{part}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">Dificultad</label>
                  <select 
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                    value={newWorkout.difficulty}
                    onChange={(e) => setNewWorkout({...newWorkout, difficulty: e.target.value})}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700">Duración (min)</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                    value={newWorkout.duration}
                    onChange={(e) => setNewWorkout({...newWorkout, duration: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Guardar</Button>
                <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancelar</Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {workouts.map(workout => (
          <div key={workout.id} className="flex items-center gap-4 p-4 bg-white border border-zinc-100 rounded-2xl shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Activity size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-zinc-900">{workout.title}</h4>
              <p className="text-xs text-zinc-500">{workout.category} • {workout.body_part} • {workout.duration} min</p>
            </div>
            <button 
              onClick={() => handleDelete(workout.id)}
              className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'settings' | 'ai' | 'nutrition'>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    if (user) {
      fetch('/api/workouts')
        .then(res => res.json())
        .then(setWorkouts);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="mobile-container">
        {view === 'login' ? (
          <LoginView onLogin={setUser} onSwitch={() => setView('register')} />
        ) : (
          <RegisterView onLogin={setUser} onSwitch={() => setView('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="mobile-container flex flex-col">
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard user={user} availableWorkouts={workouts} onUpdateWorkouts={() => {
                fetch('/api/workouts').then(res => res.json()).then(setWorkouts);
              }} />
            </motion.div>
          )}
          {activeTab === 'admin' && user.role === 'admin' && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AdminPanel onUpdateWorkouts={() => {
                fetch('/api/workouts').then(res => res.json()).then(setWorkouts);
              }} />
            </motion.div>
          )}
          {activeTab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ChatBot user={user} workouts={workouts} />
            </motion.div>
          )}
          {activeTab === 'nutrition' && (
            <motion.div key="nutrition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <NutritionView />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
              <h2 className="text-2xl font-display font-bold mb-6">Ajustes</h2>
              <div className="space-y-2">
                <div className="p-4 bg-zinc-50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserIcon size={20} className="text-zinc-400" />
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-1 bg-zinc-200 rounded-md">{user.role}</span>
                </div>
                <button 
                  onClick={() => setUser(null)}
                  className="w-full p-4 text-red-500 font-medium flex items-center gap-3 hover:bg-red-50 rounded-2xl transition-colors"
                >
                  <LogOut size={20} />
                  Cerrar Sesión
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-zinc-100 px-4 py-4 flex justify-between items-center">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-zinc-400'}`}
        >
          <LayoutDashboard size={22} />
          <span className="text-[9px] font-bold uppercase">Inicio</span>
        </button>

        <button 
          onClick={() => setActiveTab('nutrition')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'nutrition' ? 'text-emerald-600' : 'text-zinc-400'}`}
        >
          <Utensils size={22} />
          <span className="text-[9px] font-bold uppercase">Comer</span>
        </button>

        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'ai' ? 'text-emerald-600' : 'text-zinc-400'}`}
        >
          <Bot size={22} />
          <span className="text-[9px] font-bold uppercase">IA Chat</span>
        </button>
        
        {user.role === 'admin' && (
          <button 
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'admin' ? 'text-emerald-600' : 'text-zinc-400'}`}
          >
            <ShieldCheck size={22} />
            <span className="text-[9px] font-bold uppercase">Admin</span>
          </button>
        )}

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-emerald-600' : 'text-zinc-400'}`}
        >
          <Settings size={22} />
          <span className="text-[9px] font-bold uppercase">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}
