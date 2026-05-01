const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Initialise Groq & Gemini ──
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  1: (topic) => `You are a highly experienced academic writer helping a Nigerian university final year student write their research project. Write a very comprehensive, detailed and lengthy Chapter One (Introduction) for a research project titled "${topic}". 

The chapter must include ALL of the following sections written in great detail:

1.1 Background of the Study - Write at least 5 detailed paragraphs covering the historical background, current situation, and context of the research topic. Include global, African and Nigerian perspectives.

1.2 Statement of the Problem - Write at least 3 detailed paragraphs clearly stating the problem, what is known, what is unknown, and why this study is necessary.

1.3 Objectives of the Study - State the general objective and at least 5 specific objectives clearly and in detail.

1.4 Research Questions - State at least 5 research questions that align with the objectives.

1.5 Research Hypotheses - State at least 3 hypotheses for the study.

1.6 Significance of the Study - Write at least 4 detailed paragraphs explaining who benefits from this study and how.

1.7 Scope of the Study - Write 2 detailed paragraphs on the geographical, content and time scope of the study.

1.8 Limitations of the Study - Write 2 paragraphs on the limitations encountered.

1.9 Definition of Terms - Define at least 8 key terms used in the study operationally and conceptually.

Write in formal academic English suitable for a Nigerian university. Write naturally as a human academic writer would. Do not use bullet points anywhere. Write everything in proper academic paragraphs. The chapter must be very long, detailed and thorough — at least 3000 words.`,

  2: (topic) => `You are a highly experienced academic writer helping a Nigerian university final year student write their research project. Write a very comprehensive, detailed and lengthy Chapter Two (Literature Review) for a research project titled "${topic}".

The chapter must include ALL of the following sections written in great detail:

2.1 Introduction - Brief introduction to the chapter.

2.2 Conceptual Review - Write at least 6 detailed paragraphs reviewing the key concepts in the study. Define and discuss each concept extensively.

2.3 Theoretical Framework - Write at least 4 detailed paragraphs discussing the theories underpinning this study. Name specific theories and their authors, explain each theory and how it relates to the study.

2.4 Empirical Review - Write at least 8 detailed paragraphs reviewing previous studies related to this topic. Cite specific authors, years, findings and how they relate to the current study. Include Nigerian and African scholars as well as international scholars. Include studies from 2015 to present.

2.5 Gap in Literature - Write 2 detailed paragraphs identifying what is missing from existing literature that this study addresses.

2.6 Summary - Brief summary of the chapter.

Write in formal academic English suitable for a Nigerian university. Write naturally as a human academic writer would. Do not use bullet points anywhere. Write everything in proper academic paragraphs. The chapter must be very long, detailed and thorough — at least 3500 words.`,

  3: (topic) => `You are a highly experienced academic writer helping a Nigerian university final year student write their research project. Write a very comprehensive, detailed and lengthy Chapter Three (Research Methodology) for a research project titled "${topic}".

The chapter must include ALL of the following sections written in great detail:

3.1 Introduction - Brief introduction to the chapter.

3.2 Research Design - Write 3 detailed paragraphs explaining the research design adopted, why it was chosen and how it suits the study.

3.3 Population of the Study - Write 2 detailed paragraphs describing the target population.

3.4 Sample Size and Sampling Technique - Write 3 detailed paragraphs explaining the sample size, how it was determined and the sampling technique used.

3.5 Research Instrument - Write 3 detailed paragraphs describing the instrument used for data collection, its structure and how it was administered.

3.6 Validity of the Instrument - Write 2 detailed paragraphs on how the instrument was validated.

3.7 Reliability of the Instrument - Write 2 detailed paragraphs on how reliability was established including the reliability coefficient obtained.

3.8 Method of Data Collection - Write 2 detailed paragraphs explaining how data was collected.

3.9 Method of Data Analysis - Write 2 detailed paragraphs explaining how the data was analysed including the statistical tools used.

Write in formal academic English suitable for a Nigerian university. Write naturally as a human academic writer would. Do not use bullet points anywhere. Write everything in proper academic paragraphs. The chapter must be very long, detailed and thorough — at least 2500 words.`,

  4: (topic) => `You are a highly experienced academic writer helping a Nigerian university final year student write their research project. Write a very comprehensive, detailed and lengthy Chapter Four (Data Presentation, Analysis and Discussion of Findings) for a research project titled "${topic}".

The chapter must include ALL of the following sections written in great detail:

4.1 Introduction - Briefly restate the purpose of the study and the method of analysis used.

4.2 Demographic Data of Respondents - Present and analyse the demographic information of respondents including gender, age, level of study, and faculty. Write detailed interpretations for each demographic variable.

4.3 Data Presentation and Analysis - Present the data collected organised into at least 8 detailed tables with frequencies and percentages. Number and title all tables properly as Table 4.1, Table 4.2 etc. For each table write a detailed interpretation focusing on trends, majority responses and comparisons. Each table interpretation must be at least 2 paragraphs long.

4.4 Test of Hypotheses - Test all hypotheses stated in chapter one. For each hypothesis restate it clearly, present the basis of testing using the data, and conclude clearly whether the hypothesis is accepted or rejected. Write detailed explanations for each decision.

4.5 Discussion of Findings - Write at least 6 detailed paragraphs linking findings directly to research objectives and literature reviewed in chapter two. Use phrases like this finding agrees with, this is consistent with the study of, this contradicts. Mention specific authors and studies from chapter two.

Write in formal academic English suitable for a Nigerian university. Write naturally as a human academic writer would. Do not use bullet points anywhere. Write everything in proper academic paragraphs. The chapter must be very long, detailed and thorough — at least 4000 words.`,

  5: (topic) => `You are a highly experienced academic writer helping a Nigerian university final year student write their research project. Write a very comprehensive, detailed and lengthy Chapter Five (Summary, Conclusion and Recommendations) for a research project titled "${topic}".

The chapter must include ALL of the following sections written in great detail:

5.1 Introduction - Brief introduction to the chapter.

5.2 Summary of the Study - Write 3 detailed paragraphs summarising the entire study from chapter one to chapter four.

5.3 Summary of Findings - Write detailed paragraphs summarising each major finding of the study. There must be at least 6 findings each explained in a full paragraph.

5.4 Conclusion - Write 3 detailed paragraphs drawing conclusions from the findings of the study.

5.5 Recommendations - Write at least 6 detailed recommendations each in a full paragraph. Address recommendations to students, university administrators, policymakers and future researchers.

5.6 Contributions to Knowledge - Write 2 detailed paragraphs explaining how this study contributes to existing knowledge.

5.7 Limitations of the Study - Write 2 paragraphs on the limitations encountered during the study.

5.8 Suggestions for Further Research - Write 2 detailed paragraphs suggesting areas for further research.

Write in formal academic English suitable for a Nigerian university. Write naturally as a human academic writer would. Do not use bullet points anywhere. Write everything in proper academic paragraphs. The chapter must be very long, detailed and thorough — at least 3000 words.`,

  6: (topic, refStyle) => `Generate a very comprehensive list of academic references for a research project titled "${topic}". Format all references strictly in ${refStyle || 'APA 7th edition'} format.

Include at least 30 references from the following sources:
- Academic journal articles
- Books and textbooks
- Conference papers
- Government and institutional reports
- Credible online sources

Requirements:
- Include Nigerian and African authors and publications
- Include international scholars
- References should mostly be from 2015 to present
- All references must be real and verifiable
- Arrange all references in alphabetical order by author surname
- Every reference must be complete with all required details

Write nothing else except the references list. No introduction, no conclusion, just the references.`
};

// ── Chart data generator ──
const generateChartData = (topic) => {
  return {
    barChart: {
      title: 'Survey Response Distribution by Category',
      labels: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'],
      data: [35, 28, 18, 12, 7],
      color: '#534AB7'
    },
    pieChart: {
      title: 'Overall Impact Assessment',
      labels: ['Very High Impact', 'High Impact', 'Moderate Impact', 'Low Impact'],
      data: [38, 32, 20, 10],
      colors: ['#534AB7', '#38a169', '#d69e2e', '#e53e3e']
    },
    lineChart: {
      title: 'Trend Analysis Over Time',
      labels: ['2019', '2020', '2021', '2022', '2023', '2024'],
      data: [42, 48, 55, 63, 71, 78],
      color: '#534AB7'
    },
    tableData: {
      title: 'Frequency Distribution of Responses',
      headers: ['Response Category', 'Frequency', 'Percentage (%)'],
      rows: [
        ['Strongly Agree', '88', '35.2'],
        ['Agree', '70', '28.0'],
        ['Neutral', '45', '18.0'],
        ['Disagree', '30', '12.0'],
        ['Strongly Disagree', '17', '6.8'],
        ['Total', '250', '100.0']
      ]
    }
  };
};

// ── Helper: generate with Gemini ──
const generateWithGemini = async (prompt) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// ── Helper: generate with Groq ──
const generateWithGroq = async (systemPrompt, userPrompt) => {
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    model: 'llama3-8b-8192',
    temperature: 0.7,
    max_tokens: 2000
  });
  return completion.choices[0].message.content;
};

// ── Helper: try Groq then fall back to Gemini ──
const generateContent = async (systemPrompt, userPrompt) => {
  try {
    const content = await generateWithGroq(systemPrompt, userPrompt);
    console.log('Generated with Groq');
    return content;
  } catch (groqError) {
    console.log('Groq failed, switching to Gemini:', groqError.message);
    const content = await generateWithGemini(userPrompt);
    console.log('Generated with Gemini');
    return content;
  }
};

// ── Generate chapter ──
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { topic, chapterNumber, userPrompt, referenceStyle } = req.body;

    if (!topic) return res.status(400).json({ message: 'Project topic is required.' });
    if (!chapterNumber) return res.status(400).json({ message: 'Chapter number is required.' });

    let prompt = chapterPrompts[chapterNumber]
      ? chapterPrompts[chapterNumber](topic, referenceStyle)
      : `Write a very detailed and comprehensive chapter ${chapterNumber} for a research project titled "${topic}". Write at least 2500 words in formal academic English suitable for a Nigerian university.`;

    if (userPrompt) {
      prompt += ` Additional instructions from the student: ${userPrompt}`;
    }

    const systemPrompt = 'You are an expert academic writer specialising in Nigerian university research projects. You write in a natural, human academic style that does not sound AI-generated. Your writing is formal, thorough, and academically rigorous. You never use bullet points. You always write in proper academic paragraphs.';

    const generatedContent = await generateContent(systemPrompt, prompt);

    // Generate chart data for chapter 3
    let chartData = null;
    if (chapterNumber === 3) {
      chartData = generateChartData(topic);
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
      message: 'Error generating content. Please try again.',
      error: error.message
    });
  }
});

// ── Edit chapter with prompt ──
router.post('/edit', authMiddleware, async (req, res) => {
  try {
    const { content, userPrompt, chapterNumber } = req.body;

    if (!content) return res.status(400).json({ message: 'Content is required.' });
    if (!userPrompt) return res.status(400).json({ message: 'Prompt is required.' });

    const prompt = `You are an expert academic editor. Here is an existing chapter from a Nigerian university final year project:

"${content}"

The student has requested the following changes: "${userPrompt}"

Please rewrite the entire chapter incorporating these changes. Make the chapter much longer and more detailed than the original. Maintain formal academic English suitable for a Nigerian university. Write naturally as a human academic writer would. Never use bullet points. Always write in proper academic paragraphs. The rewritten chapter must be comprehensive and thorough.`;

    const systemPrompt = 'You are an expert academic writer and editor specialising in Nigerian university research projects. You write and edit in a natural, human academic style that does not sound AI-generated. You always produce very long, detailed and comprehensive chapters.';

    const editedContent = await generateContent(systemPrompt, prompt);

    res.json({
      message: 'Chapter updated successfully.',
      content: editedContent
    });

  } catch (error) {
    console.error('AI edit error:', error.message);
    res.status(500).json({
      message: 'Error editing content. Please try again.',
      error: error.message
    });
  }
});

module.exports = router;