import { useEffect } from 'react';

interface GoogleAdProps {
  slot: string;
  style?: React.CSSProperties;
}

export function GoogleAd({ slot, style }: GoogleAdProps) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      }
    } catch (err) {
      console.error('Error loading Google AdSense:', err);
    }
  }, [slot]);

  const defaultStyle: React.CSSProperties = {
    textAlign: 'center', 
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.02)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    border: '1px dashed rgba(0,0,0,0.1)',
    position: 'relative',
  };

  // Ensure style props override the default minHeight
  const mergedStyle: React.CSSProperties = {
    ...defaultStyle,
    minHeight: style?.minHeight || '180px',
    ...style
  };

  return (
    <div style={mergedStyle}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={import.meta.env.VITE_GOOGLE_ADSENSE_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      {/* プレースホルダーテキスト */}
      <div style={{ 
        position: 'absolute', 
        color: 'rgba(0,0,0,0.3)',
        fontSize: '12px',
        padding: '6px 12px',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="9" y1="3" x2="9" y2="21"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="3" y1="15" x2="21" y2="15"/>
        </svg>
        Advertisement
      </div>
    </div>
  );
}