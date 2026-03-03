import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("elearn.db");
const JWT_SECRET = process.env.JWT_SECRET || "elearn-secret-key-123";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    slug TEXT UNIQUE,
    short_description TEXT,
    long_description TEXT,
    thumbnail_url TEXT,
    instructor_id INTEGER,
    is_published BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    title TEXT,
    slug TEXT,
    video_url TEXT,
    content_text TEXT,
    sort_order INTEGER,
    is_preview BOOLEAN DEFAULT 0,
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    course_id INTEGER,
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed_lesson_id INTEGER,
    progress_percent INTEGER DEFAULT 0,
    UNIQUE(user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lesson_id INTEGER,
    text TEXT,
    choices JSON,
    correct_index INTEGER,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    question_id INTEGER,
    selected_index INTEGER,
    is_correct BOOLEAN,
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    course_id INTEGER,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    certificate_slug TEXT UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );
`);

// Seed Data Helper
const seed = () => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    const hashedPassword = bcrypt.hashSync("password123", 10);
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("student", hashedPassword, "student");

    const instructorId = 1;
    db.prepare(`
      INSERT INTO courses (title, slug, short_description, long_description, thumbnail_url, instructor_id, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "Introduction to Web Development",
      "intro-web-dev",
      "Learn the basics of HTML, CSS, and JS.",
      "This comprehensive course covers everything you need to start your journey as a web developer.",
      "https://picsum.photos/seed/web/800/450",
      instructorId,
      1
    );

    const courseId = 1;
    db.prepare(`
      INSERT INTO lessons (course_id, title, slug, video_url, content_text, sort_order, is_preview)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(courseId, "What is the Web?", "what-is-web", "https://www.youtube.com/embed/hE7n6_Lp_E8", "The web is a system of interconnected documents...", 1, 1);

    db.prepare(`
      INSERT INTO lessons (course_id, title, slug, video_url, content_text, sort_order, is_preview)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(courseId, "HTML Basics", "html-basics", "https://www.youtube.com/embed/qz0aGYrrlhU", "HTML stands for HyperText Markup Language...", 2, 0);

    db.prepare(`
      INSERT INTO questions (lesson_id, text, choices, correct_index)
      VALUES (?, ?, ?, ?)
    `).run(1, "What does HTML stand for?", JSON.stringify(["HyperText Markup Language", "High Tech Modern Language", "Hyperlink Text Management"]), 0);
  }
};
seed();

const app = express();
app.use(express.json());

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Auth Routes
app.post("/api/auth/register", (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);
    const token = jwt.sign({ id: result.lastInsertRowid, username, role: 'student' }, JWT_SECRET);
    res.json({ token, user: { id: result.lastInsertRowid, username, role: 'student' } });
  } catch (e) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Course Routes
app.get("/api/courses", (req, res) => {
  const courses = db.prepare("SELECT * FROM courses WHERE is_published = 1").all();
  res.json(courses);
});

app.get("/api/courses/:slug", (req, res) => {
  const course = db.prepare("SELECT * FROM courses WHERE slug = ?").get(req.params.slug) as any;
  if (!course) return res.status(404).json({ error: "Course not found" });
  const lessons = db.prepare("SELECT id, title, slug, sort_order, is_preview FROM lessons WHERE course_id = ? ORDER BY sort_order").all(course.id);
  res.json({ ...course, lessons });
});

app.post("/api/courses/:slug/enroll", authenticate, (req: any, res) => {
  const course = db.prepare("SELECT id FROM courses WHERE slug = ?").get(req.params.slug) as any;
  if (!course) return res.status(404).json({ error: "Course not found" });
  try {
    db.prepare("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)").run(req.user.id, course.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Already enrolled" });
  }
});

app.get("/api/courses/:slug/lessons", authenticate, (req: any, res) => {
  const course = db.prepare("SELECT id FROM courses WHERE slug = ?").get(req.params.slug) as any;
  const enrollment = db.prepare("SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?").get(req.user.id, course.id);
  if (!enrollment && req.user.role !== 'admin') return res.status(403).json({ error: "Not enrolled" });
  const lessons = db.prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order").all(course.id);
  res.json(lessons);
});

app.get("/api/lessons/:id", authenticate, (req: any, res) => {
  const lesson = db.prepare("SELECT * FROM lessons WHERE id = ?").get(req.params.id) as any;
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });
  
  const enrollment = db.prepare("SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?").get(req.user.id, lesson.course_id);
  
  if (!lesson.is_preview && !enrollment && req.user.role !== 'admin') {
    return res.status(403).json({ error: "Enrollment required to view this lesson" });
  }
  
  const questions = db.prepare("SELECT id, text, choices FROM questions WHERE lesson_id = ?").all(lesson.id).map((q: any) => ({
    ...q,
    choices: JSON.parse(q.choices)
  }));
  
  res.json({ ...lesson, questions });
});

app.post("/api/attempts", authenticate, (req: any, res) => {
  const { question_id, selected_index } = req.body;
  const question = db.prepare("SELECT * FROM questions WHERE id = ?").get(question_id) as any;
  const is_correct = question.correct_index === selected_index;
  
  db.prepare("INSERT INTO attempts (user_id, question_id, selected_index, is_correct) VALUES (?, ?, ?, ?)")
    .run(req.user.id, question_id, selected_index, is_correct ? 1 : 0);
    
  // Update progress
  const lesson = db.prepare("SELECT course_id FROM lessons WHERE id = ?").get(question.lesson_id) as any;
  const totalLessons = db.prepare("SELECT COUNT(*) as count FROM lessons WHERE course_id = ?").get(lesson.course_id) as any;
  const completedLessons = db.prepare(`
    SELECT COUNT(DISTINCT l.id) as count 
    FROM lessons l 
    JOIN questions q ON l.id = q.lesson_id 
    JOIN attempts a ON q.id = a.question_id 
    WHERE l.course_id = ? AND a.user_id = ? AND a.is_correct = 1
  `).get(lesson.course_id, req.user.id) as any;
  
  const progress = Math.round((completedLessons.count / totalLessons.count) * 100);
  db.prepare("UPDATE enrollments SET progress_percent = ?, last_accessed_lesson_id = ? WHERE user_id = ? AND course_id = ?")
    .run(progress, question.lesson_id, req.user.id, lesson.course_id);

  // Issue certificate if 100%
  if (progress === 100) {
    const certExists = db.prepare("SELECT id FROM certificates WHERE user_id = ? AND course_id = ?").get(req.user.id, lesson.course_id);
    if (!certExists) {
      const slug = `CERT-${req.user.id}-${lesson.course_id}-${Date.now()}`;
      db.prepare("INSERT INTO certificates (user_id, course_id, certificate_slug) VALUES (?, ?, ?)").run(req.user.id, lesson.course_id, slug);
    }
  }

  res.json({ is_correct, progress });
});

app.get("/api/users/me/progress", authenticate, (req: any, res) => {
  const progress = db.prepare(`
    SELECT c.title, c.slug, e.progress_percent, e.enrolled_at, cert.certificate_slug
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN certificates cert ON (e.user_id = cert.user_id AND e.course_id = cert.course_id)
    WHERE e.user_id = ?
  `).all(req.user.id);
  res.json(progress);
});

// Admin Routes (Simplified)
app.get("/api/admin/stats", authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
  const users = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
  const courses = db.prepare("SELECT COUNT(*) as count FROM courses").get() as any;
  const enrollments = db.prepare("SELECT COUNT(*) as count FROM enrollments").get() as any;
  res.json({ users: users.count, courses: courses.count, enrollments: enrollments.count });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
