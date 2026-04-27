const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../database');

// ── Auth middleware ──
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorised. Please log in.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// ── Get all projects for a user ──
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get projects error:', error.message);
    res.status(500).json({ message: 'Error fetching projects.' });
  }
});

// ── Get single project ──
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get project error:', error.message);
    res.status(500).json({ message: 'Error fetching project.' });
  }
});

// ── Create new project ──
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, department, level, description } = req.body;

    if (!title) return res.status(400).json({ message: 'Project title is required.' });

    // Create the project
    const result = await pool.query(
      `INSERT INTO projects (user_id, title, department, level, description, status, current_chapter)
       VALUES ($1, $2, $3, $4, $5, 'progress', 1)
       RETURNING *`,
      [req.user.id, title, department, level, description]
    );

    const project = result.rows[0];

    // Create empty chapter records for all 6 chapters
    const chapterTitles = [
      'Chapter 1 — Introduction',
      'Chapter 2 — Literature Review',
      'Chapter 3 — Methodology',
      'Chapter 4 — Data Analysis',
      'Chapter 5 — Conclusion',
      'References'
    ];

    for (let i = 1; i <= 6; i++) {
      await pool.query(
        `INSERT INTO chapters (project_id, chapter_number, title, content, status)
         VALUES ($1, $2, $3, '', 'pending')`,
        [project.id, i, chapterTitles[i - 1]]
      );
    }

    res.status(201).json(project);

  } catch (error) {
    console.error('Create project error:', error.message);
    res.status(500).json({ message: 'Error creating project.' });
  }
});

// ── Update project ──
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, department, level, description, status, currentChapter } = req.body;

    const result = await pool.query(
      `UPDATE projects SET
        title = COALESCE($1, title),
        department = COALESCE($2, department),
        level = COALESCE($3, level),
        description = COALESCE($4, description),
        status = COALESCE($5, status),
        current_chapter = COALESCE($6, current_chapter),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [title, department, level, description, status, currentChapter, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update project error:', error.message);
    res.status(500).json({ message: 'Error updating project.' });
  }
});

// ── Delete project ──
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    res.json({ message: 'Project deleted successfully.' });

  } catch (error) {
    console.error('Delete project error:', error.message);
    res.status(500).json({ message: 'Error deleting project.' });
  }
});

module.exports = router;