import React, { useEffect, useRef } from 'react';

const MatrixRain = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Safe character set - web-compatible alternatives
    const chars = 
      // Binary Foundation (safe)
      "01" +
      // Latin (safe)
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
      // Greek (mostly safe)
      "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω" +
      // Cyrillic (safe)
      "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя" +
      // Japanese Katakana (safe)
      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
      // Mathematical symbols (safe subset)
      "∑∏∫∂∞√∆∇∈∉∪∩⊂⊃∀∃¬∧∨≡≠≤≥≈";
      
    const charArray = chars.split("");

    // Color variations for safe character sets
    const getCharColor = (char) => {
      // Binary - bright matrix green (digital foundation)
      if ('01'.includes(char)) return '#00ff41';
      
      // Greek - golden (wisdom, classical heritage)
      if ('ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω'.includes(char)) return '#ffd700';
      
      // Latin - clean white (clarity, universality)
      if ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.includes(char)) return '#ffffff';
      
      // Cyrillic - orthodox blue (Eastern Orthodox tradition)
      if ('АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя'.includes(char)) return '#1e40af';
      
      // Japanese - rising sun red (strength, cultural heritage)
      if ('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.includes(char)) return '#dc2626';
      
      // Mathematical - electric blue (universal logic)
      if ('∑∏∫∂∞√∆∇∈∉∪∩⊂⊃∀∃¬∧∨≡≠≤≥≈'.includes(char)) return '#3b82f6';
      
      // Default matrix green
      return '#00ff41';
    };

    const fontSize = 16; // Slightly larger for better Unicode display
    const columns = Math.floor(canvas.width / fontSize);
    const drops = [];

    // Initialize drops with staggered start times
    for (let x = 0; x < columns; x++) {
      drops[x] = Math.random() * -100; // Staggered start
    }

    // Animation function with color support
    const draw = () => {
      // Fade effect with slight transparency
      ctx.fillStyle = 'rgba(13, 17, 23, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Font settings for Unicode support
      ctx.font = `${fontSize}px "Noto Sans", "DejaVu Sans", monospace`;
      ctx.textAlign = 'center';

      for (let i = 0; i < drops.length; i++) {
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize + fontSize/2;
        const y = drops[i] * fontSize;
        
        // Set color based on character type
        ctx.fillStyle = getCharColor(char);
        
        // Removed glow effects to prevent pulse effect
        ctx.shadowBlur = 0;
        
        ctx.fillText(char, x, y);

        // Reset drop if it goes off screen or randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 40); // Restored normal frame rate

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="matrix-rain"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1,
        opacity: 0.4 // Restored normal opacity
      }}
    />
  );
};

export default MatrixRain;