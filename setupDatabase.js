const pool = require('./database');

const setupDatabase = async () => {
  try {
    // ── Create users table ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        university VARCHAR(255),
        department VARCHAR(255),
        country VARCHAR(100),
        level VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table created successfully.');

    // ── Create projects table ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        department VARCHAR(255),
        level VARCHAR(100),
        description TEXT,
        status VARCHAR(50) DEFAULT 'progress',
        current_chapter INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Projects table created successfully.');

    // ── Create chapters table ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chapters (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        chapter_number INTEGER NOT NULL,
        title VARCHAR(255),
        content TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        chart_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Chapters table created successfully.');

    // ── Create prompts table ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id SERIAL PRIMARY KEY,
        chapter_id INTEGER REFERENCES chapters(id) ON DELETE CASCADE,
        user_prompt TEXT NOT NULL,
        ai_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Prompts table created successfully.');

    // ── Create datasets table ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS datasets (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        file_name VARCHAR(255),
        original_name VARCHAR(255),
        file_path VARCHAR(500),
        file_size INTEGER,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Datasets table created successfully.');

    console.log('All database tables created successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error setting up database:', error.message);
    process.exit(1);
  }
};

setupDatabase();