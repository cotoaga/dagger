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

    // Multicultural Matrix Rain Character Set - Culturally Respectful
    const chars = 
      // Binary Foundation
      "01" +
      
      // Greek (Ancient Wisdom)
      "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω" +
      
      // Phoenician (First Alphabet) 
      "𐤀𐤁𐤂𐤃𐤄𐤅𐤆𐤇𐤈𐤉𐤊𐤋𐤌𐤍𐤎𐤏𐤐𐤑𐤒𐤓𐤔𐤕𐤖𐤗𐤘𐤙𐤚" +
      
      // Latin (Western Foundation)
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
      
      // Cyrillic (Slavic Heritage)
      "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя" +
      
      // Arabic (Semitic Beauty)
      "ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأؤإئ" +
      
      // Japanese Katakana (Cyberpunk Classic)
      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" +
      
      // Japanese Hiragana (Flowing Complement)
      "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん" +
      
      // Mathematical Symbols (Universal Logic)
      "∑∏∫∂∞√∆∇∈∉∪∩⊂⊃⊆⊇∀∃∄¬∧∨⊕⊗≡≠≤≥≈∝∴∵" +
      
      // Additional Ancient Scripts
      "𐊀𐊁𐊂𐊃𐊄𐊅𐊆𐊇𐊈𐊉𐊊𐊋𐊌𐊍𐊎𐊏" + // Lycian
      "𐌀𐌁𐌂𐌃𐌄𐌅𐌖𐌗𐌘𐌙𐌚𐌛𐌜𐌝𐌞"; // Etruscan
      
    const charArray = chars.split("");

    // Color variations for different character sets - CULTURALLY RESPECTFUL
    const getCharColor = (char) => {
      // Binary - bright matrix green (digital foundation)
      if ('01'.includes(char)) return '#00ff41';
      
      // Greek - golden (wisdom, classical heritage)
      if ('ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω'.includes(char)) return '#ffd700';
      
      // Phoenician - royal purple (ancient royalty, historical depth)
      if (char.charCodeAt(0) >= 0x10900 && char.charCodeAt(0) <= 0x1091F) return '#9d4edd';
      
      // Latin - clean white (clarity, universality)
      if ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.includes(char)) return '#ffffff';
      
      // Cyrillic - orthodox blue (Eastern Orthodox tradition)
      if ('АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя'.includes(char)) return '#1e40af';
      
      // Arabic - Islamic green (sacred color, paradise) ✅ CULTURALLY RESPECTFUL
      if ('ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأؤإئ'.includes(char)) return '#00d455';
      
      // Japanese - rising sun red (strength, cultural heritage)
      if ('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.includes(char)) return '#dc2626';
      
      // Mathematical - electric blue (universal logic)
      if ('∑∏∫∂∞√∆∇∈∉∪∩⊂⊃⊆⊇∀∃∄¬∧∨⊕⊗≡≠≤≥≈∝∴∵'.includes(char)) return '#3b82f6';
      
      // Ancient scripts - amber (historical wisdom)
      if (char.charCodeAt(0) >= 0x10A00) return '#f59e0b';
      
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
        
        // Add slight glow effect for special characters
        if (getCharColor(char) !== '#00ff41') {
          ctx.shadowColor = getCharColor(char);
          ctx.shadowBlur = 3;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.fillText(char, x, y);

        // Reset drop if it goes off screen or randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 40); // Slightly slower for better readability

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
        opacity: 0.4 // Slightly more visible for multicultural effect
      }}
    />
  );
};

export default MatrixRain;