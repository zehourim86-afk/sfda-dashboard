import { useState, useEffect, useRef } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

const QUICK_QUESTIONS = [
  'What documents do I need to import cosmetics from France?',
  'Is a Halal certificate required for food supplements?',
  'What are the Arabic label requirements?',
  'Why would SFDA reject my shipment?',
  'What happens if my shipment is non-conforming?',
  'How long does QC lab analysis take?',
];

export default function AIAssistant({ token, shipmentId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am DEMARA AI Assistant. I can help you with SFDA import regulations, document requirements, labeling compliance, and any questions about your import clearance process. What would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput('');
    setError(null);

    const newMessages = [...messages, { role: 'user', content: messageText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: messageText,
          history: messages.filter(m => m.role !== 'system'),
          context: shipmentId ? { shipment_id: shipmentId } : {}
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.answer }]);
      } else {
        setError('Failed to get response. Please try again.');
      }
    } catch (err) {
      setError('Failed to connect to assistant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      fontFamily:'Inter,sans-serif', background:'#FFFFFF',
      borderRadius:'14px', border:'1px solid rgba(39,48,110,0.1)',
      overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding:'14px 18px',
        background:'linear-gradient(135deg, #27306E 0%, #1C2460 100%)',
        display:'flex', alignItems:'center', gap:'10px'
      }}>
        <div style={{
          width:'36px', height:'36px', borderRadius:'10px',
          background:'rgba(68,200,245,0.2)',
          border:'1px solid rgba(68,200,245,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'18px', flexShrink:0
        }}>🤖</div>
        <div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#FFFFFF'}}>DEMARA AI Assistant</div>
          <div style={{fontSize:'11px', color:'#44C8F5'}}>SFDA Import Compliance Expert</div>
        </div>
        <div style={{
          marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px',
          fontSize:'11px', color:'rgba(255,255,255,0.6)'
        }}>
          <div style={{width:'6px', height:'6px', borderRadius:'50%', background:'#00C896', boxShadow:'0 0 6px #00C896'}}></div>
          Online
        </div>
      </div>

      {/* Quick questions */}
      {messages.length === 1 && (
        <div style={{padding:'12px 16px', borderBottom:'1px solid rgba(39,48,110,0.06)', background:'#FAFBFF'}}>
          <div style={{fontSize:'10px', fontWeight:700, color:'#808285', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'8px'}}>
            Quick Questions
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                style={{
                  padding:'5px 10px', borderRadius:'20px', fontSize:'11px',
                  fontWeight:500, cursor:'pointer',
                  border:'1px solid rgba(39,48,110,0.12)',
                  background:'#FFFFFF', color:'#27306E',
                  transition:'all 0.15s', textAlign:'left'
                }}
                onMouseOver={e => { e.target.style.borderColor = '#44C8F5'; e.target.style.color = '#44C8F5'; }}
                onMouseOut={e => { e.target.style.borderColor = 'rgba(39,48,110,0.12)'; e.target.style.color = '#27306E'; }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px'}}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display:'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap:'8px', alignItems:'flex-start'
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width:'28px', height:'28px', borderRadius:'8px',
                background:'linear-gradient(135deg, #27306E, #1C2460)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'13px', flexShrink:0, marginTop:'2px'
              }}>🤖</div>
            )}
            <div style={{
              maxWidth:'80%',
              padding:'10px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? '#27306E' : '#F5F7FF',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(39,48,110,0.08)',
              color: msg.role === 'user' ? '#FFFFFF' : '#27306E',
              fontSize:'13px', lineHeight:1.6,
              whiteSpace:'pre-wrap',
              fontFamily:'inherit'
            }}>
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{__html:
                  msg.content
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/#{1,3} (.+)/g, '<strong style="font-size:14px;display:block;margin-bottom:4px">$1</strong>')
                    .replace(/\|(.+)\|/g, (match) => {
                      const cells = match.split('|').filter(c => c.trim() && !c.match(/^[-\s]+$/));
                      return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:2px 0">' +
                        cells.map(c => '<span style="background:rgba(39,48,110,0.06);padding:2px 8px;border-radius:4px;font-size:12px">' + c.trim() + '</span>').join('') +
                        '</div>';
                    })
                    .replace(/\n/g, '<br/>')
                }} />
              ) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{
                width:'28px', height:'28px', borderRadius:'50%',
                background:'#44C8F5',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'11px', fontWeight:700, color:'#27306E',
                flexShrink:0, marginTop:'2px'
              }}>M</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
            <div style={{
              width:'28px', height:'28px', borderRadius:'8px',
              background:'linear-gradient(135deg, #27306E, #1C2460)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', flexShrink:0
            }}>🤖</div>
            <div style={{
              padding:'10px 14px', borderRadius:'14px 14px 14px 4px',
              background:'#F5F7FF', border:'1px solid rgba(39,48,110,0.08)',
              display:'flex', gap:'4px', alignItems:'center'
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:'6px', height:'6px', borderRadius:'50%',
                  background:'#44C8F5',
                  animation:`bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                }}></div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding:'10px 14px', borderRadius:'8px',
            background:'rgba(255,84,112,0.08)', border:'1px solid rgba(255,84,112,0.2)',
            fontSize:'12px', color:'#CC0030'
          }}>⚠ {error}</div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* Input */}
      <div style={{
        padding:'12px 16px',
        borderTop:'1px solid rgba(39,48,110,0.08)',
        background:'#FFFFFF'
      }}>
        <div style={{display:'flex', gap:'8px', alignItems:'flex-end'}}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about SFDA regulations, document requirements, labeling..."
            rows={2}
            style={{
              flex:1, border:'1px solid rgba(39,48,110,0.15)',
              borderRadius:'10px', padding:'10px 12px',
              fontSize:'13px', color:'#27306E',
              fontFamily:'Inter,sans-serif', outline:'none',
              resize:'none', lineHeight:1.5,
              background:'#FAFBFF'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width:'40px', height:'40px', borderRadius:'10px',
              background: input.trim() && !loading ? '#27306E' : '#808285',
              border:'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'16px', color:'white', flexShrink:0,
              transition:'all 0.15s'
            }}>
            {loading ? '⟳' : '↑'}
          </button>
        </div>
        <div style={{fontSize:'10px', color:'#808285', marginTop:'6px', textAlign:'center'}}>
          Press Enter to send · Shift+Enter for new line · Powered by DEMARA AI
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}