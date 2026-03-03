import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  PlayCircle, 
  CheckCircle, 
  User, 
  LogOut, 
  Layout, 
  ChevronRight, 
  Award, 
  BarChart,
  Lock,
  Menu,
  X,
  Search
} from 'lucide-react';

// --- Types ---
interface User {
  id: number;
  username: string;
  role: 'student' | 'admin';
}

interface Course {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  long_description: string;
  thumbnail_url: string;
  is_published: boolean;
  lessons?: Lesson[];
}

interface Lesson {
  id: number;
  title: string;
  slug: string;
  video_url: string;
  content_text: string;
  sort_order: number;
  is_preview: boolean;
  questions?: Question[];
}

interface Question {
  id: number;
  text: string;
  choices: string[];
}

// --- Context ---
const AuthContext = createContext<{
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
} | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---
const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <BookOpen className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-zinc-900 tracking-tight">elearn</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-zinc-600 hover:text-indigo-600 font-medium transition-colors">Courses</Link>
            {user ? (
              <>
                <Link to="/profile" className="text-zinc-600 hover:text-indigo-600 font-medium transition-colors">My Learning</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="text-zinc-600 hover:text-indigo-600 font-medium transition-colors">Admin</Link>
                )}
                <div className="flex items-center space-x-4 pl-4 border-l border-zinc-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-600" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-900">{user.username}</span>
                  </div>
                  <button onClick={logout} className="text-zinc-400 hover:text-red-500 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                Sign In
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-600">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-b border-zinc-200 px-4 pt-2 pb-6 space-y-2"
          >
            <Link to="/" className="block px-3 py-2 text-zinc-600 font-medium">Courses</Link>
            {user ? (
              <>
                <Link to="/profile" className="block px-3 py-2 text-zinc-600 font-medium">My Learning</Link>
                <button onClick={logout} className="block w-full text-left px-3 py-2 text-red-500 font-medium">Logout</button>
              </>
            ) : (
              <Link to="/login" className="block px-3 py-2 text-indigo-600 font-bold">Sign In</Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Pages ---
const HomePage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => {
        setCourses(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">Master New Skills</h1>
        <p className="text-xl text-zinc-600 max-w-2xl">Expert-led courses designed to help you reach your goals. Start learning today with our flexible MVP platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => (
          <motion.div 
            key={course.id}
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
          >
            <img src={course.thumbnail_url} alt={course.title} className="w-full h-48 object-cover" />
            <div className="p-6">
              <h3 className="text-xl font-bold text-zinc-900 mb-2">{course.title}</h3>
              <p className="text-zinc-600 text-sm mb-4 line-clamp-2">{course.short_description}</p>
              <Link 
                to={`/course/${course.slug}`}
                className="inline-flex items-center text-indigo-600 font-bold hover:text-indigo-700"
              >
                View Course <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const CourseDetailPage = () => {
  const { slug } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${slug}`)
      .then(res => res.json())
      .then(data => setCourse(data));

    if (user && token) {
      fetch('/api/users/me/progress', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.some((p: any) => p.slug === slug)) setEnrolled(true);
      });
    }
  }, [slug, user, token]);

  const handleEnroll = async () => {
    if (!user) return navigate('/login');
    const res = await fetch(`/api/courses/${slug}/enroll`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setEnrolled(true);
  };

  if (!course) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-bold text-zinc-900 mb-6">{course.title}</h1>
          <div className="prose prose-zinc max-w-none mb-12">
            <p className="text-lg text-zinc-600 leading-relaxed">{course.long_description}</p>
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Course Content</h2>
          <div className="space-y-4">
            {course.lessons?.map((lesson, idx) => (
              <div key={lesson.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="flex items-center space-x-4">
                  <span className="text-zinc-400 font-mono text-sm">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="font-semibold text-zinc-900">{lesson.title}</span>
                  {lesson.is_preview && (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Preview</span>
                  )}
                </div>
                {enrolled || lesson.is_preview ? (
                  <Link to={`/course/${slug}/lesson/${lesson.id}`} className="text-indigo-600 hover:text-indigo-700">
                    <PlayCircle className="w-6 h-6" />
                  </Link>
                ) : (
                  <Lock className="w-5 h-5 text-zinc-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm sticky top-24">
            <img src={course.thumbnail_url} alt={course.title} className="w-full h-48 object-cover rounded-xl mb-6" />
            <div className="space-y-4">
              {enrolled ? (
                <Link 
                  to={`/course/${slug}/lesson/${course.lessons?.[0]?.id}`}
                  className="block w-full bg-indigo-600 text-white text-center py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Continue Learning
                </Link>
              ) : (
                <button 
                  onClick={handleEnroll}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Enroll Now
                </button>
              )}
              <p className="text-center text-sm text-zinc-500">Full lifetime access • Certificate of completion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LessonPage = () => {
  const { slug, lessonId } = useParams();
  const { token } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch(`/api/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setLesson(data));

    fetch(`/api/courses/${slug}`)
      .then(res => res.json())
      .then(data => setCourse(data));
  }, [lessonId, slug, token]);

  const handleQuizSubmit = async (questionId: number) => {
    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question_id: questionId,
        selected_index: selectedChoices[questionId]
      })
    });
    const data = await res.json();
    setResults(prev => ({ ...prev, [questionId]: data.is_correct }));
  };

  if (!lesson || !course) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-zinc-200">
              <h3 className="font-bold text-zinc-900 mb-4">{course.title}</h3>
              <div className="space-y-2">
                {course.lessons?.map(l => (
                  <Link 
                    key={l.id}
                    to={`/course/${slug}/lesson/${l.id}`}
                    className={`block p-3 rounded-lg text-sm font-medium transition-colors ${
                      l.id === Number(lessonId) 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {l.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-black rounded-2xl overflow-hidden aspect-video shadow-2xl">
              <iframe 
                src={lesson.video_url} 
                className="w-full h-full" 
                allowFullScreen 
                title={lesson.title}
              />
            </div>

            <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
              <h1 className="text-3xl font-bold text-zinc-900 mb-4">{lesson.title}</h1>
              <div className="prose prose-zinc max-w-none mb-12">
                <p className="text-zinc-600 leading-relaxed">{lesson.content_text}</p>
              </div>

              {lesson.questions && lesson.questions.length > 0 && (
                <div className="border-t border-zinc-100 pt-8">
                  <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center">
                    <BarChart className="w-5 h-5 mr-2 text-indigo-600" />
                    Lesson Quiz
                  </h2>
                  <div className="space-y-8">
                    {lesson.questions.map(q => (
                      <div key={q.id} className="space-y-4">
                        <p className="font-semibold text-zinc-900">{q.text}</p>
                        <div className="grid grid-cols-1 gap-3">
                          {q.choices.map((choice, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedChoices(prev => ({ ...prev, [q.id]: idx }))}
                              className={`p-4 rounded-xl text-left border transition-all ${
                                selectedChoices[q.id] === idx 
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                  : 'border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={() => handleQuizSubmit(q.id)}
                          disabled={selectedChoices[q.id] === undefined}
                          className="bg-zinc-900 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50"
                        >
                          Submit Answer
                        </button>
                        {results[q.id] !== undefined && (
                          <p className={`font-bold flex items-center ${results[q.id] ? 'text-emerald-600' : 'text-red-500'}`}>
                            {results[q.id] ? (
                              <><CheckCircle className="w-4 h-4 mr-1" /> Correct!</>
                            ) : 'Try again!'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { token } = useAuth();
  const [progress, setProgress] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/users/me/progress', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setProgress(data));
  }, [token]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">My Learning Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {progress.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">{item.title}</h3>
                <p className="text-zinc-500 text-sm">Enrolled on {new Date(item.enrolled_at).toLocaleDateString()}</p>
              </div>
              {item.certificate_slug && (
                <div className="bg-amber-100 text-amber-700 p-2 rounded-lg">
                  <Award className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-zinc-600">Progress</span>
                <span className="text-indigo-600">{item.progress_percent}%</span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${item.progress_percent}%` }}
                  className="bg-indigo-600 h-full"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <Link 
                to={`/course/${item.slug}`}
                className="flex-1 bg-indigo-600 text-white text-center py-2 rounded-lg font-bold hover:bg-indigo-700"
              >
                Continue
              </Link>
              {item.certificate_slug && (
                <button className="flex-1 border border-amber-200 text-amber-700 text-center py-2 rounded-lg font-bold hover:bg-amber-50">
                  Certificate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok) {
      login(data.token, data.user);
      navigate('/');
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-zinc-200 shadow-xl">
        <h2 className="text-3xl font-bold text-zinc-900 mb-8 text-center">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-center text-zinc-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-indigo-600 font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setStats(data));
    }
  }, [token, user]);

  if (user?.role !== 'admin') return <Navigate to="/" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-zinc-900 mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-500 font-bold uppercase tracking-wider text-xs mb-2">Total Users</p>
          <p className="text-4xl font-bold text-zinc-900">{stats?.users || 0}</p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-500 font-bold uppercase tracking-wider text-xs mb-2">Total Courses</p>
          <p className="text-4xl font-bold text-zinc-900">{stats?.courses || 0}</p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-500 font-bold uppercase tracking-wider text-xs mb-2">Total Enrollments</p>
          <p className="text-4xl font-bold text-zinc-900">{stats?.enrollments || 0}</p>
        </div>
      </div>
      
      <div className="mt-12 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
        <h2 className="text-xl font-bold text-zinc-900 mb-6">Quick Actions</h2>
        <div className="flex space-x-4">
          <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Add New Course</button>
          <button className="border border-zinc-200 text-zinc-900 px-6 py-2 rounded-lg font-bold">Manage Users</button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-white font-sans text-zinc-900">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/course/:slug" element={<CourseDetailPage />} />
            <Route path="/course/:slug/lesson/:lessonId" element={<LessonPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
