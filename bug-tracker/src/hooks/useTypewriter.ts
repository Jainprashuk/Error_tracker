import { useEffect, useState } from 'react';

export function useTypewriter(text: string, speedMs = 18) {
  const [output, setOutput] = useState('');

  useEffect(() => {
    setOutput('');
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setOutput(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speedMs);
    return () => clearInterval(interval);
  }, [text, speedMs]);

  return output;
}
