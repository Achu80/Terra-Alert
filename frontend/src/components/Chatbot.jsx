import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

function getRiskLevel(score) {
    if (score >= 80) return 'CRITICAL'
    if (score >= 60) return 'HIGH'
    if (score >= 40) return 'MODERATE'
    return 'LOW'
}

export default function Chatbot({ prediction }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const sessionId = useRef(crypto.randomUUID())
    const scrollRef = useRef(null)

    useEffect(() => {
        if (messages.length > 0) {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMessage = input.trim()
        setMessages(prev => [...prev, { role: 'user', text: userMessage }])
        setInput('')
        setLoading(true)

        const context = prediction
            ? {
                latitude: prediction.location.lat,
                longitude: prediction.location.lon,
                location_name: prediction.location.name || 'Selected location',
                risk_score: prediction.prediction.score,
                risk_level: getRiskLevel(prediction.prediction.score),
            }
            : null

        try {
            const response = await fetch('http://localhost:5000/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    session_id: sessionId.current,
                    context,
                }),
            })

            const data = await response.json()
            setMessages(prev => [...prev, { role: 'assistant', text: data.reply }])
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Please try again.' }])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-col h-[calc(100vh-220px)]">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">TerraAlert Assistant</h3>
                {prediction && (
                    <span className="text-xs text-violet-400">
                        📍 {prediction.location.name || 'Location set'}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {messages.length === 0 && (
                    <p className="text-xs text-white/40">
                        Ask about first aid, or get a risk assessment first for hospital/route info.
                    </p>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`text-sm p-2 rounded-lg ${msg.role === 'user'
                            ? 'bg-violet-500/20 text-white ml-8'
                            : 'bg-white/5 text-white/80 mr-8'
                            }`}
                    >
                        {msg.role === 'assistant' ? (
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                        ) : (
                            msg.text
                        )}
                    </div>
                ))}
                {loading && <div className="text-sm text-white/40 mr-8">Typing...</div>}
                <div ref={scrollRef} />
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask something..."
                    disabled={loading}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-violet-400"
                />
                <button
                    onClick={sendMessage}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:bg-violet-500/50 text-white text-sm font-medium"
                >
                    Send
                </button>
            </div>
        </div>
    )
}