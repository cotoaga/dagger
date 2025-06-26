/**
 * 🔍 DAGGER Tokenizer Popup Component
 * 
 * Interactive popup for analyzing token breakdown of text content
 * Shows detailed tokenization analysis for Claude API debugging
 */

import React, { useState, useEffect } from 'react';
import TokenizerService from '../services/TokenizerService.js';

export const TokenizerPopup = ({ isOpen, onClose, content, model = 'claude-sonnet-4-20250514' }) => {
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('visual'); // 'visual', 'table', 'stats'
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (isOpen && content) {
      const tokenizedResult = TokenizerService.tokenizeText(content);
      const tokenStats = TokenizerService.getTokenStatistics(content);
      setTokens(tokenizedResult);
      setStats(tokenStats);
    }
  }, [isOpen, content]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTokenColor = (token) => {
    const colors = {
      word: '#3182ce',
      number: '#d69e2e',
      code_block: '#38a169',
      inline_code: '#38a169',
      url: '#805ad5',
      email: '#805ad5',
      punctuation: '#e53e3e',
      sentence_end: '#e53e3e',
      bracket: '#e53e3e',
      quote: '#e53e3e',
      whitespace: '#a0aec0',
      programming_keyword: '#319795',
      symbol: '#ed8936',
      other: '#718096',
      unknown: '#f56565'
    };
    return colors[token.type] || colors.other;
  };

  const filteredTokens = filterType === 'all' 
    ? tokens 
    : tokens.filter(token => token.type === filterType);

  const uniqueTypes = [...new Set(tokens.map(token => token.type))].sort();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-color, #1a1a1a)',
        border: '1px solid var(--border-color, #333)',
        borderRadius: '8px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        width: '800px',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--text-color, #ffffff)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color, #333)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: '#d69e2e' }}>
            🔍 Token Analysis - {model}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-color, #ffffff)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ×
          </button>
        </div>

        {/* Stats Bar */}
        {stats && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-secondary, #2d2d2d)',
            borderBottom: '1px solid var(--border-color, #333)',
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            fontSize: '14px'
          }}>
            <span><strong>Estimated Tokens:</strong> {stats.totalTokens}</span>
            <span><strong>Characters:</strong> {stats.totalCharacters}</span>
            <span><strong>Token Count:</strong> {stats.tokenCount}</span>
            <span><strong>Avg Length:</strong> {stats.averageTokenLength.toFixed(1)}</span>
          </div>
        )}

        {/* Controls */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color, #333)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('visual')}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-color, #333)',
                backgroundColor: viewMode === 'visual' ? '#d69e2e' : 'transparent',
                color: viewMode === 'visual' ? '#000' : 'var(--text-color, #fff)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Visual
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-color, #333)',
                backgroundColor: viewMode === 'table' ? '#d69e2e' : 'transparent',
                color: viewMode === 'table' ? '#000' : 'var(--text-color, #fff)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('stats')}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-color, #333)',
                backgroundColor: viewMode === 'stats' ? '#d69e2e' : 'transparent',
                color: viewMode === 'stats' ? '#000' : 'var(--text-color, #fff)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Stats
            </button>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '6px',
              border: '1px solid var(--border-color, #333)',
              backgroundColor: 'var(--bg-color, #1a1a1a)',
              color: 'var(--text-color, #fff)',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px'
        }}>
          {viewMode === 'visual' && (
            <div style={{
              lineHeight: '1.6',
              fontFamily: 'monospace',
              fontSize: '14px',
              whiteSpace: 'pre-wrap'
            }}>
              {filteredTokens.map((token, index) => (
                <span
                  key={index}
                  title={`Type: ${token.type}\nSubtype: ${token.subtype}\nEstimated tokens: ${token.estimatedTokens}\nLength: ${token.length} chars`}
                  style={{
                    backgroundColor: getTokenColor(token) + '20',
                    color: getTokenColor(token),
                    border: `1px solid ${getTokenColor(token)}40`,
                    borderRadius: '2px',
                    padding: token.type === 'whitespace' ? '0' : '1px 2px',
                    margin: '1px',
                    display: token.type === 'whitespace' ? 'inline' : 'inline-block',
                    cursor: 'help'
                  }}
                >
                  {token.text}
                </span>
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div style={{ fontSize: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color, #333)' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Token</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Subtype</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Est. Tokens</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Length</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-color, #333)' }}>
                      <td style={{ 
                        padding: '6px 8px', 
                        fontFamily: 'monospace',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {token.text === '\n' ? '\\n' : token.text}
                      </td>
                      <td style={{ padding: '6px 8px', color: getTokenColor(token) }}>
                        {token.type}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        {token.subtype || '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {token.estimatedTokens}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                        {token.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'stats' && stats && (
            <div style={{ fontSize: '14px' }}>
              <h4 style={{ color: '#d69e2e', marginTop: 0 }}>Token Type Breakdown</h4>
              <div style={{ display: 'grid', gap: '12px' }}>
                {Object.entries(stats.types)
                  .sort(([,a], [,b]) => b.estimatedTokens - a.estimatedTokens)
                  .map(([type, data]) => (
                    <div key={type} style={{
                      padding: '12px',
                      border: '1px solid var(--border-color, #333)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-secondary, #2d2d2d)'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{ 
                          color: getTokenColor({ type }),
                          fontWeight: 'bold'
                        }}>
                          {type}
                        </span>
                        <span style={{ fontSize: '12px', color: '#888' }}>
                          {((data.estimatedTokens / stats.totalTokens) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#aaa' }}>
                        Count: {data.count} | 
                        Est. Tokens: {data.estimatedTokens} | 
                        Characters: {data.characters}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-color, #333)',
          fontSize: '12px',
          color: '#888',
          textAlign: 'center'
        }}>
          Token estimation is approximate. Actual Claude API token usage may vary.
        </div>
      </div>
    </div>
  );
};

export default TokenizerPopup;