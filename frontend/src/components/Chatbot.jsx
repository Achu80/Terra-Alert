import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Mic, Loader2, Volume2, VolumeX } from 'lucide-react'

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
    const [voiceStatus, setVoiceStatus] = useState('idle') // 'idle' | 'listening' | 'processing'
    const recognitionRef = useRef(null)
    const [speechEnabled, setSpeechEnabled] = useState(true)
    useEffect(() => {
        if (messages.length > 0) {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const speakText = (text) => {
        if (!speechEnabled || !('speechSynthesis' in window)) return
        // strip basic markdown so it doesn't read out symbols like * and #
        const plainText = text.replace(/[#*_`>-]/g, '')
        const utterance = new SpeechSynthesisUtterance(plainText)
        utterance.lang = 'en-IN'
        utterance.rate = 1
        window.speechSynthesis.cancel()
        window.speechSynthesis.resume() // wakes the engine if Chrome left it paused/stuck
        window.speechSynthesis.speak(utterance)
    }

    const sendMessage = async (overrideText) => {
        const userMessage = (overrideText ?? input).trim()
        if (!userMessage || loading) return

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
            speakText(data.reply)
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Please try again.' }])
        } finally {
            setLoading(false)
            setVoiceStatus('idle')
        }
    }



    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }
    const handleMicClick = () => {
        if (voiceStatus === 'listening') {
            recognitionRef.current?.stop()
            return
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Voice input is not supported in this browser. Please use Chrome or Edge.' }])
            return
        }

        const recognition = new SpeechRecognition()
        recognition.lang = 'en-IN'
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onstart = () => setVoiceStatus('listening')

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            setVoiceStatus('processing')
            sendMessage(transcript)
        }

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error)
            setVoiceStatus('idle')
        }

        recognition.onend = () => {
            setVoiceStatus(prev => (prev === 'listening' ? 'idle' : prev))
        }

        recognitionRef.current = recognition
        recognition.start()
    }

    return (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex flex-col h-[calc(100vh-220px)]">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">TerraAlert Assistant</h3>
                    <button
                        onClick={() => {
                            setSpeechEnabled(prev => {
                                const next = !prev
                                if (next) {
                                    window.speechSynthesis.resume()
                                } else {
                                    window.speechSynthesis.pause()
                                }
                                return next
                            })
                        }}
                        className="text-white/40 hover:text-white/80"
                        aria-label="Toggle voice replies"
                    >
                        {speechEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                </div>
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
                    onClick={handleMicClick}
                    disabled={voiceStatus === 'processing'}
                    className={`px-3 py-2 rounded-lg flex items-center justify-center transition-colors ${voiceStatus === 'listening'
                        ? 'bg-red-500 text-white animate-pulse'
                        : voiceStatus === 'processing'
                            ? 'bg-violet-500/30 text-white/50 cursor-not-allowed'
                            : 'bg-white/5 border border-white/10 text-violet-400 hover:bg-white/10'
                        }`}
                >
                    {voiceStatus === 'processing' ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Mic size={18} />
                    )}
                </button>

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