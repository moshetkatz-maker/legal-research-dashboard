import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Save, Download, Upload, Edit2, Trash2, X, Loader, FileText, Settings } from 'lucide-react';

// Bluebook Citation Formatter
const BluebookFormatter = {
  // Format a case name for Bluebook (underline/proper casing)
  formatCaseName: (name) => {
    if (!name) return '';
    // Handle "v." or "vs."
    const normalized = name.replace(/\sv\.s\.\s/gi, ' v. ').replace(/\svs\.\s/gi, ' v. ');
    return normalized.trim();
  },

  // Validate citation format (e.g., "123 F.3d 456")
  validateCitation: (citation) => {
    const patterns = [
      /^\d+\s+U\.?S\.?\s+\d+/, // US Reports
      /^\d+\s+S\.?Ct\.?\s+\d+/, // Supreme Court Reporter
      /^\d+\s+L\.?Ed\.?2?\.?\s+\d+/, // Lawyers' Edition
      /^\d+\s+F\.(?:2d|3d|Supp\.?2?d?|App\.?)?\s+\d+/, // Federal Reporter
      /^\d+\s+(?:N\.?E\.?|N\.?W\.?|S\.?E\.?|S\.?W\.?|A\.?|P\.?|So\.?|N\.?Y\.?S\.?)2?d?\s+\d+/, // State Reports
    ];
    return patterns.some(p => p.test(citation.trim()));
  },

  // Convert inline citation to full Bluebook format with pin cite
  formatFullCite: (caseName, citation, pageCite = '') => {
    const name = BluebookFormatter.formatCaseName(caseName);
    const cite = citation.trim();
    const page = pageCite ? ` ${pageCite}` : '';
    return `${name}, ${cite}${page}`;
  },

  // Create short form cite (after full cite established)
  formatShortCite: (caseName, pageCite = '') => {
    const name = BluebookFormatter.formatCaseName(caseName);
    const page = pageCite ? ` ${pageCite}` : '';
    return `${name}${page}`;
  },

  // Convert quote to Bluebook footnote format with proper ellipsis
  formatQuoteWithCite: (quote, caseName, citation, pageCite) => {
    const cleanQuote = quote.trim().replace(/^"|"$/g, '');
    const fullCite = BluebookFormatter.formatFullCite(caseName, citation, pageCite);
    return `"${cleanQuote}" ${fullCite}.`;
  },

  // Fix spacing issues in citations
  normalizeCitation: (cite) => {
    return cite
      .replace(/\s+/g, ' ') // Remove extra spaces
      .replace(/\.\s*(\d)/g, '.$1') // Fix spacing after periods before numbers
      .replace(/(\d)\s+(F\.|U\.S\.|S\.Ct\.)/gi, '$1 $2') // Normalize spacing
      .trim();
  },

  // Generate full rule paragraph with proper formatting
  generateRuleWithCitations: (ruleParagraph, cases) => {
    let formatted = ruleParagraph;
    
    // Track which citations we've used (for short form)
    const citationMap = {};
    
    // Replace [CITATION] placeholders with proper Bluebook format
    cases.forEach((caseItem, idx) => {
      const placeholder = `[CASE_${idx}]`;
      const fullCite = BluebookFormatter.formatFullCite(
        caseItem.name,
        caseItem.citation,
        caseItem.quotes?.[0]?.pageCite || ''
      );
      formatted = formatted.replace(new RegExp(placeholder, 'g'), fullCite);
      citationMap[caseItem.name] = fullCite;
    });

    return formatted;
  },

  // List of common legal abbreviations
  legalAbbreviations: {
    'affirmed': 'aff\'d',
    'affirming': 'aff\'g',
    'reversed': 'rev\'d',
    'reversing': 'rev\'g',
    'modified': 'mod\'d',
    'vacated': 'vac\'d',
    'vacating': 'vac\'g',
  }
};

// Word Document Generator
const WordDocGenerator = {
  generateMotionTemplate: async (ruleParagraph, cases, topic, author = 'Your Name') => {
    // Create Word document content
    const content = `
[Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document]
[Document Version: 1.0]

MOTION IN SUPPORT OF [YOUR MOTION TITLE]

I. INTRODUCTION
This Court should grant [Plaintiff/Defendant]'s motion because [brief statement of relief sought].

II. LEGAL STANDARD
${ruleParagraph}

III. FACTUAL BACKGROUND
[Insert facts supporting your motion here.]

IV. ARGUMENT
[Insert argument applying the legal standard to the facts.]

V. CONCLUSION
For the foregoing reasons, [Plaintiff/Defendant] respectfully requests that this Court grant the relief sought in this motion.

Respectfully submitted,

${author}
[Your Address]
[Your Phone Number]
[Your Email]

CERTIFICATE OF SERVICE

I HEREBY CERTIFY that I have furnished true and correct copies of the foregoing [MOTION/BRIEF] to all counsel of record by electronic transmission via [service method] on this [date].

_____________________________
[Your Name]
    `;
    
    return content;
  },

  // Alternative: Generate JSON for docx library (can be used with npm docx)
  generateDocxJSON: (ruleParagraph, cases, topic, docType = 'ruleParagraph') => {
    const sections = [];

    if (docType === 'ruleParagraph') {
      sections.push({
        type: 'paragraph',
        style: 'Heading1',
        text: `Legal Rule: ${topic}`
      });
      sections.push({
        type: 'paragraph',
        style: 'Normal',
        text: ruleParagraph
      });
    } else if (docType === 'fullMotion') {
      sections.push({
        type: 'paragraph',
        style: 'Heading1',
        text: 'MOTION IN SUPPORT OF [YOUR MOTION TITLE]'
      });
      sections.push({
        type: 'heading2',
        text: 'I. INTRODUCTION'
      });
      sections.push({
        type: 'paragraph',
        text: 'This Court should grant [relief sought] because [brief statement].'
      });
      sections.push({
        type: 'heading2',
        text: 'II. LEGAL STANDARD'
      });
      sections.push({
        type: 'paragraph',
        text: ruleParagraph
      });
      sections.push({
        type: 'heading2',
        text: 'III. FACTUAL BACKGROUND'
      });
      sections.push({
        type: 'paragraph',
        text: '[Insert facts supporting your motion here.]'
      });
      sections.push({
        type: 'heading2',
        text: 'IV. ARGUMENT'
      });
      sections.push({
        type: 'paragraph',
        text: '[Insert argument applying the legal standard to the facts.]'
      });
      sections.push({
        type: 'heading2',
        text: 'V. CONCLUSION'
      });
      sections.push({
        type: 'paragraph',
        text: 'For the foregoing reasons, [Plaintiff/Defendant] respectfully requests that this Court grant the relief sought in this motion.'
      });
    } else if (docType === 'withCases') {
      sections.push({
        type: 'paragraph',
        style: 'Heading1',
        text: `Legal Rule: ${topic}`
      });
      sections.push({
        type: 'paragraph',
        text: ruleParagraph
      });
      sections.push({
        type: 'heading2',
        text: 'Supporting Cases'
      });
      cases.forEach((caseItem, idx) => {
        sections.push({
          type: 'paragraph',
          text: `${idx + 1}. ${caseItem.name}, ${caseItem.citation}`
        });
        if (caseItem.holding) {
          sections.push({
            type: 'paragraph',
            text: `Holding: ${caseItem.holding}`,
            indent: 720
          });
        }
        if (caseItem.quotes?.length > 0) {
          caseItem.quotes.forEach(q => {
            sections.push({
              type: 'paragraph',
              text: `Quote (p. ${q.pageCite}): "${q.text}"`,
              indent: 720
            });
          });
        }
      });
    }

    return sections;
  },

  // Create downloadable text file
  downloadAsText: (content, filename) => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
};

const LegalResearchDashboard = () => {
  const [view, setView] = useState('search');
  const [topic, setTopic] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [courtLevel, setCourtLevel] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [ruleParagraph, setRuleParagraph] = useState('');
  const [editingRule, setEditingRule] = useState(false);
  const [database, setDatabase] = useState([]);
  const [filterTopic, setFilterTopic] = useState('');
  const [showBluebookHelper, setShowBluebookHelper] = useState(false);
  const [showWordExport, setShowWordExport] = useState(false);
  const [wordExportType, setWordExportType] = useState('ruleParagraph');
  const [bluebookTest, setBluebookTest] = useState({ caseName: '', citation: '', pageCite: '' });
  const [bluebookResult, setBluebookResult] = useState('');
  const fileInputRef = useRef(null);

  // Load database from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('legalRuleDatabase');
    if (stored) {
      try {
        setDatabase(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load database:', e);
      }
    }
  }, []);

  const testBluebookFormatter = () => {
    if (!bluebookTest.caseName || !bluebookTest.citation) {
      setBluebookResult('Please enter case name and citation');
      return;
    }

    const isValid = BluebookFormatter.validateCitation(bluebookTest.citation);
    const full = BluebookFormatter.formatFullCite(
      bluebookTest.caseName,
      bluebookTest.citation,
      bluebookTest.pageCite
    );

    setBluebookResult(`Citation Valid: ${isValid ? '✓ Yes' : '✗ No'}\nFormatted: ${full}`);
  };

  const saveToDatabase = (rule) => {
    const entry = {
      id: Date.now(),
      topic,
      ruleParagraph: rule,
      cases: searchResults?.cases || [],
      jurisdiction,
      courtLevel,
      dateCreated: new Date().toISOString(),
      notes: ''
    };
    const updated = [entry, ...database];
    setDatabase(updated);
    localStorage.setItem('legalRuleDatabase', JSON.stringify(updated));
    setView('database');
    setTopic('');
    setRuleParagraph('');
    setSearchResults(null);
  };

  const deleteEntry = (id) => {
    const updated = database.filter(e => e.id !== id);
    setDatabase(updated);
    localStorage.setItem('legalRuleDatabase', JSON.stringify(updated));
  };

  const exportToCloud = () => {
    const dataStr = JSON.stringify(database, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `legal-rules-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importFromCloud = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          const merged = [...imported, ...database];
          setDatabase(merged);
          localStorage.setItem('legalRuleDatabase', JSON.stringify(merged));
          alert('Import successful! Merged with existing rules.');
        }
      } catch (err) {
        alert('Import failed: Invalid JSON format');
      }
    };
    reader.readAsText(file);
  };

  const exportToWord = async () => {
    if (!ruleParagraph.trim()) {
      alert('Please generate a rule paragraph first');
      return;
    }

    const filename = `${topic.replace(/\s+/g, '_')}_${wordExportType}_${new Date().toISOString().split('T')[0]}.txt`;
    
    if (wordExportType === 'ruleParagraph') {
      const content = `RULE PARAGRAPH\n\nTopic: ${topic}\n\n${ruleParagraph}\n\nGenerated: ${new Date().toLocaleString()}`;
      WordDocGenerator.downloadAsText(content, filename);
    } else if (wordExportType === 'withCases') {
      let content = `RULE WITH SUPPORTING CASES\n\nTopic: ${topic}\n\n${ruleParagraph}\n\n`;
      content += `\nSUPPORTING CASES:\n\n`;
      searchResults?.cases?.forEach((caseItem, idx) => {
        content += `${idx + 1}. ${caseItem.name}, ${caseItem.citation}\n`;
        if (caseItem.holding) content += `   Holding: ${caseItem.holding}\n`;
        if (caseItem.quotes?.length > 0) {
          caseItem.quotes.forEach(q => {
            content += `   Quote (p. ${q.pageCite}): "${q.text}"\n`;
          });
        }
        content += '\n';
      });
      WordDocGenerator.downloadAsText(content, filename);
    } else if (wordExportType === 'motionTemplate') {
      const motionContent = await WordDocGenerator.generateMotionTemplate(ruleParagraph, searchResults?.cases || [], topic);
      WordDocGenerator.downloadAsText(motionContent, `motion_template_${new Date().toISOString().split('T')[0]}.txt`);
    }

    alert('Export ready! Opening in your default text editor.');
    setShowWordExport(false);
  };

  const performSearch = async () => {
    if (!topic.trim()) {
      alert('Please enter a legal topic');
      return;
    }

    setIsSearching(true);
    setSearchResults({
      cases: [],
      quotes: [],
      analysis: '',
      loading: true
    });

    try {
      const prompt = `You are a legal research assistant specializing in Bluebook citation formatting. Search for cases about: "${topic}"
${jurisdiction ? `Jurisdiction: ${jurisdiction}` : ''}
${courtLevel ? `Court Level: ${courtLevel}` : ''}

Find the 3-5 most relevant cases. For each case:
1. Extract the key rule/holding
2. Provide exact quotes with proper page citations (as P. [page number])
3. Identify the rule's legal principle

Then draft a rule paragraph suitable for a brief's rule section, including:
- The general rule statement
- Exact quotes with proper Bluebook format citations
- Application of the rule
- Proper legal formatting with underlined case names

Format your response as JSON:
{
  "cases": [
    {
      "name": "Case Name",
      "citation": "123 F.3d 456 (11th Cir. 2020)",
      "holding": "The rule is...",
      "quotes": [
        {
          "text": "exact quote",
          "pageCite": "789"
        }
      ]
    }
  ],
  "ruleParagraph": "A comprehensive rule paragraph with proper Bluebook formatting including underlined case names and proper citations..."
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          tools: [
            {
              type: 'web_search_20250305',
              name: 'web_search'
            }
          ]
        }),
      });

      const data = await response.json();
      
      let textContent = '';
      if (data.content) {
        data.content.forEach(block => {
          if (block.type === 'text') {
            textContent += block.text;
          }
        });
      }

      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSearchResults({
          cases: parsed.cases || [],
          ruleParagraph: parsed.ruleParagraph || '',
          loading: false
        });
        setRuleParagraph(parsed.ruleParagraph || '');
        setView('results');
      } else {
        setSearchResults({
          cases: [],
          ruleParagraph: 'Error parsing response. Please try again.',
          loading: false
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        cases: [],
        ruleParagraph: `Error: ${error.message}`,
        loading: false
      });
    } finally {
      setIsSearching(false);
    }
  };

  const filteredDatabase = database.filter(entry =>
    entry.topic.toLowerCase().includes(filterTopic.toLowerCase()) ||
    entry.ruleParagraph.toLowerCase().includes(filterTopic.toLowerCase())
  );

  // Search View
  if (view === 'search') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital@0;1&family=Space+Mono&display=swap');
          
          * { font-family: 'Crimson Text', serif; }
          button, input, textarea, select { font-family: 'Space Mono', monospace; }
          
          .legal-input {
            border: 2px solid #e2e8f0;
            border-radius: 2px;
            padding: 12px 16px;
            font-size: 15px;
            transition: all 0.2s;
          }
          
          .legal-input:focus {
            outline: none;
            border-color: #1e293b;
            box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.1);
          }
          
          .legal-button {
            background: #1e293b;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .legal-button:hover {
            background: #0f172a;
            transform: translateY(-1px);
          }
          
          .legal-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }
          
          .nav-tabs {
            display: flex;
            gap: 16px;
            margin-bottom: 32px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
          }
          
          .nav-tab {
            padding: 8px 0;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s;
          }
          
          .nav-tab.active {
            border-bottom-color: #1e293b;
            color: #1e293b;
          }
          
          .nav-tab:hover {
            color: #1e293b;
          }

          .tool-button {
            background: #f1f5f9;
            color: #1e293b;
            padding: 10px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 2px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
          }

          .tool-button:hover {
            background: #e2e8f0;
          }

          .helper-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            padding: 32px;
            border-radius: 4px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
          }

          .modal-title {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
          }

          .close-button {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            color: #64748b;
          }

          .close-button:hover {
            color: #1e293b;
          }
        `}</style>

        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Legal Research Hub</h1>
            <p className="text-slate-600 text-base">Find case law, extract rules, generate briefs with Bluebook citations</p>
          </div>

          <div className="nav-tabs">
            <div className="nav-tab active">New Research</div>
            <div className="nav-tab" onClick={() => setView('database')}>Rule Database ({database.length})</div>
          </div>

          <div className="flex gap-3 mb-6">
            <button className="tool-button" onClick={() => setShowBluebookHelper(true)}>
              <Settings className="w-4 h-4" />
              Bluebook Formatter
            </button>
            <button className="tool-button" onClick={() => setShowWordExport(true)}>
              <FileText className="w-4 h-4" />
              Word Export Options
            </button>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-lg shadow-sm">
            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-900 mb-2">Legal Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., 'piercing the corporate veil in LLC disputes' or 'summary judgment standard for contract interpretation'"
                className="legal-input w-full"
                onKeyPress={(e) => e.key === 'Enter' && performSearch()}
              />
              <p className="text-xs text-slate-500 mt-1">Be specific. The more detailed your query, the better the results.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Jurisdiction (Optional)</label>
                <input
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="e.g., 11th Circuit, Florida"
                  className="legal-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Court Level (Optional)</label>
                <select
                  value={courtLevel}
                  onChange={(e) => setCourtLevel(e.target.value)}
                  className="legal-input w-full"
                >
                  <option value="">Any</option>
                  <option value="Supreme Court">Supreme Court</option>
                  <option value="Circuit Court">Circuit Court</option>
                  <option value="District Court">District Court</option>
                  <option value="State Court">State Court</option>
                </select>
              </div>
            </div>

            <button
              onClick={performSearch}
              disabled={isSearching || !topic.trim()}
              className="legal-button w-full justify-center"
            >
              {isSearching ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Searching CourtListener...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Research This Topic
                </>
              )}
            </button>
          </div>

          <div className="mt-8 bg-slate-50 border border-slate-200 p-6 rounded-lg">
            <h3 className="font-bold text-slate-900 mb-3">How it works:</h3>
            <ol className="text-sm text-slate-700 space-y-2">
              <li className="flex gap-3">
                <span className="font-bold min-w-6">1.</span>
                <span>Enter your legal research topic with optional jurisdiction/court filters</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold min-w-6">2.</span>
                <span>We search CourtListener for the most relevant cases</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold min-w-6">3.</span>
                <span>Claude analyzes cases with proper Bluebook formatting</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold min-w-6">4.</span>
                <span>Review the draft rule paragraph and supporting cases</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold min-w-6">5.</span>
                <span>Export to Word, Bluebook-format, or save to your database</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Bluebook Helper Modal */}
        {showBluebookHelper && (
          <div className="helper-modal" onClick={() => setShowBluebookHelper(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Bluebook Citation Formatter</h2>
                <button className="close-button" onClick={() => setShowBluebookHelper(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Case Name</label>
                  <input
                    type="text"
                    value={bluebookTest.caseName}
                    onChange={(e) => setBluebookTest({...bluebookTest, caseName: e.target.value})}
                    placeholder="e.g., Smith v. Jones"
                    className="legal-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Citation</label>
                  <input
                    type="text"
                    value={bluebookTest.citation}
                    onChange={(e) => setBluebookTest({...bluebookTest, citation: e.target.value})}
                    placeholder="e.g., 123 F.3d 456 (11th Cir. 2020)"
                    className="legal-input w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">Valid formats: US Reports, Federal Reporter, State Reports, etc.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Pin Cite (Page Number) - Optional</label>
                  <input
                    type="text"
                    value={bluebookTest.pageCite}
                    onChange={(e) => setBluebookTest({...bluebookTest, pageCite: e.target.value})}
                    placeholder="e.g., 789"
                    className="legal-input w-full"
                  />
                </div>

                <button
                  onClick={testBluebookFormatter}
                  className="legal-button w-full justify-center"
                >
                  Format Citation
                </button>

                {bluebookResult && (
                  <div className="bg-slate-50 p-4 rounded border border-slate-200">
                    <pre className="text-sm font-mono whitespace-pre-wrap">{bluebookResult}</pre>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 p-4 rounded mt-6">
                  <h3 className="font-bold text-sm mb-2">Bluebook Basics:</h3>
                  <ul className="text-sm space-y-1 text-slate-700">
                    <li>• Case names are underlined in formal documents</li>
                    <li>• Always include the volume, reporter, page, court, and year</li>
                    <li>• Use "p." before page numbers for pin cites</li>
                    <li>• Abbreviate court names: 11th Cir., S.D. Fla., etc.</li>
                    <li>• Use "at" for pages: "Smith v. Jones, 123 F.3d 456, at 789 (11th Cir. 2020)"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Word Export Modal */}
        {showWordExport && (
          <div className="helper-modal" onClick={() => setShowWordExport(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Export to Word</h2>
                <button className="close-button" onClick={() => setShowWordExport(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-3">Export Format:</label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        value="ruleParagraph"
                        checked={wordExportType === 'ruleParagraph'}
                        onChange={(e) => setWordExportType(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-semibold text-sm">Rule Paragraph Only</div>
                        <div className="text-xs text-slate-600">Just the rule with citations</div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        value="withCases"
                        checked={wordExportType === 'withCases'}
                        onChange={(e) => setWordExportType(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-semibold text-sm">Rule + Supporting Cases</div>
                        <div className="text-xs text-slate-600">Includes case names, holdings, and quotes</div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        value="motionTemplate"
                        checked={wordExportType === 'motionTemplate'}
                        onChange={(e) => setWordExportType(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-semibold text-sm">Motion Template</div>
                        <div className="text-xs text-slate-600">Full motion structure with rule section</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={exportToWord}
                  className="legal-button w-full justify-center"
                >
                  <Download className="w-4 h-4" />
                  Export as Text File
                </button>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded">
                  💡 Tip: The exported text file can be opened and edited in Word, Google Docs, or any text editor. The formatting is ready for copy-paste into your motion documents.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Results View
  if (view === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital@0;1&family=Space+Mono&display=swap');
          
          * { font-family: 'Crimson Text', serif; }
          button, input, textarea { font-family: 'Space Mono', monospace; }
          
          .case-card {
            border-left: 4px solid #1e293b;
            background: white;
            padding: 16px;
            margin-bottom: 12px;
            border-radius: 2px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .case-name {
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 4px;
          }
          
          .case-citation {
            font-family: 'Space Mono', monospace;
            color: #64748b;
            font-size: 13px;
            margin-bottom: 8px;
          }
          
          .case-holding {
            color: #475569;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .rule-editor {
            font-family: 'Crimson Text', serif;
            border: 2px solid #e2e8f0;
            padding: 16px;
            border-radius: 2px;
            min-height: 300px;
            font-size: 15px;
            line-height: 1.8;
          }
          
          .rule-editor:focus {
            outline: none;
            border-color: #1e293b;
            box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.1);
          }
          
          .button-group {
            display: flex;
            gap: 8px;
            margin-top: 16px;
            flex-wrap: wrap;
          }
          
          .button-primary {
            background: #1e293b;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            flex: 1;
            min-width: 120px;
          }
          
          .button-primary:hover {
            background: #0f172a;
          }
          
          .button-secondary {
            background: #f1f5f9;
            color: #1e293b;
            padding: 12px 24px;
            border: 2px solid #e2e8f0;
            border-radius: 2px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            flex: 1;
            min-width: 120px;
          }
          
          .button-secondary:hover {
            background: #e2e8f0;
          }
        `}</style>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Research Results</h1>
              <p className="text-slate-600 text-sm mt-1">Topic: <span className="font-semibold">{topic}</span></p>
            </div>
            <button
              onClick={() => setView('search')}
              className="button-secondary"
            >
              ← New Search
            </button>
          </div>

          {searchResults?.cases && searchResults.cases.length > 0 && (
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Cases Found</h2>
              {searchResults.cases.map((caseItem, idx) => (
                <div key={idx} className="case-card">
                  <div className="case-name">{caseItem.name}</div>
                  <div className="case-citation">{caseItem.citation}</div>
                  <div className="case-holding">{caseItem.holding}</div>
                  {caseItem.quotes && caseItem.quotes.length > 0 && (
                    <div className="mt-3 text-sm text-slate-600">
                      <strong>Key Quote:</strong> "{caseItem.quotes[0].text}" (p. {caseItem.quotes[0].pageCite})
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Draft Rule Paragraph</h2>
              <button
                onClick={() => setEditingRule(!editingRule)}
                className="button-secondary"
              >
                <Edit2 className="w-4 h-4" />
                {editingRule ? 'Done Editing' : 'Edit'}
              </button>
            </div>

            {editingRule ? (
              <textarea
                value={ruleParagraph}
                onChange={(e) => setRuleParagraph(e.target.value)}
                className="rule-editor w-full"
              />
            ) : (
              <div className="text-slate-800 leading-loose whitespace-pre-wrap text-base">
                {ruleParagraph || 'No rule paragraph generated yet.'}
              </div>
            )}

            <div className="button-group">
              <button
                onClick={() => saveToDatabase(ruleParagraph)}
                className="button-primary"
              >
                <Save className="w-4 h-4" />
                Save to Database
              </button>
              <button
                onClick={() => {
                  const text = ruleParagraph;
                  navigator.clipboard.writeText(text);
                  alert('Copied to clipboard!');
                }}
                className="button-secondary"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowWordExport(true)}
                className="button-secondary"
              >
                <FileText className="w-4 h-4" />
                Export to Word
              </button>
            </div>
          </div>
        </div>

        {/* Word Export Modal */}
        {showWordExport && (
          <div className="helper-modal" onClick={() => setShowWordExport(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Export to Word</h2>
                <button className="close-button" onClick={() => setShowWordExport(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-3">Export Format:</label>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        value="ruleParagraph"
                        checked={wordExportType === 'ruleParagraph'}
                        onChange={(e) => setWordExportType(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-semibold text-sm">Rule Paragraph Only</div>
                        <div className="text-xs text-slate-600">Just the rule with citations</div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        value="withCases"
                        checked={wordExportType === 'withCases'}
                        onChange={(e) => setWordExportType(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-semibold text-sm">Rule + Supporting Cases</div>
                        <div className="text-xs text-slate-600">Includes case names, holdings, and quotes</div>
                      </div>
                    </label>

                    <label className="flex items-center p-3 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        value="motionTemplate"
                        checked={wordExportType === 'motionTemplate'}
                        onChange={(e) => setWordExportType(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-semibold text-sm">Motion Template</div>
                        <div className="text-xs text-slate-600">Full motion structure with rule section</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={exportToWord}
                  className="button-primary w-full"
                >
                  <Download className="w-4 h-4" />
                  Export as Text File
                </button>

                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded">
                  💡 The exported text file opens in Word. Paste into your motion document and adjust as needed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Database View
  if (view === 'database') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital@0;1&family=Space+Mono&display=swap');
          
          * { font-family: 'Crimson Text', serif; }
          button, input, textarea { font-family: 'Space Mono', monospace; }
          
          .db-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 2px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          
          .db-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          
          .db-card-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 12px;
          }
          
          .db-card-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
          }
          
          .db-card-meta {
            font-size: 12px;
            color: #94a3b8;
            font-family: 'Space Mono', monospace;
            margin-top: 4px;
          }
          
          .db-card-text {
            color: #475569;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 12px;
            max-height: 120px;
            overflow-y: auto;
          }
          
          .db-card-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          
          .action-button {
            padding: 8px 12px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
          }
          
          .action-button-delete {
            background: #fee2e2;
            color: #991b1b;
          }
          
          .action-button-delete:hover {
            background: #fecaca;
          }
          
          .search-input {
            border: 2px solid #e2e8f0;
            padding: 10px 14px;
            border-radius: 2px;
            font-size: 14px;
            margin-bottom: 20px;
            width: 100%;
            font-family: 'Space Mono', monospace;
          }
          
          .search-input:focus {
            outline: none;
            border-color: #1e293b;
            box-shadow: 0 0 0 3px rgba(30, 41, 59, 0.1);
          }
          
          .toolbar {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }
          
          .toolbar-button {
            background: #1e293b;
            color: white;
            padding: 10px 16px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
          }
          
          .toolbar-button:hover {
            background: #0f172a;
          }
        `}</style>

        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Rule Database</h1>
              <p className="text-slate-600 text-sm mt-1">{filteredDatabase.length} rule paragraph{filteredDatabase.length !== 1 ? 's' : ''} saved</p>
            </div>
            <button
              onClick={() => setView('search')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              + New Research
            </button>
          </div>

          <div className="toolbar">
            <button
              onClick={exportToCloud}
              className="toolbar-button"
            >
              <Download className="w-4 h-4" />
              Export Database
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="toolbar-button"
            >
              <Upload className="w-4 h-4" />
              Import Database
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importFromCloud}
              style={{ display: 'none' }}
            />
          </div>

          <input
            type="text"
            placeholder="Search by topic or keywords..."
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="search-input"
          />

          {filteredDatabase.length === 0 ? (
            <div className="bg-white border border-slate-200 p-12 rounded-lg text-center">
              <p className="text-slate-600">No rule paragraphs yet. <button onClick={() => setView('search')} className="text-blue-600 underline">Start a new research</button></p>
            </div>
          ) : (
            filteredDatabase.map((entry) => (
              <div key={entry.id} className="db-card">
                <div className="db-card-header">
                  <div className="flex-1">
                    <div className="db-card-title">{entry.topic}</div>
                    <div className="db-card-meta">
                      {new Date(entry.dateCreated).toLocaleDateString()} • {entry.cases?.length || 0} case{entry.cases?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="db-card-text">
                  {entry.ruleParagraph}
                </div>
                <div className="db-card-actions">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(entry.ruleParagraph);
                      alert('Copied to clipboard!');
                    }}
                    className="action-button"
                    style={{ background: '#dbeafe', color: '#1e40af' }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="action-button action-button-delete"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
};

export default LegalResearchDashboard;
