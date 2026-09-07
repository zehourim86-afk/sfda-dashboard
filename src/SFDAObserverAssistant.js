import { useState, useRef, useEffect } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

const OBSERVER_QUESTIONS = [
  'How many shipments are currently stuck at the border?',
  'Which country has the highest non-conformity rate?',
  'Which QC lab has the most shipments assigned?',
  'How many shipments are pending SFDA decision right now?',
  'What is the overall conformity rate this month?',
  'Which port has the highest shipment volume?',
];

export default function SFDAObserverAssistant({ token }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to DEMARA Masaar Intelligence. I have access to real-time import clearance data across all active shipments. Ask me anything about conformity rates, stuck shipments, lab performance, or country risk profiles.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: messageText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/assistant/observer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: messageText, history: messages.slice(-4) })
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.answer }]);
        if (data.data_snapshot) setSnapshot(data.data_snapshot);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Failed to retrieve data. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:'Inter,sans-serif',background:'#FFFFFF',borderRadius:'14px',border:'1px solid rgba(39,48,110,0.1)',overflow:'hidden'}}>

      {/* Header */}
      <div style={{padding:'14px 18px',background:'linear-gradient(135deg, #1C2460 0%, #27306E 100%)',display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(68,200,245,0.2)',border:'1px solid rgba(68,200,245,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>🔍</div>
        <div>
          <div style={{fontSize:'14px',fontWeight:700,color:'#FFFFFF'}}>Masaar Intelligence</div>
          <div style={{fontSize:'11px',color:'#44C8F5'}}>Real-time import data · SFDA Observer</div>
        </div>
        {snapshot && (
          <div style={{marginLeft:'auto',display:'flex',gap:'12px'}}>
            {[
              {label:'Total',value:snapshot.total,color:'#44C8F5'},
              {label:'Conformity',value:snapshot.conformity_rate+'%',color:'#00C896'},
              {label:'Stuck',value:snapshot.stuck_count,color: snapshot.stuck_count > 0 ? '#F5A623' : '#00C896'},
            ].map(({label,value,color}) => (
              <div key={label} style={{textAlign:'center'}}>
                <div style={{fontSize:'16px',fontWeight:800,color}}>{value}</div>
                <div style={{fontSize:'9px',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.5px'}}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick questions */}
      {messages.length === 1 && (
        <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(39,48,110,0.06)',background:'#FAFBFF'}}>
          <div style={{fontSize:'10px',fontWeight:700,color:'#808285',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'8px'}}>Intelligence Queries</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {OBSERVER_QUESTIONS.map((q,i) => (
              <button key={i} onClick={() => sendMessage(q)}
                style={{padding:'5px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:500,cursor:'pointer',border:'1px solid rgba(39,48,110,0.12)',background:'#FFFFFF',color:'#27306E',transition:'all 0.15s',textAlign:'left'}}
                onMouseOver={e => {e.target.style.borderColor='#44C8F5';e.target.style.color='#44C8F5';}}
                onMouseOut={e => {e.target.style.borderColor='rgba(39,48,110,0.12)';e.target.style.color='#27306E';}}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
        {messages.map((msg,i) => (
          <div key={i} style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start',gap:'8px',alignItems:'flex-start'}}>
            {msg.role === 'assistant' && (
              <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'linear-gradient(135deg,#1C2460,#27306E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0,marginTop:'2px'}}>🔍</div>
            )}
            <div style={{
              maxWidth:'82%',padding:'10px 14px',
              borderRadius:msg.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
              background:msg.role==='user'?'#27306E':'#F5F7FF',
              border:msg.role==='user'?'none':'1px solid rgba(39,48,110,0.08)',
              color:msg.role==='user'?'#FFFFFF':'#27306E',
              fontSize:'13px',lineHeight:1.6,
              whiteSpace:'pre-wrap'
            }}>
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{__html:
                  msg.content
                    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                    .replace(/#{1,3} (.+)/g,'<strong style="font-size:14px;display:block;margin-bottom:4px">$1</strong>')
                    .replace(/\n/g,'<br/>')
                }} />
              ) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'#44C8F5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:'#27306E',flexShrink:0,marginTop:'2px'}}>S</div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'linear-gradient(135deg,#1C2460,#27306E)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0}}>🔍</div>
            <div style={{padding:'10px 14px',borderRadius:'14px 14px 14px 4px',background:'#F5F7FF',border:'1px solid rgba(39,48,110,0.08)',display:'flex',gap:'4px',alignItems:'center'}}>
              {[0,1,2].map(i => (
                <div key={i} style={{width:'6px',height:'6px',borderRadius:'50%',background:'#44C8F5',animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}></div>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input */}
      <div style={{padding:'12px 16px',borderTop:'1px solid rgba(39,48,110,0.08)',background:'#FFFFFF'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}
            placeholder="Query the platform data — conformity rates, stuck shipments, lab performance..."
            rows={2}
            style={{flex:1,border:'1px solid rgba(39,48,110,0.15)',borderRadius:'10px',padding:'10px 12px',fontSize:'13px',color:'#27306E',fontFamily:'Inter,sans-serif',outline:'none',resize:'none',lineHeight:1.5,background:'#FAFBFF'}}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim()||loading}
            style={{width:'40px',height:'40px',borderRadius:'10px',background:input.trim()&&!loading?'#27306E':'#808285',border:'none',cursor:input.trim()&&!loading?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',color:'white',flexShrink:0}}>
            {loading?'⟳':'↑'}
          </button>
        </div>
        <div style={{fontSize:'10px',color:'#808285',marginTop:'6px',textAlign:'center'}}>
          Powered by DEMARA Masaar Intelligence · Real-time data
        </div>
      </div>

      <style>{`@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}