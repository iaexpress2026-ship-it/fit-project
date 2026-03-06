import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("fitness.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    category TEXT,
    difficulty TEXT,
    duration INTEGER,
    body_part TEXT DEFAULT 'Full Body'
  );

  CREATE TABLE IF NOT EXISTS user_routines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    workout_id INTEGER,
    day_of_week TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(workout_id) REFERENCES workouts(id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    role TEXT,
    text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    ingredients TEXT,
    preparation TEXT,
    calories TEXT,
    benefits TEXT,
    category TEXT
  );
`);

// Migration: Add body_part to workouts if it doesn't exist
const tableInfo = db.pragma("table_info(workouts)") as any[];
const hasBodyPart = tableInfo.some(col => col.name === 'body_part');
if (!hasBodyPart) {
  db.exec("ALTER TABLE workouts ADD COLUMN body_part TEXT DEFAULT 'Full Body'");
}

// Seed Admin if not exists
const admin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!admin) {
  db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(
    "admin@fittrack.com",
    "admin123",
    "Admin User",
    "admin"
  );
}

// Seed some workouts if empty
const workoutCount = db.prepare("SELECT COUNT(*) as count FROM workouts").get() as { count: number };
if (workoutCount.count <= 3) { // Seed more if only the basics exist
  const insert = db.prepare("INSERT INTO workouts (title, description, category, difficulty, duration, body_part) VALUES (?, ?, ?, ?, ?, ?)");
  
  // Chest
  insert.run("Press de Banca", "Clásico para pecho.", "Strength", "Intermediate", 45, "Chest");
  insert.run("Aperturas con Mancuernas", "Aislar el pecho.", "Strength", "Beginner", 30, "Chest");
  
  // Back
  insert.run("Dominadas", "Fuerza de espalda superior.", "Strength", "Advanced", 40, "Back");
  insert.run("Remo con Barra", "Grosor de espalda.", "Strength", "Intermediate", 45, "Back");
  
  // Legs
  insert.run("Sentadillas", "El rey de los ejercicios de pierna.", "Strength", "Intermediate", 50, "Legs");
  insert.run("Prensa de Piernas", "Empuje de piernas.", "Strength", "Beginner", 40, "Legs");
  
  // Arms
  insert.run("Curl de Bíceps", "Bíceps de acero.", "Strength", "Beginner", 30, "Arms");
  insert.run("Extensiones de Tríceps", "Tríceps definidos.", "Strength", "Beginner", 30, "Arms");
  
  // Core
  insert.run("Plancha Abdominal", "Resistencia de core.", "Cardio", "Beginner", 15, "Core");
  insert.run("Elevación de Piernas", "Abdominales inferiores.", "Strength", "Intermediate", 20, "Core");
}

// Seed recipes if empty
const recipeCount = db.prepare("SELECT COUNT(*) as count FROM recipes").get() as { count: number };
if (recipeCount.count <= 5) {
  const insertRecipe = db.prepare("INSERT INTO recipes (title, ingredients, preparation, calories, benefits, category) VALUES (?, ?, ?, ?, ?, ?)");
  
  const recipesToSeed = [
    // Desayunos
    { t: "Avena con frutas y semillas", c: "Desayuno" },
    { t: "Tostadas integrales con aguacate y tomate", c: "Desayuno" },
    { t: "Yogur natural con nueces y miel", c: "Desayuno" },
    { t: "Batido de plátano y avena", c: "Desayuno" },
    { t: "Tortilla de claras con espinacas", c: "Desayuno" },
    { t: "Pudding de chía con leche vegetal", c: "Desayuno" },
    { t: "Avena nocturna con manzana y canela", c: "Desayuno" },
    { t: "Smoothie verde de espinaca y kiwi", c: "Desayuno" },
    { t: "Pan integral con mantequilla de almendra", c: "Desayuno" },
    { t: "Bowl de yogur con frutos rojos", c: "Desayuno" },
    { t: "Tortitas de avena y plátano", c: "Desayuno" },
    { t: "Huevos revueltos con champiñones", c: "Desayuno" },
    { t: "Granola casera con yogur", c: "Desayuno" },
    { t: "Batido proteico de cacao", c: "Desayuno" },
    { t: "Porridge de avena con pera", c: "Desayuno" },
    { t: "Tostada integral con hummus", c: "Desayuno" },
    { t: "Batido de mango y yogur", c: "Desayuno" },
    { t: "Avena con cacao y plátano", c: "Desayuno" },
    { t: "Huevos cocidos con aguacate", c: "Desayuno" },
    { t: "Bowl de frutas con semillas", c: "Desayuno" },
    // Comidas
    { t: "Ensalada de quinoa y verduras", c: "Comida" },
    { t: "Pollo a la plancha con brócoli", c: "Comida" },
    { t: "Salmón al horno con espárragos", c: "Comida" },
    { t: "Arroz integral con verduras", c: "Comida" },
    { t: "Lentejas guisadas ligeras", c: "Comida" },
    { t: "Ensalada de garbanzos", c: "Comida" },
    { t: "Tacos de lechuga con pollo", c: "Comida" },
    { t: "Pechuga de pavo con ensalada", c: "Comida" },
    { t: "Buddha bowl vegetal", c: "Comida" },
    { t: "Pasta integral con verduras", c: "Comida" },
    { t: "Tofu salteado con verduras", c: "Comida" },
    { t: "Ensalada de atún y aguacate", c: "Comida" },
    { t: "Arroz integral con pollo", c: "Comida" },
    { t: "Sopa de verduras casera", c: "Comida" },
    { t: "Filete de pescado con ensalada", c: "Comida" },
    { t: "Quinoa con garbanzos", c: "Comida" },
    { t: "Pollo al horno con batata", c: "Comida" },
    { t: "Ensalada mediterránea", c: "Comida" },
    { t: "Salteado de ternera y verduras", c: "Comida" },
    { t: "Wrap integral de pollo", c: "Comida" },
    // Cenas
    { t: "Crema de calabacín", c: "Cena" },
    { t: "Ensalada de tomate y mozzarella", c: "Cena" },
    { t: "Tortilla francesa con ensalada", c: "Cena" },
    { t: "Sopa de verduras ligera", c: "Cena" },
    { t: "Pescado a la plancha con espinacas", c: "Cena" },
    { t: "Revuelto de champiñones", c: "Cena" },
    { t: "Ensalada de aguacate y huevo", c: "Cena" },
    { t: "Crema de calabaza", c: "Cena" },
    { t: "Tofu a la plancha con verduras", c: "Cena" },
    { t: "Ensalada de pollo ligera", c: "Cena" },
    { t: "Verduras al horno", c: "Cena" },
    { t: "Hummus con crudités", c: "Cena" },
    { t: "Salmón con ensalada verde", c: "Cena" },
    { t: "Tortilla de espinacas", c: "Cena" },
    { t: "Crema de zanahoria", c: "Cena" },
    { t: "Ensalada de garbanzos ligera", c: "Cena" },
    { t: "Pavo a la plancha con verduras", c: "Cena" },
    { t: "Berenjena asada con tomate", c: "Cena" },
    { t: "Sopa de miso con tofu", c: "Cena" },
    { t: "Ensalada verde con semillas", c: "Cena" },
    // Snacks, Batidos, Postres (all as Snack category)
    { t: "Yogur con frutas", c: "Snack" },
    { t: "Manzana con mantequilla de cacahuete", c: "Snack" },
    { t: "Puñado de frutos secos", c: "Snack" },
    { t: "Zanahorias con hummus", c: "Snack" },
    { t: "Batido de proteína", c: "Snack" },
    { t: "Galletas de avena caseras", c: "Snack" },
    { t: "Rodajas de pepino con limón", c: "Snack" },
    { t: "Palitos de apio con hummus", c: "Snack" },
    { t: "Fruta fresca variada", c: "Snack" },
    { t: "Chocolate negro 85%", c: "Snack" },
    { t: "Batido de frutos rojos", c: "Snack" },
    { t: "Yogur griego con nueces", c: "Snack" },
    { t: "Barrita energética casera", c: "Snack" },
    { t: "Smoothie de plátano", c: "Snack" },
    { t: "Pera con canela", c: "Snack" },
    { t: "Tostada integral con aguacate", c: "Snack" },
    { t: "Semillas de calabaza", c: "Snack" },
    { t: "Batido verde detox", c: "Snack" },
    { t: "Gelatina sin azúcar", c: "Snack" },
    { t: "Yogur con chía", c: "Snack" },
    { t: "Smoothie verde detox", c: "Snack" },
    { t: "Smoothie de frutos rojos", c: "Snack" },
    { t: "Batido de espinaca y piña", c: "Snack" },
    { t: "Smoothie de proteína y cacao", c: "Snack" },
    { t: "Batido de melocotón", c: "Snack" },
    { t: "Smoothie tropical", c: "Snack" },
    { t: "Batido de kiwi y manzana", c: "Snack" },
    { t: "Smoothie de piña y coco", c: "Snack" },
    { t: "Smoothie de arándanos", c: "Snack" },
    { t: "Batido de fresa y yogur", c: "Snack" },
    { t: "Smoothie de plátano y cacao", c: "Snack" },
    { t: "Smoothie verde con pepino", c: "Snack" },
    { t: "Batido proteico de vainilla", c: "Snack" },
    { t: "Smoothie de mango y espinaca", c: "Snack" },
    { t: "Batido de avena y cacao", c: "Snack" },
    { t: "Smoothie antioxidante", c: "Snack" },
    { t: "Pudding de chía y cacao", c: "Snack" },
    { t: "Manzana asada con canela", c: "Snack" },
    { t: "Helado de plátano congelado", c: "Snack" },
    { t: "Brownie saludable de avena", c: "Snack" },
    { t: "Mousse de cacao y aguacate", c: "Snack" },
    { t: "Gelatina natural de frutas", c: "Snack" },
    { t: "Tarta saludable de yogur", c: "Snack" },
    { t: "Galletas de avena y plátano", c: "Snack" },
    { t: "Trufas de cacao y dátiles", c: "Snack" },
    { t: "Pudding de chía y mango", c: "Snack" },
    { t: "Compota de manzana casera", c: "Snack" },
    { t: "Helado de yogur y frutas", c: "Snack" },
    { t: "Barritas de avena y frutos secos", c: "Snack" },
    { t: "Tarta fría de yogur", c: "Snack" },
    { t: "Peras al horno", c: "Snack" },
    { t: "Crema dulce de ricotta y miel", c: "Snack" },
    { t: "Copas de yogur y frutos rojos", c: "Snack" },
    { t: "Flan saludable de huevo", c: "Snack" },
    { t: "Chocolate negro con frutas", c: "Snack" }
  ];

  recipesToSeed.forEach(r => {
    insertRecipe.run(
      r.t,
      "verduras frescas, proteína magra o vegetal, aceite de oliva, especias naturales.",
      "combinar los ingredientes frescos, cocinar al horno, plancha o hervido según corresponda y servir equilibrado.",
      "200–450 kcal",
      "receta equilibrada rica en nutrientes, adecuada para alimentación saludable y apoyo a objetivos de pérdida de peso.",
      r.c
    );
  });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Endpoints
  app.post("/api/register", (req, res) => {
    const { email, password, name } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)").run(email, password, name);
      res.json({ id: info.lastInsertRowid, email, name, role: 'user' });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Workout Endpoints
  app.get("/api/workouts", (req, res) => {
    const workouts = db.prepare("SELECT * FROM workouts").all();
    res.json(workouts);
  });

  app.post("/api/workouts", (req, res) => {
    const { title, description, category, difficulty, duration, body_part } = req.body;
    const info = db.prepare("INSERT INTO workouts (title, description, category, difficulty, duration, body_part) VALUES (?, ?, ?, ?, ?, ?)").run(title, description, category, difficulty, duration, body_part || 'Full Body');
    res.json({ id: info.lastInsertRowid, ...req.body });
  });

  app.delete("/api/workouts/:id", (req, res) => {
    db.prepare("DELETE FROM workouts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Routine Endpoints
  app.get("/api/routines/:userId", (req, res) => {
    const routines = db.prepare(`
      SELECT ur.*, w.title, w.category, w.duration, w.body_part 
      FROM user_routines ur 
      JOIN workouts w ON ur.workout_id = w.id 
      WHERE ur.user_id = ?
    `).all(req.params.userId);
    res.json(routines);
  });

  app.post("/api/routines", (req, res) => {
    const { userId, workoutId, dayOfWeek } = req.body;
    const info = db.prepare("INSERT INTO user_routines (user_id, workout_id, day_of_week) VALUES (?, ?, ?)").run(userId, workoutId, dayOfWeek);
    res.json({ id: info.lastInsertRowid, ...req.body });
  });

  app.delete("/api/routines/:id", (req, res) => {
    db.prepare("DELETE FROM user_routines WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Chat Endpoints
  app.get("/api/chat/:userId", (req, res) => {
    const messages = db.prepare("SELECT role, text FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC").all(req.params.userId);
    res.json(messages);
  });

  app.post("/api/chat", (req, res) => {
    const { userId, role, text } = req.body;
    db.prepare("INSERT INTO chat_messages (user_id, role, text) VALUES (?, ?, ?)").run(userId, role, text);
    res.json({ success: true });
  });

  // Recipe Endpoints
  app.get("/api/recipes", (req, res) => {
    const recipes = db.prepare("SELECT * FROM recipes").all();
    res.json(recipes);
  });

  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
