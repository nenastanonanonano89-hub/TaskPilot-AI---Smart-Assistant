import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Search, 
  CheckCircle, 
  Clock, 
  Globe, 
  Briefcase, 
  Plane, 
  Building,
  Menu,
  Plus,
  Bot,
  Loader2,
  FileText,
  Mic,
  MicOff,
  Paperclip,
  X,
  Rocket,
  Sparkles,
  Utensils,
  Star,
  Image as ImageIcon,
  PanelLeftClose,
  Home,
  ListTodo,
  BarChart,
  Settings,
  User,
  Bell,
  GripVertical,
  LayoutDashboard,
  ClipboardList,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  Share2,
  Languages,
  Trash2,
  LogOut,
  Calculator,
  Moon,
  Sun,
  Compass
} from 'lucide-react';
import { useTaskContext, Task, Attachment } from './context/TaskContext';
import { useSpeech } from './hooks/useSpeech';
import { languages, translations, LangKey } from './i18n/translations';
import { CurrencyConverter } from './components/CurrencyConverter';
import { TravelTips } from './components/TravelTips';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getTaskIcon = (prompt: string) => {
  const lower = prompt.toLowerCase();
  if (lower.includes('flight') || lower.includes('travel') || lower.includes('طيران') || lower.includes('سفر') || lower.includes('vuelo') || lower.includes('voli') || lower.includes('フライト') || lower.includes('uçuş')) return Plane;
  if (lower.includes('hotel') || lower.includes('book') || lower.includes('فندق') || lower.includes('حجز') || lower.includes('hotel') || lower.includes('予約') || lower.includes('otel')) return Building;
  if (lower.includes('job') || lower.includes('work') || lower.includes('وظيفة') || lower.includes('عمل') || lower.includes('trabajo') || lower.includes('lavoro') || lower.includes('仕事') || lower.includes('iş')) return Briefcase;
  return FileText;
};

const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn('Clipboard API failed, falling back to execCommand', err);
    }
  }
  
  // Fallback
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
};

export default function App() {
  const { tasks, currentTaskId, currentTask, setCurrentTaskId, addTask, updateTask, deleteTask, clearAllTasks, handleNewTask: contextHandleNewTask } = useTaskContext();
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('taskpilot_logged_in') === 'true');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('taskpilot_user');
    return saved ? JSON.parse(saved) : { email: 'nenastanonanonano89@gmail.com', name: 'User' };
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail && loginPassword) {
      setIsLoggedIn(true);
      setUser({ email: loginEmail, name: loginEmail.split('@')[0] });
      localStorage.setItem('taskpilot_logged_in', 'true');
      localStorage.setItem('taskpilot_user', JSON.stringify({ email: loginEmail, name: loginEmail.split('@')[0] }));
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('taskpilot_logged_in');
    localStorage.removeItem('taskpilot_user');
    setCurrentView('home');
  };

  const [showMentions, setShowMentions] = useState(false);
  const MENTION_SUGGESTIONS = ['ai', 'system', 'support', 'admin'];

  const [inputPrompt, setInputPrompt] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [lang, setLang] = useState<LangKey>('ar'); // Default to Arabic based on user preference
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('taskpilot_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [currency, setCurrency] = useState<string>(() => localStorage.getItem('taskpilot_currency') || 'SAR');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'chat' | 'gallery' | 'home' | 'flights' | 'hotels' | 'jobs' | 'reports' | 'preferences' | 'profile' | 'travelAdvice' | 'notifications'>('home');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [orderedTaskIds, setOrderedTaskIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('taskpilot_ordered_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse ordered tasks from local storage', e);
      }
    }
    return [];
  });

  // Dashboard Panels Drag and Drop State
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [orderedPanelIds, setOrderedPanelIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('taskpilot_dashboard_panels');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse dashboard panels', e);
      }
    }
    return ['taskQueue', 'summary', 'recommendations', 'preferences'];
  });

  useEffect(() => {
    localStorage.setItem('taskpilot_dashboard_panels', JSON.stringify(orderedPanelIds));
  }, [orderedPanelIds]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('taskpilot_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('taskpilot_theme', 'light');
    }
  }, [isDarkMode]);

  const handlePanelDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPanelId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Create a ghost image or just set data
    e.dataTransfer.setData('text/plain', id);
  };

  const handlePanelDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedPanelId || draggedPanelId === targetId) return;
    
    setOrderedPanelIds(prev => {
      const draggedIdx = prev.indexOf(draggedPanelId);
      const targetIdx = prev.indexOf(targetId);
      const newOrder = [...prev];
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedPanelId);
      localStorage.setItem('taskpilot_dashboard_panels', JSON.stringify(newOrder));
      return newOrder;
    });
    setDraggedPanelId(null);
  };

  const [preferences, setPreferences] = useState<string[]>(() => {
    const saved = localStorage.getItem('taskpilot_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse preferences from local storage', e);
      }
    }
    return [
      "Direct Flights Only",
      "4-Star Hotels Preferred",
      "Remote Jobs Focused"
    ];
  });

  useEffect(() => {
    localStorage.setItem('taskpilot_preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Sync ordered tasks with actual tasks
  useEffect(() => {
    const newIds = tasks.map(t => t.id);
    setOrderedTaskIds(prev => {
      const existing = prev.filter(id => newIds.includes(id));
      const added = newIds.filter(id => !prev.includes(id));
      const newOrder = [...added, ...existing];
      localStorage.setItem('taskpilot_ordered_tasks', JSON.stringify(newOrder));
      return newOrder;
    });
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetId) return;
    
    setOrderedTaskIds(prev => {
      const draggedIdx = prev.indexOf(draggedTaskId);
      const targetIdx = prev.indexOf(targetId);
      const newOrder = [...prev];
      newOrder.splice(draggedIdx, 1);
      newOrder.splice(targetIdx, 0, draggedTaskId);
      localStorage.setItem('taskpilot_ordered_tasks', JSON.stringify(newOrder));
      return newOrder;
    });
    setDraggedTaskId(null);
  };

  const t = translations[lang];
  const langConfig = languages[lang];

  const EXECUTION_STEPS = [
    { id: 'analyze', label: t.steps[0], icon: Sparkles },
    { id: 'search', label: t.steps[1], icon: Globe },
    { id: 'compare', label: t.steps[2], icon: Search },
    { id: 'execute', label: t.steps[3], icon: FileText },
    { id: 'report', label: t.steps[4], icon: CheckCircle },
  ];

  // Execution state
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSpeechResult = useCallback((text: string) => {
    setInputPrompt(prev => prev ? `${prev} ${text}` : text);
  }, []);

  const { isListening, toggleListening, isSupported } = useSpeech(handleSpeechResult, langConfig.code);
  const [showLearningToast, setShowLearningToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', sub: '' });

  const showToast = (title: string, sub: string) => {
    setToastMessage({ title, sub });
    setShowLearningToast(true);
    setTimeout(() => setShowLearningToast(false), 3000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTask?.report, activeStepIndex]);

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNewTask = () => {
    contextHandleNewTask();
    setInputPrompt('');
    setAttachments([]);
    setActiveStepIndex(-1);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleTaskSelect = (id: string) => {
    setCurrentTaskId(id);
    setCurrentView('chat');
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const promise = new Promise<Attachment>((resolve) => {
        reader.onload = (event) => {
          const base64String = (event.target?.result as string).split(',')[1];
          resolve({
            name: file.name,
            mimeType: file.type,
            data: base64String,
            previewUrl: URL.createObjectURL(file)
          });
        };
      });
      reader.readAsDataURL(file);
      newAttachments.push(await promise);
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputPrompt.trim() && attachments.length === 0) return;

    const newTask: Task = {
      id: Date.now().toString(),
      prompt: inputPrompt.trim() || 'Analyze attached files',
      status: 'inProgress',
      createdAt: new Date(),
      attachments: [...attachments]
    };

    addTask(newTask);
    setInputPrompt('');
    setAttachments([]);
    setActiveStepIndex(0);

    try {
      // Simulate steps progression
      for (let i = 0; i < EXECUTION_STEPS.length; i++) {
        setActiveStepIndex(i);
        // Wait 1.5s per step to simulate work
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const parts: any[] = [{
        text: `You are TaskPilot AI, a smart and autonomous digital assistant. The user's request is: "${newTask.prompt}".
        
Please reply entirely in ${langConfig.name}.

The user has the following preferences:
${preferences.map(p => `- ${p}`).join('\n')}

Search the internet using the available search tool to find real and up-to-date information (flight prices, hotels, jobs, etc.).
If the user attached any images or documents (like a CV, passport, or ID), analyze them and use the extracted information to fulfill their request.
After that, write a detailed report explaining that you have executed the task. 
The report must include:
1. A summary of what was accomplished.
2. The best options you found.
3. **CRITICAL**: You MUST include direct, clickable markdown links (e.g., [Book Here](https://...)) for every flight, hotel, job, or resource you suggest. Make sure the links are real and functional based on your search results.
4. The next step required from the user.
Use Markdown formatting to arrange the report beautifully and elegantly.`
      }];

      if (newTask.attachments) {
        newTask.attachments.forEach(att => {
          parts.push({
            inlineData: {
              data: att.data,
              mimeType: att.mimeType
            }
          });
        });
      }

      // Call Gemini API to generate the actual report using Google Search
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      updateTask(newTask.id, { status: 'completed', report: response.text });
      setActiveStepIndex(-1);
      
    } catch (error) {
      console.error('Error executing task:', error);
      updateTask(newTask.id, { status: 'error', report: t.errorMsg });
      setActiveStepIndex(-1);
    }
  };

  const suggestions = [
    { text: t.suggestions[0], icon: FileText },
    { text: t.suggestions[1], icon: Plane },
    { text: t.suggestions[2], icon: Briefcase },
    { text: t.suggestions[3], icon: Star },
    { text: t.suggestions[4], icon: Utensils },
    { text: t.suggestions[5], icon: Plane },
  ];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-gray-900 flex items-center justify-center p-4" dir={langConfig.dir}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#F97316] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#F97316]">{t.appName}</h1>
            <p className="text-gray-500 dark:text-gray-400">{t.login}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#111827]/80 dark:text-gray-300 mb-1">{t.email}</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:border-[#F97316] outline-none transition-all"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#111827]/80 dark:text-gray-300 mb-1">{t.password}</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-[#111827] dark:text-white focus:border-[#F97316] outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-[#F97316] text-white py-3 rounded-xl font-bold hover:bg-[#ea580c] transition-all shadow-md active:scale-95"
            >
              {t.signIn}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-4">
            {Object.entries(languages).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setLang(key as LangKey)}
                className={`text-xs font-bold transition-colors ${lang === key ? 'text-[#F97316]' : 'text-gray-400 hover:text-[#111827]/60'}`}
              >
                {config.name}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA] dark:bg-gray-900 text-[#111827] dark:text-gray-100 overflow-hidden font-sans" dir={langConfig.dir}>
      {/* Header */}
      <header className="h-16 bg-[#F97316] text-white flex items-center justify-between px-6 shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Rocket className="w-6 h-6 text-white" />
          <span className="font-bold text-xl">TaskPilot AI</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
            <div className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest font-bold">{t.aiLearningActive}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 360 : 0, opacity: isSidebarOpen ? 1 : 0 }}
          className={`bg-[#FAFAFA] dark:bg-gray-900 text-[#111827]/80 dark:text-gray-300 ${langConfig.dir === 'rtl' ? 'border-l' : 'border-r'} border-gray-200 dark:border-gray-800 flex flex-col shrink-0 overflow-hidden z-20 absolute md:relative h-full shadow-2xl md:shadow-none`}
        >
          {/* Profile Section in Sidebar (Top) */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <button 
              onClick={() => setCurrentView('profile')}
              className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all ${currentView === 'profile' ? 'bg-orange-50 dark:bg-gray-800 ring-1 ring-orange-200 dark:ring-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center text-[#F97316] shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className={`flex-1 overflow-hidden ${langConfig.dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                <p className="text-base font-bold text-[#111827] dark:text-white truncate">{user.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
                {t.mainMenu || 'Main Menu'}
              </p>
              <div className="space-y-0.5">
                <button 
                  onClick={() => setCurrentView('home')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'home' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <LayoutDashboard className="w-7 h-7" />
                  <span>{t.home}</span>
                </button>
                <button 
                  onClick={() => setCurrentView('chat')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'chat' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <ClipboardList className="w-7 h-7" />
                  <span>{t.currentTasks}</span>
                </button>
                <button 
                  onClick={() => setCurrentView('flights')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'flights' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <Plane className="w-7 h-7" />
                  <span>{t.flights}</span>
                </button>
                <button 
                  onClick={() => setCurrentView('hotels')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'hotels' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <Building className="w-7 h-7" />
                  <span>{t.hotels}</span>
                </button>
                <button 
                  onClick={() => setCurrentView('jobs')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'jobs' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <Briefcase className="w-7 h-7" />
                  <span>{t.jobs}</span>
                </button>
                <button 
                  onClick={() => setCurrentView('reports')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'reports' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <BarChart className="w-7 h-7" />
                  <span>{t.reports}</span>
                </button>
                <button 
                  onClick={() => setCurrentView('gallery')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'gallery' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <ImageIcon className="w-7 h-7" />
                  <span>{t.gallery}</span>
                </button>
                <button 
                  onClick={() => setCurrentView('travelAdvice')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'travelAdvice' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <Compass className="w-7 h-7" />
                  <div className="flex items-center justify-between w-full">
                    <span>{t.travelAdvice || 'Travel Advice'}</span>
                  </div>
                </button>
                <button 
                  onClick={() => setCurrentView('notifications')}
                  className={`w-full flex items-center gap-4 py-3 px-4 rounded-xl text-lg font-medium transition-all duration-200 ${currentView === 'notifications' ? 'bg-[#F97316] text-white shadow-md shadow-orange-500/20' : 'text-[#111827]/60 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#111827] dark:hover:text-white'}`}
                >
                  <Bell className="w-7 h-7" />
                  <div className="flex items-center justify-between w-full">
                    <span>{t.notifications || 'Notifications'}</span>
                    <span className="bg-orange-100 text-[#F97316] text-xs font-bold px-2.5 py-1 rounded-full">3</span>
                  </div>
                </button>
              </div>
            </div>
          </nav>

          {/* Tools Section in Sidebar */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-2">
              {t.preferences || 'Preferences'}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <Languages className="w-5 h-5 text-[#F97316]" />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.language}</span>
                </div>
                <select 
                  value={lang}
                  onChange={(e) => setLang(e.target.value as LangKey)}
                  className="bg-transparent text-xs font-bold outline-none cursor-pointer text-[#F97316]"
                >
                  {Object.entries(languages).map(([key, config]) => (
                    <option key={key} value={key} className="text-[#111827] dark:text-white bg-white dark:bg-gray-800">
                      {config.name}
                    </option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="w-full flex items-center justify-between p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-4">
                  {isDarkMode ? <Moon className="w-6 h-6 text-[#F97316]" /> : <Sun className="w-6 h-6 text-[#F97316]" />}
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {isDarkMode ? t.darkMode || 'Dark Mode' : t.lightMode || 'Light Mode'}
                  </span>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-[#F97316]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${isDarkMode ? (langConfig.dir === 'rtl' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`} />
                </div>
              </button>

              <button 
                onClick={async () => {
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: t.appName,
                        url: window.location.href
                      });
                    } else {
                      throw new Error('Not supported');
                    }
                  } catch (err) {
                    await copyTextToClipboard(window.location.href);
                    showToast(t.copied, t.linkCopied);
                  }
                }}
                className="w-full flex items-center gap-4 p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <Share2 className="w-6 h-6 text-[#F97316]" />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.share}</span>
              </button>

              <button 
                onClick={() => setCurrentView('preferences')}
                className="w-full flex items-center gap-4 p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <Settings className="w-6 h-6 text-[#F97316]" />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.preferences || 'Preferences'}</span>
              </button>

              <button 
                onClick={() => {
                  if (window.confirm(t.confirmClearTasks)) {
                    clearAllTasks();
                  }
                }}
                className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-transparent text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <Trash2 className="w-6 h-6" />
                <span className="text-sm font-bold uppercase tracking-wider">{t.clearAll}</span>
              </button>
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full relative w-full bg-[#FAFAFA]">
          {/* Content Area */}
        {currentView === 'home' ? (
          <div className="flex-1 overflow-y-auto p-8 bg-[#FAFAFA]">
            <div className="max-w-6xl mx-auto space-y-8">
              
              {/* Input Area */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inputPrompt.trim() || attachments.length > 0) {
                      setCurrentView('chat');
                      handleSubmit(e);
                    }
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-1 relative flex items-center">
                    <Search className={`absolute ${langConfig.dir === 'rtl' ? 'right-4' : 'left-4'} w-5 h-5 text-gray-400`} />
                      <input 
                        type="text" 
                        value={inputPrompt}
                        onChange={(e) => setInputPrompt(e.target.value)}
                        placeholder={t.inputPlaceholder} 
                        className={`w-full ${langConfig.dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 outline-none text-[#111827]/80 dark:text-gray-200 text-lg bg-gray-50 dark:bg-gray-800 rounded-xl border border-transparent focus:border-[#F97316] focus:bg-white dark:focus:bg-gray-700 transition-all`}
                        disabled={currentTask?.status === 'inProgress'}
                      />
                  </div>
                  <button 
                    type="button"
                    onClick={toggleListening}
                    className={`p-3 rounded-xl transition-colors ${isListening ? 'bg-red-50 dark:bg-red-900/30 text-red-500' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-[#F97316]'}`}
                  >
                    {isListening ? <MicOff className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
                  </button>
                    <button 
                      type="submit"
                      disabled={(!inputPrompt.trim() && attachments.length === 0) || currentTask?.status === 'inProgress'}
                      className="bg-[#F97316] hover:bg-[#ea580c] disabled:bg-gray-300 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
                    >
                      {t.execute}
                      <Rocket className="w-5 h-5" />
                    </button>
                </form>
              </div>

              {/* Dashboard Panels Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                {orderedPanelIds.map((panelId, index) => {
                  const spanClass = (panelId === 'taskQueue' || panelId === 'recommendations') ? 'lg:col-span-2' : 'lg:col-span-1';
                  
                  if (panelId === 'taskQueue') {
                    return (
                      <motion.div 
                        key="taskQueue"
                        layout
                        draggable
                        onDragStart={(e) => handlePanelDragStart(e as unknown as React.DragEvent, 'taskQueue')}
                        onDragEnd={() => setDraggedPanelId(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handlePanelDrop(e as unknown as React.DragEvent, 'taskQueue')}
                        className={`${spanClass} space-y-4 group/panel relative ${draggedPanelId === 'taskQueue' ? 'opacity-40 scale-95' : ''} transition-all duration-200`}
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-[#F97316] flex items-center gap-2">
                            <ClipboardList className="w-6 h-6" />
                            {t.taskQueue}
                          </h2>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                              {tasks.length} {t.currentTasks}
                            </span>
                            <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover/panel:opacity-100 transition-opacity">
                              <GripVertical className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {orderedTaskIds.length === 0 ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                              <Bot className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                              <p className="text-gray-500 font-medium">{t.noTasksInQueue}</p>
                            </div>
                          ) : (
                            orderedTaskIds.map((taskId) => {
                              const task = tasks.find(t => t.id === taskId);
                              if (!task) return null;
                              return (
                              <motion.div 
                                key={task.id}
                                layoutId={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, task.id)}
                                onDragEnd={() => setDraggedTaskId(null)}
                                onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent)}
                                onDrop={(e) => handleDrop(e as unknown as React.DragEvent, task.id)}
                                onClick={() => {
                                  setCurrentTaskId(task.id);
                                  setCurrentView('chat');
                                }}
                                className={`rounded-2xl shadow-sm border p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-all group ${draggedTaskId === task.id ? 'opacity-50' : ''} ${
                                  task.status === 'completed' ? 'bg-violet-50/30 border-violet-100 hover:border-violet-200' :
                                  task.status === 'inProgress' ? 'bg-blue-50/30 border-blue-100 hover:border-blue-200' :
                                  task.status === 'error' ? 'bg-red-50/30 border-red-100 hover:border-red-200' :
                                  'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-[#F97316]/30'
                                }`}
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1">
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    task.status === 'completed' ? 'bg-violet-100 text-[#8B5CF6]' :
                                    task.status === 'inProgress' ? 'bg-blue-100 text-[#3B82F6]' :
                                    task.status === 'error' ? 'bg-red-100 text-red-600' :
                                    'bg-gray-50 dark:bg-gray-800 text-[#F97316] group-hover:bg-orange-50 dark:group-hover:bg-orange-900/30'
                                  }`}>
                                    {React.createElement(getTaskIcon(task.prompt), { className: "w-7 h-7" })}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h3 className="text-lg font-bold text-[#111827] dark:text-white truncate">{task.prompt}</h3>
                                      {orderedTaskIds.indexOf(task.id) === 0 && (
                                        <span className="bg-red-50 text-red-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-red-100">{t.highPriority}</span>
                                      )}
                                      {task.status === 'idle' && (
                                        <span className="bg-gray-100 dark:bg-gray-800 text-[#111827]/60 dark:text-gray-400 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">
                                          {t.pending}
                                        </span>
                                      )}
                                    {task.status === 'inProgress' && (
                                      <span className="bg-blue-50 text-[#3B82F6] text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        {t.inProgress}
                                      </span>
                                    )}
                                    {task.status === 'completed' && (
                                      <span className="bg-violet-50 text-[#8B5CF6] text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        {t.done}
                                      </span>
                                    )}
                                    {task.status === 'error' && (
                                      <span className="bg-red-50 text-[#EF4444] text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                        <X className="w-3 h-3" />
                                        {t.error}
                                      </span>
                                    )}
                                    </div>
                                    <p className="text-gray-500 text-sm truncate">
                                      {task.status === 'inProgress' ? t.aiProcessing : 
                                       task.status === 'completed' ? t.taskFinished : 
                                       task.status === 'error' ? t.taskError : t.waitingForExecution}
                                    </p>
                                  </div>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTask(task.id);
                                    }}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <ChevronRight className={`w-5 h-5 text-gray-300 group-hover:text-[#F97316] transition-colors ${langConfig.dir === 'rtl' ? 'rotate-180' : ''}`} />
                              </motion.div>
                            )})
                          )}
                        </div>
                      </motion.div>
                    );
                  }

                  if (panelId === 'summary') {
                    return (
                      <motion.div 
                        key="summary"
                        layout
                        draggable
                        onDragStart={(e) => handlePanelDragStart(e as unknown as React.DragEvent, 'summary')}
                        onDragEnd={() => setDraggedPanelId(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handlePanelDrop(e as unknown as React.DragEvent, 'summary')}
                        className={`${spanClass} space-y-4 group/panel relative ${draggedPanelId === 'summary' ? 'opacity-40 scale-95' : ''} transition-all duration-200`}
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-[#F97316] flex items-center gap-2">
                            <BarChart className="w-6 h-6" />
                            {t.summaryReports}
                          </h2>
                          <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover/panel:opacity-100 transition-opacity">
                            <GripVertical className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-[calc(100%-2.5rem)]">
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-orange-50 p-4 rounded-xl text-center">
                              <p className="text-xs text-[#F97316] font-bold uppercase mb-1">{t.active}</p>
                              <p className="text-2xl font-bold text-[#F97316]">{tasks.filter(t => t.status === 'inProgress').length}</p>
                            </div>
                            <div className="bg-violet-50 p-4 rounded-xl text-center">
                              <p className="text-xs text-[#8B5CF6] font-bold uppercase mb-1">{t.done}</p>
                              <p className="text-2xl font-bold text-[#8B5CF6]">{tasks.filter(t => t.status === 'completed').length}</p>
                            </div>
                          </div>

                          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.recentReports}</h3>
                            {tasks.filter(t => t.status === 'completed').length === 0 ? (
                              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic py-8">
                                {t.noReports}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {tasks.filter(t => t.status === 'completed').slice(0, 5).map(task => (
                                  <div key={task.id} className="group cursor-pointer" onClick={() => handleTaskSelect(task.id)}>
                                    <p className="text-sm font-bold text-[#111827] dark:text-white group-hover:text-[#F97316] transition-colors line-clamp-1">{task.prompt}</p>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                                      {task.report?.replace(/[#*]/g, '').substring(0, 100)}...
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => setCurrentView('reports')}
                            className="mt-6 w-full py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-[#F97316] font-bold rounded-xl transition-colors border border-gray-100 dark:border-gray-700"
                          >
                            {t.allReports}
                          </button>
                        </div>
                      </motion.div>
                    );
                  }

                  if (panelId === 'recommendations') {
                    return (
                      <motion.div 
                        key="recommendations"
                        layout
                        draggable
                        onDragStart={(e) => handlePanelDragStart(e as unknown as React.DragEvent, 'recommendations')}
                        onDragEnd={() => setDraggedPanelId(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handlePanelDrop(e as unknown as React.DragEvent, 'recommendations')}
                        className={`${spanClass} space-y-4 group/panel relative ${draggedPanelId === 'recommendations' ? 'opacity-40 scale-95' : ''} transition-all duration-200`}
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-[#F97316] flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-[#F97316]" />
                            {t.smartRecommendations}
                          </h2>
                          <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover/panel:opacity-100 transition-opacity">
                            <GripVertical className="w-5 h-5" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[
                            { title: "Top Weekend Deals in Dubai", img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=800", prompt: "Find the best weekend deals for luxury hotels in Dubai" },
                            { title: "Apply to Remote Support Jobs", img: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800", prompt: "Search for remote customer support jobs with high salaries" },
                            { title: "Find a Beach Resort in Maldives", img: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=800", prompt: "Book a 5-star beach resort in Maldives for next month" }
                          ].map((rec, i) => (
                            <motion.div 
                              key={i}
                              whileHover={{ y: -5 }}
                              onClick={() => {
                                setInputPrompt(rec.prompt);
                                showToast(t.profileLearningActive, t.aiAdapting);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-xl transition-all flex flex-col group"
                            >
                              <div className="h-36 overflow-hidden relative">
                                <img src={rec.img} alt={rec.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                  <span className="text-white text-xs font-bold">Try this task →</span>
                                </div>
                              </div>
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                  <p className="font-bold text-[#111827] dark:text-white text-sm leading-tight">{rec.title}</p>
                                  <div className="mt-2 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse"></div>
                                    <span className="text-[10px] text-[#8B5CF6] font-bold uppercase tracking-tighter">{t.personalizedForYou}</span>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                  <Star className="w-3 h-3 text-[#F97316] fill-[#F97316]" />
                                  {t.aiLearned}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  }

                  if (panelId === 'preferences') {
                    return (
                      <motion.div 
                        key="preferences"
                        layout
                        draggable
                        onDragStart={(e) => handlePanelDragStart(e as unknown as React.DragEvent, 'preferences')}
                        onDragEnd={() => setDraggedPanelId(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handlePanelDrop(e as unknown as React.DragEvent, 'preferences')}
                        className={`${spanClass} space-y-4 group/panel relative ${draggedPanelId === 'preferences' ? 'opacity-40 scale-95' : ''} transition-all duration-200`}
                      >
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-bold text-[#F97316] flex items-center gap-2">
                            <User className="w-6 h-6" />
                            {t.preferences}
                          </h2>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setCurrentView('preferences')}
                              className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#F97316] transition-colors"
                            >
                              <Settings className="w-5 h-5" />
                            </button>
                            <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 opacity-0 group-hover/panel:opacity-100 transition-opacity">
                              <GripVertical className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 space-y-1">
                          {preferences.map((pref, idx) => (
                            <div key={idx} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors group">
                              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                                <Check className="w-4 h-4 text-[#8B5CF6]" />
                              </div>
                              <span className="text-[#111827]/80 dark:text-gray-200 font-bold text-sm">{pref}</span>
                            </div>
                          ))}
                          <button 
                            onClick={() => setCurrentView('preferences')}
                            className="w-full p-3 text-xs font-bold text-gray-400 hover:text-[#F97316] transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {t.managePreferences}
                          </button>
                        </div>
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ) : currentView === 'travelAdvice' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full">
              <h2 className="text-3xl font-bold mb-8 text-[#F97316] flex items-center gap-3">
                <Compass className="w-8 h-8 text-[#F97316]" />
                {t.travelAdvice || 'Travel Advice'}
              </h2>
              <div className="space-y-6">
                <TravelTips t={t} langConfig={langConfig} />
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="font-bold text-[#111827] dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#F97316]" />
                    {t.visaAdvice || 'Visa Advice'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t.visaAdviceDesc || 'Ask our AI assistant about visa requirements for any country.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setInputPrompt('How to get a visa for any country?');
                        setCurrentView('home');
                      }}
                      className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-[#F97316] rounded-xl font-medium hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                    >
                      {t.askAboutVisas || 'Ask about Visas'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'preferences' ? (
          <div className="flex-1 overflow-y-auto p-6 md:p-12">
            <div className="max-w-5xl mx-auto w-full">
              <h2 className="text-4xl font-bold mb-10 text-[#F97316] flex items-center gap-4">
                <Settings className="w-10 h-10 text-[#F97316]" />
                {t.preferences}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 flex items-center gap-3">
                    <Globe className="w-6 h-6 text-[#F97316]" />
                    {t.languageSettings || 'Language Settings'}
                  </h3>
                  <div className="relative">
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as LangKey)}
                      className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#111827] dark:text-white rounded-2xl p-6 pr-12 outline-none focus:border-[#F97316] transition-all font-bold text-lg"
                    >
                      {Object.entries(languages).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 flex items-center gap-3">
                    <Calculator className="w-6 h-6 text-[#F97316]" />
                    {t.currencySettings || 'Currency Settings'}
                  </h3>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        localStorage.setItem('taskpilot_currency', e.target.value);
                      }}
                      className="w-full appearance-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#111827] dark:text-white rounded-2xl p-6 pr-12 outline-none focus:border-[#F97316] transition-all font-bold text-lg"
                    >
                      {['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'TRY'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-8">
                  <CurrencyConverter t={t} baseCurrency={currency} langConfig={langConfig} />
                  <TravelTips t={t} langConfig={langConfig} />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-8">
                  <h3 className="text-xl font-bold text-[#111827] dark:text-white mb-6 flex items-center gap-3">
                    <Star className="w-6 h-6 text-[#F97316]" />
                    {t.aiExecutionPreferences || 'AI Execution Preferences'}
                  </h3>
                  <div className="space-y-4">
                    {preferences.map((pref, idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl group border border-transparent hover:border-violet-100 dark:hover:border-violet-500/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                            <Check className="w-5 h-5 text-[#8B5CF6]" />
                          </div>
                          <span className="text-lg font-bold text-[#111827]/80 dark:text-gray-200">{pref}</span>
                        </div>
                        <button 
                          onClick={() => setPreferences(prev => prev.filter((_, i) => i !== idx))}
                          className="p-3 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-gray-700 rounded-lg shadow-sm"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-3 mt-6">
                      <input 
                        type="text"
                        placeholder={t.addPreferencePlaceholder || "Add new preference (e.g. Only 5-star hotels)..."}
                        className="flex-1 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 outline-none focus:border-[#F97316] bg-gray-50 dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 text-[#111827] dark:text-white transition-all text-lg"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val) {
                              setPreferences(prev => [...prev, val]);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button 
                        onClick={(e) => {
                          const input = (e.currentTarget.previousSibling as HTMLInputElement);
                          if (input.value) {
                            setPreferences(prev => [...prev, input.value]);
                            input.value = '';
                          }
                        }}
                        className="bg-[#F97316] text-white px-8 rounded-2xl font-bold hover:bg-[#ea580c] transition-all text-lg"
                      >
                        {t.add}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'profile' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full">
              <h2 className="text-3xl font-bold mb-8 text-[#F97316] flex items-center gap-3">
                <User className="w-8 h-8 text-[#8B5CF6]" />
                {t.profile}
              </h2>
              
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                  <User className="w-12 h-12 text-[#F97316]" />
                </div>
                <h3 className="text-2xl font-bold text-[#111827] dark:text-white mb-1">{user.name}</h3>
                <p className="text-gray-500 mb-8">{user.email}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{t.currentTasks}</p>
                    <p className="text-xl font-bold text-[#111827] dark:text-white">{tasks.length}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{t.done}</p>
                    <p className="text-xl font-bold text-[#8B5CF6]">{tasks.filter(t => t.status === 'completed').length}</p>
                  </div>
                </div>

                <button 
                  onClick={handleLogout}
                  className="mt-12 bg-red-50 text-red-500 px-8 py-3 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2 mx-auto border border-red-100 shadow-sm"
                >
                  <LogOut className="w-5 h-5" />
                  {t.logout}
                </button>
              </div>
            </div>
          </div>
        ) : currentView === 'gallery' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full">
              <h2 className="text-3xl font-bold mb-8 text-[#F97316] flex items-center gap-3">
                <ImageIcon className="w-8 h-8 text-[#F97316]" />
                {t.gallery}
              </h2>
              {tasks.flatMap(t => t.attachments || []).length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>{t.emptyGallery}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tasks.flatMap(t => t.attachments || []).map((att, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm group relative">
                      {att.mimeType.startsWith('image/') ? (
                        <img src={att.previewUrl} alt="gallery" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-500">
                          <FileText className="w-10 h-10" />
                          <span className="text-xs truncate w-3/4 text-center">{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : currentView === 'notifications' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full">
              <h2 className="text-3xl font-bold mb-8 text-[#F97316] flex items-center gap-3">
                <Bell className="w-8 h-8 text-[#F97316]" />
                {t.notifications || 'Notifications'}
              </h2>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-5">
                  <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-gray-700 flex items-center justify-center text-[#F97316] shrink-0">
                    <Rocket className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111827] dark:text-white">Welcome to TaskPilot AI</h3>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-1">Your AI assistant is ready to help you plan your next trip or manage your tasks.</p>
                    <span className="text-sm text-gray-400 mt-2 block">Just now</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-5">
                  <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-gray-700 flex items-center justify-center text-blue-500 shrink-0">
                    <Plane className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111827] dark:text-white">New Flight Deals</h3>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-1">Check out the latest flight deals to your favorite destinations.</p>
                    <span className="text-sm text-gray-400 mt-2 block">2 hours ago</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-5">
                  <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-gray-700 flex items-center justify-center text-green-500 shrink-0">
                    <Settings className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111827] dark:text-white">System Update</h3>
                    <p className="text-base text-gray-500 dark:text-gray-400 mt-1">We've updated our system to provide you with better recommendations.</p>
                    <span className="text-sm text-gray-400 mt-2 block">1 day ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full h-full flex flex-col">
              
              {!currentTask ? (
              // Empty State / New Task
              <div className="flex-1 flex flex-col items-center justify-center text-center mt-10 md:mt-0">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6 border border-orange-100 shadow-sm"
                >
                  <Rocket className="w-12 h-12 text-[#F97316]" />
                </motion.div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[#F97316]">{t.greeting}</h1>
                <p className="text-[#111827]/60 dark:text-gray-400 mb-10 max-w-md">
                  {t.description}
                </p>
                
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {suggestions.map((suggestion, idx) => {
                    const Icon = suggestion.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => setInputPrompt(suggestion.text)}
                        className={`p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-500/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${langConfig.dir === 'rtl' ? 'text-right' : 'text-left'} flex flex-col gap-4 group relative overflow-hidden`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="w-10 h-10 rounded-xl bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors relative z-10 border border-orange-100/50">
                          <Icon className="w-5 h-5 text-[#F97316]" />
                        </div>
                        <span className="text-sm font-medium text-[#111827]/80 dark:text-gray-200 group-hover:text-[#111827] dark:group-hover:text-white relative z-10 leading-relaxed">{suggestion.text}</span>
                      </button>
                    )
                  })}
                </div>
                
                <div className={`w-full ${langConfig.dir === 'rtl' ? 'text-right' : 'text-left'}`}>
                  <TravelTips t={t} langConfig={langConfig} />
                </div>
              </div>
            ) : (
              // Task Execution / Result State
              <div className="flex-1 flex flex-col pb-32">
                {/* User Prompt Bubble */}
                <div className={`flex items-start gap-4 mb-8 ${langConfig.dir === 'rtl' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-[#111827]/80 dark:text-gray-200">{t.you}</span>
                  </div>
                  <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl p-4 text-[#111827] dark:text-white ${langConfig.dir === 'rtl' ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                    <p>{currentTask.prompt}</p>
                    {currentTask.attachments && currentTask.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {currentTask.attachments.map((att, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300">
                            {att.mimeType.startsWith('image/') ? (
                              <img src={att.previewUrl} alt="attachment" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-gray-500" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Response Area */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F97316] flex items-center justify-center shrink-0 shadow-md">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {currentTask.status === 'inProgress' && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-[#111827] dark:text-white">
                          <Loader2 className="w-5 h-5 animate-spin text-[#F97316]" />
                          {t.executing}
                        </h3>
                        
                        <div className="mb-8">
                          <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium">
                            <span>{t.overallProgress}</span>
                            <span>{Math.round(((Math.max(0, activeStepIndex)) / EXECUTION_STEPS.length) * 100)}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-[#3B82F6] rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${((Math.max(0, activeStepIndex)) / EXECUTION_STEPS.length) * 100}%` }}
                              transition={{ duration: 0.5, ease: "easeInOut" }}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          {EXECUTION_STEPS.map((step, idx) => {
                            const StepIcon = step.icon;
                            const isActive = idx === activeStepIndex;
                            const isPast = idx < activeStepIndex;
                            
                            return (
                              <motion.div 
                                key={step.id}
                                initial={{ opacity: 0, x: langConfig.dir === 'rtl' ? 20 : -20 }}
                                animate={{ opacity: isActive || isPast ? 1 : 0.3, x: 0 }}
                                className={`flex items-center gap-4 ${isActive ? 'text-[#3B82F6]' : isPast ? 'text-[#3B82F6]' : 'text-gray-400'}`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                                  isActive ? 'border-[#3B82F6] bg-blue-50' : 
                                  isPast ? 'border-blue-200 bg-blue-50' : 
                                  'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                                }`}>
                                  {isPast ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                                </div>
                                <span className={`text-sm ${isActive ? 'font-medium text-[#111827] dark:text-white' : isPast ? 'text-[#111827]/80 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>{step.label}</span>
                                {isActive && (
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 1.5, ease: "linear" }}
                                    className={`h-0.5 bg-[#8B5CF6] absolute bottom-0 ${langConfig.dir === 'rtl' ? 'right-0' : 'left-0'}`}
                                  />
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {currentTask.status === 'completed' && currentTask.report && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 border border-violet-100 dark:border-violet-900/30 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div className="bg-violet-50/50 px-6 py-3 border-b border-violet-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#8B5CF6]" />
                            <span className="text-xs font-bold text-[#8B5CF6] uppercase tracking-widest">{t.interactiveReport}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={async () => {
                                await copyTextToClipboard(currentTask.report || '');
                                showToast(t.copied, t.reportCopied);
                              }}
                              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors" 
                              title={t.copyToClipboard}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                try {
                                  if (navigator.share) {
                                    await navigator.share({
                                      title: t.reportTitle,
                                      text: currentTask.report,
                                      url: window.location.href
                                    });
                                  } else {
                                    throw new Error('Not supported');
                                  }
                                } catch (err) {
                                  await copyTextToClipboard(currentTask.report);
                                  showToast(t.copied, t.reportCopied);
                                }
                              }}
                              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors" 
                              title={t.share}
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-6 md:p-8">
                          <div className="markdown-body text-[#111827] dark:text-gray-200">
                            <ReactMarkdown>{currentTask.report}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {currentTask.status === 'error' && (
                      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600">
                        {currentTask.report}
                      </div>
                    )}
                  </div>
                </div>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      {currentView === 'chat' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent">
          <div className="max-w-5xl mx-auto">
            
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form 
              onSubmit={handleSubmit}
              className="relative flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-2xl shadow-sm focus-within:border-[#F97316] focus-within:ring-1 focus-within:ring-orange-500 transition-all"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputPrompt(val);
                    const lastChar = val[val.length - 1];
                    if (lastChar === '@') {
                      setShowMentions(true);
                    } else if (val.indexOf('@') === -1 || lastChar === ' ') {
                      setShowMentions(false);
                    }
                  }}
                  placeholder={isListening ? t.listening : t.inputPlaceholder}
                  className={`w-full bg-transparent text-[#111827] dark:text-white placeholder-gray-400 py-4 outline-none rounded-2xl ${langConfig.dir === 'rtl' ? 'pr-6 pl-32' : 'pl-6 pr-32'}`}
                  disabled={currentTask?.status === 'inProgress'}
                />
                
                {showMentions && (
                  <div className={`absolute bottom-full ${langConfig.dir === 'rtl' ? 'right-0' : 'left-0'} mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50`}>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.mentions}</span>
                    </div>
                    {MENTION_SUGGESTIONS.map(suggestion => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          const lastAt = inputPrompt.lastIndexOf('@');
                          setInputPrompt(inputPrompt.substring(0, lastAt + 1) + suggestion + ' ');
                          setShowMentions(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[#F97316]">
                          <Bot className="w-3 h-3" />
                        </div>
                        <span className="font-medium">@{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={`absolute ${langConfig.dir === 'rtl' ? 'left-2' : 'right-2'} flex items-center gap-1`}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  multiple 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={currentTask?.status === 'inProgress'}
                  className="p-2.5 text-gray-400 hover:text-[#111827]/80 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                {isSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={currentTask?.status === 'inProgress'}
                    className={`p-3 rounded-xl transition-all ${
                      isListening 
                        ? 'bg-red-100 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                        : 'text-gray-400 hover:text-[#F97316] hover:bg-orange-50'
                    } disabled:opacity-50`}
                    title={isListening ? "Stop recording" : "Speak"}
                  >
                    {isListening ? <MicOff className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={(!inputPrompt.trim() && attachments.length === 0) || currentTask?.status === 'inProgress'}
                  className="p-2.5 bg-[#F97316] hover:bg-[#ea580c] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors ml-1"
                >
                  {currentTask?.status === 'inProgress' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className={`w-5 h-5 ${langConfig.dir === 'rtl' ? 'rotate-180' : ''}`} />
                  )}
                </button>
              </div>
            </form>
            <p className="text-center text-xs text-gray-500 mt-3">
              {t.disclaimer}
            </p>
          </div>
        </div>
        )}
      </main>
        {/* Learning Toast */}
        <AnimatePresence>
          {showLearningToast && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-8 right-8 z-50 bg-[#F97316] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#F97316]" />
              </div>
              <div>
                <p className="text-sm font-bold">{toastMessage.title}</p>
                <p className="text-xs text-blue-200">{toastMessage.sub}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
