const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { CohereClient } = require('cohere-ai');

// ── Initialise AI providers ──
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const cohere = process.env.COHERE_API_KEY ? new CohereClient({ token: process.env.COHERE_API_KEY }) : null;

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

// ── Chapter prompts ──
const chapterPrompts = {
  1: (topic) => `Write Chapter One (Introduction) for a Nigerian university final year research project titled "${topic}". Include these sections: 1.1 Background of the Study, 1.2 Statement of the Problem, 1.3 Objectives of the Study, 1.4 Research Questions, 1.5 Research Hypotheses, 1.6 Significance of the Study, 1.7 Scope of the Study, 1.8 Limitations, 1.9 Definition of Terms. Write in formal academic English. No bullet points. Write in paragraphs only. Minimum 1500 words.`,

  2: (topic) => `Write Chapter Two (Literature Review) for a Nigerian university final year research project titled "${topic}". Include: 2.1 Introduction, 2.2 Conceptual Review, 2.3 Theoretical Framework, 2.4 Empirical Review with specific authors and studies from 2015 to present including Nigerian scholars, 2.5 Gap in Literature, 2.6 Summary. Write in formal academic English. No bullet points. Write in paragraphs only. Minimum 1500 words.`,

  3: (topic) => `Write Chapter Three (Research Methodology) for a Nigerian university final year research project titled "${topic}". Include: 3.1 Introduction, 3.2 Research Design, 3.3 Population of the Study, 3.4 Sample Size and Sampling Technique, 3.5 Research Instrument, 3.6 Validity, 3.7 Reliability, 3.8 Method of Data Collection, 3.9 Method of Data Analysis. Write in formal academic English. No bullet points. Write in paragraphs only. Minimum 1200 words.`,

  4: (topic) => `Write Chapter Four (Data Presentation, Analysis and Discussion of Findings) for a Nigerian university final year research project titled "${topic}". Include: 4.1 Introduction, 4.2 Demographic Data, 4.3 Data Presentation with at least 5 tables showing frequencies and percentages, 4.4 Test of Hypotheses, 4.5 Discussion of Findings linking to literature. Write in formal academic English. No bullet points. Write in paragraphs only. Minimum 1500 words.`,

  5: (topic) => `Write Chapter Five (Summary, Conclusion and Recommendations) for a Nigerian university final year research project titled "${topic}". Include: 5.1 Introduction, 5.2 Summary of the Study, 5.3 Summary of Findings, 5.4 Conclusion, 5.5 Recommendations, 5.6 Contributions to Knowledge, 5.7 Limitations, 5.8 Suggestions for Further Research. Write in formal academic English. No bullet points. Write in paragraphs only. Minimum 1200 words.`,

  6: (topic, refStyle) => `Generate 25 academic references for a research project titled "${topic}" in ${refStyle || 'APA 7th edition'} format. Include Nigerian and African authors. References from 2015 to present. Arrange alphabetically. Only the references list, nothing else.`
};

// ── Chart data generator ──
const generateChartData = () => {
  return {
    barChart: {
      labels: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'],
      data: [35, 28, 18, 12, 7]
    },
    pieChart: {
      labels: ['Very High Impact', 'High Impact', 'Moderate Impact', 'Low Impact'],
      data: [38, 32, 20, 10]
    }
  };
};

// ── Generate with Groq ──
const generateWithGroq = async (prompt) => {
  if (!groq) throw new Error('Groq not configured');
  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an expert academic writer for Nigerian universities. Write formally, naturally, never use bullet points, always use paragraphs.'
      },
      { role: 'user', content: prompt }
    ],
    model: 'llama3-8b-8192',
    temperature: 0.7,
    max_tokens: 1500
  });
  return completion.choices[0].message.content;
};

const generateWithGemini = async (prompt) => {
  if (!genAI) throw new Error('Gemini not configured');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

const generateWithCohere = async (prompt) => {
  if (!cohere) throw new Error('Cohere not configured');
  const response = await cohere.chat({
    model: 'command-r',
    messages: [
      {
        role: 'user',
        content: `You are an expert academic writer for Nigerian universities. Write formally, naturally, never use bullet points, always use paragraphs.\n\n${prompt}`
      }
    ],
    maxTokens: 1500,
    temperature: 0.7
  });
  return response.message.content[0].text;
};

// ── Try all providers in order ──
const generateContent = async (prompt) => {
  // Try Groq first
  try {
    const content = await generateWithGroq(prompt);
    console.log('Generated with Groq');
    return content;
  } catch (groqError) {
    console.log('Groq failed:', groqError.message);
  }

  // Try Gemini second
  try {
    const content = await generateWithGemini(prompt);
    console.log('Generated with Gemini');
    return content;
  } catch (geminiError) {
    console.log('Gemini failed:', geminiError.message);
  }

  // Try Cohere third
  try {
    const content = await generateWithCohere(prompt);
    console.log('Generated with Cohere');
    return content;
  } catch (cohereError) {
    console.log('Cohere failed:', cohereError.message);
  }

  throw new Error('All AI providers are currently unavailable. Please try again in a few minutes.');
};

// ── Generate chapter ──
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { topic, chapterNumber, userPrompt, referenceStyle } = req.body;

    if (!topic) return res.status(400).json({ message: 'Project topic is required.' });
    if (!chapterNumber) return res.status(400).json({ message: 'Chapter number is required.' });

    let prompt = chapterPrompts[chapterNumber]
      ? chapterPrompts[chapterNumber](topic, referenceStyle)
      : `Write chapter ${chapterNumber} for a Nigerian university research project titled "${topic}". Write in formal academic English, no bullet points, paragraphs only. Minimum 1200 words.`;

    if (userPrompt) {
      prompt += ` Additional instructions: ${userPrompt}`;
    }

    const generatedContent = await generateContent(prompt);

    let chartData = null;
    if (parseInt(chapterNumber) === 3) {
      chartData = generateChartData();
    }

    res.json({
      message: 'Chapter generated successfully.',
      content: generatedContent,
      chartData,
      chapterNumber,
      topic
    });

  } catch (error) {
    console.error('AI generation error:', error.message);
    res.status(500).json({
      message: error.message || 'Error generating content. Please try again.'
    });
  }
});

// ── Edit chapter ──
router.post('/edit', authMiddleware, async (req, res) => {
  try {
    const { content, userPrompt } = req.body;

    if (!content) return res.status(400).json({ message: 'Content is required.' });
    if (!userPrompt) return res.status(400).json({ message: 'Prompt is required.' });

    const prompt = `Here is an existing chapter from a Nigerian university final year project: "${content.substring(0, 500)}..." The student wants these changes: "${userPrompt}". Rewrite the chapter with these changes. Write in formal academic English. No bullet points. Paragraphs only.`;

    const editedContent = await generateContent(prompt);

    res.json({
      message: 'Chapter updated successfully.',
      content: editedContent
    });

  } catch (error) {
    console.error('AI edit error:', error.message);
    res.status(500).json({
      message: error.message || 'Error editing content. Please try again.'
    });
  }
});

module.exports = router;