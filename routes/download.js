const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = require('docx');
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

// ── Helper: get project and chapters ──
const getProjectData = async (projectId, userId) => {
  const projectResult = await pool.query(
    'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );

  if (projectResult.rows.length === 0) return null;

  const project = projectResult.rows[0];

  const chaptersResult = await pool.query(
    'SELECT * FROM chapters WHERE project_id = $1 ORDER BY chapter_number',
    [projectId]
  );

  project.chapters = chaptersResult.rows;
  return project;
};

// ── Download as PDF ──
router.get('/pdf/:projectId', authMiddleware, async (req, res) => {
  try {
    const project = await getProjectData(req.params.projectId, req.user.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Create PDF document
    const doc = new PDFDocument({
      margin: 72,
      size: 'A4'
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);

    doc.pipe(res);

    // ── Cover Page ──
    doc.moveDown(8);
    doc.fontSize(18).font('Helvetica-Bold').text(project.title.toUpperCase(), {
      align: 'center'
    });
    doc.moveDown(2);
    doc.fontSize(13).font('Helvetica').text('A Research Project', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(12).text(`Department: ${project.department || 'N/A'}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Level: ${project.level || 'N/A'}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

    // ── Table of Contents ──
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('TABLE OF CONTENTS', { align: 'center' });
    doc.moveDown(1.5);

    const chapterTitles = [
      'Chapter One: Introduction',
      'Chapter Two: Literature Review',
      'Chapter Three: Research Methodology',
      'Chapter Four: Data Presentation and Analysis',
      'Chapter Five: Summary, Conclusion and Recommendations',
      'References'
    ];

    chapterTitles.forEach((title, index) => {
      doc.fontSize(11).font('Helvetica').text(title, { continued: true });
      doc.text(` ................... ${index + 3}`, { align: 'right' });
      doc.moveDown(0.5);
    });

    // ── Chapters ──
    const chapterHeadings = [
      'CHAPTER ONE: INTRODUCTION',
      'CHAPTER TWO: LITERATURE REVIEW',
      'CHAPTER THREE: RESEARCH METHODOLOGY',
      'CHAPTER FOUR: DATA PRESENTATION, ANALYSIS AND DISCUSSION OF FINDINGS',
      'CHAPTER FIVE: SUMMARY, CONCLUSION AND RECOMMENDATIONS',
      'REFERENCES'
    ];

    project.chapters.forEach((chapter, index) => {
      doc.addPage();

      // Chapter heading
      doc.fontSize(14).font('Helvetica-Bold').text(chapterHeadings[index] || `CHAPTER ${index + 1}`, {
        align: 'center'
      });

      doc.moveDown(1.5);

      // Chapter content
      if (chapter.content && chapter.content.trim()) {
        const paragraphs = chapter.content.split('\n\n');
        paragraphs.forEach(paragraph => {
          if (paragraph.trim()) {
            // Check if it's a heading (short line ending without period)
            if (paragraph.trim().length < 80 && !paragraph.trim().endsWith('.') && paragraph.trim() === paragraph.trim().toUpperCase()) {
              doc.fontSize(12).font('Helvetica-Bold').text(paragraph.trim());
            } else {
              doc.fontSize(11).font('Helvetica').text(paragraph.trim(), {
                align: 'justify',
                lineGap: 4
              });
            }
            doc.moveDown(0.8);
          }
        });
      } else {
        doc.fontSize(11).font('Helvetica').text('This chapter has not been generated yet.', {
          align: 'center',
          color: '#888888'
        });
      }
    });

    doc.end();

  } catch (error) {
    console.error('PDF generation error:', error.message);
    res.status(500).json({ message: 'Error generating PDF. Please try again.' });
  }
});

// ── Download as DOCX ──
router.get('/docx/:projectId', authMiddleware, async (req, res) => {
  try {
    const project = await getProjectData(req.params.projectId, req.user.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const chapterHeadings = [
      'CHAPTER ONE: INTRODUCTION',
      'CHAPTER TWO: LITERATURE REVIEW',
      'CHAPTER THREE: RESEARCH METHODOLOGY',
      'CHAPTER FOUR: DATA PRESENTATION, ANALYSIS AND DISCUSSION OF FINDINGS',
      'CHAPTER FIVE: SUMMARY, CONCLUSION AND RECOMMENDATIONS',
      'REFERENCES'
    ];

    const children = [];

    // ── Cover Page ──
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '', break: 1 })]
      }),
      new Paragraph({
        children: [new TextRun({ text: '', break: 1 })]
      }),
      new Paragraph({
        children: [new TextRun({ text: '', break: 1 })]
      }),
      new Paragraph({
        text: project.title.toUpperCase(),
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        children: [new TextRun({ text: '', break: 1 })]
      }),
      new Paragraph({
        children: [new TextRun({ text: 'A Research Project', size: 28 })],
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        children: [new TextRun({ text: `Department: ${project.department || 'N/A'}`, size: 24 })],
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        children: [new TextRun({ text: `Level: ${project.level || 'N/A'}`, size: 24 })],
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 24 })],
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({
        children: [new PageBreak()]
      })
    );

    // ── Table of Contents ──
    children.push(
      new Paragraph({
        text: 'TABLE OF CONTENTS',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER
      }),
      new Paragraph({ text: '' })
    );

    const tocItems = [
      'Chapter One: Introduction',
      'Chapter Two: Literature Review',
      'Chapter Three: Research Methodology',
      'Chapter Four: Data Presentation and Analysis',
      'Chapter Five: Summary, Conclusion and Recommendations',
      'References'
    ];

    tocItems.forEach(item => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: item, size: 22 })]
        })
      );
    });

    children.push(new Paragraph({ children: [new PageBreak()] }));

    // ── Chapters ──
    project.chapters.forEach((chapter, index) => {
      // Chapter heading
      children.push(
        new Paragraph({
          text: chapterHeadings[index] || `CHAPTER ${index + 1}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({ text: '' })
      );

      // Chapter content
      if (chapter.content && chapter.content.trim()) {
        const paragraphs = chapter.content.split('\n\n');
        paragraphs.forEach(paragraph => {
          if (paragraph.trim()) {
            const isHeading = paragraph.trim().length < 80 &&
              !paragraph.trim().endsWith('.') &&
              paragraph.trim() === paragraph.trim().toUpperCase();

            if (isHeading) {
              children.push(
                new Paragraph({
                  text: paragraph.trim(),
                  heading: HeadingLevel.HEADING_2
                })
              );
            } else {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: paragraph.trim(),
                      size: 24,
                      font: 'Times New Roman'
                    })
                  ],
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { after: 200, line: 360 }
                })
              );
            }
          }
        });
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'This chapter has not been generated yet.',
                size: 24,
                color: '888888'
              })
            ],
            alignment: AlignmentType.CENTER
          })
        );
      }

      // Page break after each chapter except the last
      if (index < project.chapters.length - 1) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });

    // ── Create document ──
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children
      }]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${project.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);

    res.send(buffer);

  } catch (error) {
    console.error('DOCX generation error:', error.message);
    res.status(500).json({ message: 'Error generating DOCX. Please try again.' });
  }
});

module.exports = router;