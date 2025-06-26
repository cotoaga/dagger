/**
 * 💰 DAGGER Token Usage Display Component
 * 
 * Shows real-time token usage and cost information
 * Displays per-conversation and session totals
 */

import React from 'react';
import TokenCostService from '../services/TokenCostService.js';

export const TokenUsageDisplay = ({ usage, model, variant = 'inline' }) => {
  if (!usage) return null;

  const cost = TokenCostService.calculateCost(
    model,
    usage.input_tokens || 0,
    usage.output_tokens || 0,
    usage.cache_read_input_tokens || 0
  );

  const tierColor = {
    budget: '#10b981',   // green
    standard: '#3b82f6', // blue
    premium: '#f59e0b'   // amber
  };

  const tier = TokenCostService.getModelTier(model);

  if (variant === 'inline') {
    return (
      <span className="token-usage-inline" style={{
        fontSize: '12px',
        color: '#888',
        marginLeft: '8px'
      }}>
        <span style={{ color: tierColor[tier] }}>
          {TokenCostService.formatTokens(usage.input_tokens + usage.output_tokens)} tokens
        </span>
        {' • '}
        <span style={{ fontWeight: '500' }}>
          {TokenCostService.formatCost(cost.totalCost)}
        </span>
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="token-usage-detailed" style={{
        padding: '12px',
        backgroundColor: 'var(--bg-secondary, #2d2d2d)',
        borderRadius: '6px',
        fontSize: '13px',
        marginTop: '8px'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: '500', color: tierColor[tier] }}>
          💰 Token Usage & Cost
        </div>
        
        <div style={{ display: 'grid', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>Input:</span>
            <span>
              {TokenCostService.formatTokens(usage.input_tokens)} 
              <span style={{ color: '#888', marginLeft: '8px' }}>
                ({TokenCostService.formatCost(cost.breakdown.input.cost)})
              </span>
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>Output:</span>
            <span>
              {TokenCostService.formatTokens(usage.output_tokens)} 
              <span style={{ color: '#888', marginLeft: '8px' }}>
                ({TokenCostService.formatCost(cost.breakdown.output.cost)})
              </span>
            </span>
          </div>
          
          {usage.cache_read_input_tokens > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888' }}>Cached:</span>
              <span>
                {TokenCostService.formatTokens(usage.cache_read_input_tokens)} 
                <span style={{ color: '#888', marginLeft: '8px' }}>
                  ({TokenCostService.formatCost(cost.breakdown.cached.cost)})
                </span>
              </span>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-color, #333)',
            paddingTop: '4px',
            marginTop: '4px',
            fontWeight: '500'
          }}>
            <span>Total:</span>
            <span>
              {TokenCostService.formatTokens(usage.input_tokens + usage.output_tokens)} 
              <span style={{ color: tierColor[tier], marginLeft: '8px' }}>
                {TokenCostService.formatCost(cost.totalCost)}
              </span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export const SessionTokenSummary = ({ conversations }) => {
  const summary = TokenCostService.getSessionSummary(conversations);
  
  if (summary.totalConversations === 0) {
    return null;
  }

  return (
    <div className="session-token-summary" style={{
      padding: '16px',
      backgroundColor: 'var(--bg-secondary, #2d2d2d)',
      borderRadius: '8px',
      margin: '16px 0'
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#d69e2e' }}>
        💰 Session Token Usage
      </h3>
      
      <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Conversations:</span>
          <span style={{ fontWeight: '500' }}>{summary.totalConversations}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Tokens:</span>
          <span style={{ fontWeight: '500' }}>
            {TokenCostService.formatTokens(summary.totalTokens)}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '16px',
          fontWeight: '600',
          color: '#d69e2e',
          borderTop: '1px solid var(--border-color, #333)',
          paddingTop: '8px',
          marginTop: '4px'
        }}>
          <span>Total Cost:</span>
          <span>{TokenCostService.formatCost(summary.totalCost)}</span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#888'
        }}>
          <span>Average per conversation:</span>
          <span>{TokenCostService.formatCost(summary.averageCostPerConversation)}</span>
        </div>
      </div>

      {Object.keys(summary.costsByModel).length > 1 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#888' }}>
            By Model:
          </h4>
          {Object.entries(summary.costsByModel).map(([modelName, data]) => (
            <div key={modelName} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '13px',
              padding: '4px 0'
            }}>
              <span>{modelName}:</span>
              <span>
                {data.conversations} conv • 
                {TokenCostService.formatTokens(data.inputTokens + data.outputTokens)} • 
                <span style={{ fontWeight: '500', marginLeft: '4px' }}>
                  {TokenCostService.formatCost(data.cost)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TokenUsageDisplay;