const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../database');
const multer = require('multer');
const path = require('path');

// ── File upload setup ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

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

// ── Get all chapters for a project ──
router.get('/:projectId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM chapters WHERE project_id = $1 ORDER BY chapter_number',
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get chapters error:', error.message);
    res.status(500).json({ message: 'Error fetching chapters.' });
  }
});

// ── Save chapter content ──
router.put('/:projectId/chapter/:chapterNum', authMiddleware, async (req, res) => {
  try {
    const { content, status, chartData } = req.body;
    const { projectId, chapterNum } = req.params;

    // Check if chapter exists
    const existing = await pool.query(
      'SELECT id FROM chapters WHERE project_id = $1 AND chapter_number = $2',
      [projectId, chapterNum]
    );

    if (existing.rows.length === 0) {
      // Create chapter if it does not exist
      await pool.query(
        `INSERT INTO chapters (project_id, chapter_number, title, content, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, chapterNum, 'Chapter ' + chapterNum, content, status || 'active']
      );
    } else {
      // Update existing chapter
      await pool.query(
        `UPDATE chapters SET
          content = $1,
          status = COALESCE($2, status),
          chart_data = COALESCE($3, chart_data),
          updated_at = CURRENT_TIMESTAMP
         WHERE project_id = $4 AND chapter_number = $5`,
        [content, status, chartData ? JSON.stringify(chartData) : null, projectId, chapterNum]
      );
    }

    // Update project updated_at
    await pool.query(
      'UPDATE projects SET updated_at = CURRENT_TIMESTAMP, current_chapter = $1 WHERE id = $2',
      [chapterNum, projectId]
    );

    res.json({ message: 'Chapter saved successfully.' });

  } catch (error) {
    console.error('Save chapter error:', error.message);
    res.status(500).json({ message: 'Error saving chapter.' });
  }
});

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Chapter not found.' });
    }

    // Update project updated_at
    await pool.query(
      'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [projectId]
    );

    res.json({
      message: 'Chapter saved successfully.',
      chapter: result.rows[0]
    });

  } catch (error) {
    console.error('Save chapter error:', error.message);
    res.status(500).json({ message: 'Error saving chapter.' });
  }
});

// ── Upload dataset ──
router.post('/:projectId/dataset', authMiddleware, upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    await pool.query(
      `INSERT INTO datasets (project_id, file_name, original_name, file_path, file_size)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.projectId, req.file.filename, req.file.originalname, req.file.path, req.file.size]
    );

    res.json({
      message: 'Dataset uploaded successfully.',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });

  } catch (error) {
    console.error('Upload dataset error:', error.message);
    res.status(500).json({ message: 'Error uploading dataset.' });
  }
});

// ── Save prompt history ──
router.post('/:projectId/history', authMiddleware, async (req, res) => {
  try {
    const { chapterNumber, prompt, response } = req.body;
    const { projectId } = req.params;

    // Get chapter id
    const chapterResult = await pool.query(
      'SELECT id FROM chapters WHERE project_id = $1 AND chapter_number = $2',
      [projectId, chapterNumber]
    );

    if (chapterResult.rows.length === 0) {
      return res.status(404).json({ message: 'Chapter not found.' });
    }

    const chapterId = chapterResult.rows[0].id;

    await pool.query(
      'INSERT INTO prompts (chapter_id, user_prompt, ai_response) VALUES ($1, $2, $3)',
      [chapterId, prompt, response]
    );

    res.json({ message: 'History saved successfully.' });

  } catch (error) {
    console.error('Save history error:', error.message);
    res.status(500).json({ message: 'Error saving history.' });
  }
});

// ── Get prompt history ──
router.get('/:projectId/history', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      `SELECT p.*, c.chapter_number, c.title 
       FROM prompts p 
       JOIN chapters c ON p.chapter_id = c.id 
       WHERE c.project_id = $1 
       ORDER BY p.created_at DESC`,
      [projectId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get history error:', error.message);
    res.status(500).json({ message: 'Error fetching history.' });
  }
});

module.exports = router;