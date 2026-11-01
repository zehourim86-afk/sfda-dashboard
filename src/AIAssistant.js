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
      fontFamily:'Inter,sans-serif', background:'#252266',
      borderRadius:'14px', border:'1px solid rgba(0,170,255,0.12)',
      overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding:'14px 18px',
        background:'linear-gradient(135deg, #252266 0%, #1E1A5E 100%)',
        display:'flex', alignItems:'center', gap:'10px'
      }}>
        <div style={{
          width:'36px', height:'36px', borderRadius:'10px',
          background:'rgba(56,198,255,0.2)',
          border:'1px solid rgba(56,198,255,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'18px', flexShrink:0
        }}>🤖</div>
        <div>
          <div style={{fontSize:'14px', fontWeight:700, color:'#FFFFFF'}}>DEMARA AI Assistant</div>
          <div style={{fontSize:'11px', color:'#38C6FF'}}>SFDA Import Compliance Expert</div>
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
        <div style={{padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'#2D2B7A'}}>
          <div style={{fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'8px'}}>
            Quick Questions
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => sendMessage(q)}
                style={{
                  padding:'5px 10px', borderRadius:'20px', fontSize:'11px',
                  fontWeight:500, cursor:'pointer',
                  border:'1px solid rgba(255,255,255,0.12)',
                  background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.75)',
                  transition:'all 0.15s', textAlign:'left'
                }}
                onMouseOver={e => { e.target.style.borderColor = '#38C6FF'; e.target.style.color = '#38C6FF'; }}
                onMouseOut={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.color = 'rgba(255,255,255,0.75)'; }}>
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
                background:'linear-gradient(135deg, #1E3A8A, #1E1A5E)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'13px', flexShrink:0, marginTop:'2px'
              }}>🤖</div>
            )}
            <div style={{
              maxWidth:'80%',
              padding:'10px 14px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? '#38C6FF' : 'rgba(255,255,255,0.05)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
              color: msg.role === 'user' ? '#252266' : 'rgba(255,255,255,0.88)',
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
                        cells.map(c => '<span style="background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:4px;font-size:12px">' + c.trim() + '</span>').join('') +
                        '</div>';
                    })
                    .replace(/\n/g, '<br/>')
                }} />
              ) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{
                width:'28px', height:'28px', borderRadius:'50%',
                background:'#38C6FF',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'11px', fontWeight:700, color:'#252266',
                flexShrink:0, marginTop:'2px'
              }}>M</div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{display:'flex', gap:'8px', alignItems:'flex-start'}}>
            <div style={{
              width:'28px', height:'28px', borderRadius:'8px',
              background:'linear-gradient(135deg, #1E3A8A, #1E1A5E)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'13px', flexShrink:0
            }}>🤖</div>
            <div style={{
              padding:'10px 14px', borderRadius:'14px 14px 14px 4px',
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
              display:'flex', gap:'4px', alignItems:'center'
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width:'6px', height:'6px', borderRadius:'50%',
                  background:'#38C6FF',
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
            fontSize:'12px', color:'#FF5470'
          }}>⚠ {error}</div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* Input */}
      <div style={{
        padding:'12px 16px',
        borderTop:'1px solid rgba(255,255,255,0.08)',
        background:'#2D2B7A'
      }}>
        <div style={{display:'flex', gap:'8px', alignItems:'flex-end'}}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about SFDA regulations, document requirements, labeling..."
            rows={2}
            style={{
              flex:1, border:'1px solid rgba(255,255,255,0.15)',
              borderRadius:'10px', padding:'10px 12px',
              fontSize:'13px', color:'#FFFFFF',
              fontFamily:'Inter,sans-serif', outline:'none',
              resize:'none', lineHeight:1.5,
              background:'rgba(255,255,255,0.04)'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width:'40px', height:'40px', borderRadius:'10px',
              background: input.trim() && !loading ? '#38C6FF' : 'rgba(255,255,255,0.1)',
              border:'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'16px', color:'white', flexShrink:0,
              transition:'all 0.15s'
            }}>
            {loading ? '⟳' : '↑'}
          </button>
        </div>
        <div style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', marginTop:'6px', textAlign:'center'}}>
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