"use client"
import { useState, useRef, useEffect } from "react"
import { Room, RoomEvent, type Participant } from "livekit-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { searchKB } from "@/lib/db"

export default function LiveKitCard() {
  const [room, setRoom] = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [roomName, setRoomName] = useState("playground-Hl7h-GYEo")
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Array<{ sender: string; text: string }>>([])
  const [error, setError] = useState("")
  const [spawnAgent, setSpawnAgent] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const recognitionRef = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        await processAudioInput(audioBlob)
      }

      return mediaRecorder
    } catch (err) {
      setError("Microphone access denied. Please enable microphone permissions.")
      return null
    }
  }

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      // Use Web Speech API directly on the recorded audio
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"

      // Create a promise to handle the recognition result
      const transcriptionPromise = new Promise<string>((resolve, reject) => {
        recognition.onresult = (event: any) => {
          if (event.results && event.results.length > 0) {
            const transcript = event.results[0][0].transcript
            resolve(transcript)
          } else {
            reject(new Error("No speech recognized"))
          }
        }

        recognition.onerror = (event: any) => {
          if (event.error === "no-speech") {
            reject(new Error("No speech detected. Please speak clearly and try again."))
          } else if (event.error === "network") {
            reject(new Error("Network error. Please check your connection."))
          } else if (event.error === "audio-capture") {
            reject(new Error("Microphone not working. Please check permissions."))
          } else {
            reject(new Error(`Speech recognition error: ${event.error}`))
          }
        }

        recognition.onend = () => {}
      })

      // Start recognition
      recognition.start()

      // Wait for transcription result
      const transcript = await transcriptionPromise

      await handleAgentResponse(transcript)
    } catch (err) {
      setError(`Audio processing failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      setIsListening(false)
    }
  }

  const handleAgentResponse = async (userMessage: string) => {
    if (!userMessage.trim()) {
      return
    }

    try {
      setMessages((prev) => [...prev, { sender: "You", text: userMessage }])
      setMessage("")

      const kbEntry = searchKB(userMessage)
      let response = ""

      if (kbEntry) {
        response = kbEntry.answer
      } else {
        response = "Let me check with my supervisor and get back to you."
        try {
          await fetch("/api/help-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caller: "LiveKit Caller",
              question: userMessage,
            }),
          })
        } catch (err) {}
      }

      setMessages((prev) => [...prev, { sender: "Agent", text: response }])

      await speakResponse(response)

      // Send via LiveKit data message
      if (room) {
        room.localParticipant.publishData(new TextEncoder().encode(response), { reliable: true })
      }
    } catch (err) {
      setError(`Agent error: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const speakResponse = async (text: string) => {
    return new Promise<void>((resolve) => {
      try {
        setIsSpeaking(true)
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1
        utterance.pitch = 1
        utterance.volume = 1

        utterance.onend = () => {
          setIsSpeaking(false)
          resolve()
        }

        utterance.onerror = (event) => {
          setIsSpeaking(false)
          resolve()
        }

        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      } catch (err) {
        setIsSpeaking(false)
        resolve()
      }
    })
  }

  const joinRoom = async () => {
    try {
      setError("")
      const liveKitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

      if (!liveKitUrl) {
        setError("LiveKit URL not configured. Please check environment variables.")
        return
      }

      const tokenResponse = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: `Caller-${Math.random().toString(36).substr(2, 9)}`,
          room: roomName,
        }),
      })

      if (!tokenResponse.ok) {
        let errorMessage = "Failed to get LiveKit token"
        try {
          const contentType = tokenResponse.headers.get("content-type")
          if (contentType?.includes("application/json")) {
            const errorData = await tokenResponse.json()
            errorMessage = errorData.error || errorMessage
          } else {
            const text = await tokenResponse.text()
            errorMessage = `Server error: ${text.substring(0, 100)}`
          }
        } catch (parseErr) {
          errorMessage = `Server error (${tokenResponse.status})`
        }
        setError(errorMessage)
        return
      }

      const { token } = await tokenResponse.json()
      const newRoom = new Room()

      newRoom.on(RoomEvent.ParticipantConnected, (participant: Participant) => {})

      newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        const text = new TextDecoder().decode(payload)
        setMessages((prev) => [...prev, { sender: "Agent", text }])
      })

      await newRoom.connect(liveKitUrl, token)
      setRoom(newRoom)
      setConnected(true)
      setMessages([{ sender: "System", text: `Connected to room: ${roomName}` }])
    } catch (err) {
      setError(`Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const leaveRoom = async () => {
    if (room) {
      await room.disconnect()
      setRoom(null)
      setConnected(false)
      setMessages([])
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
  }

  const startVoiceInput = async () => {
    try {
      setError("")
      const mediaRecorder = await initializeAudio()
      if (mediaRecorder) {
        setIsListening(true)
        mediaRecorder.start()
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop()
            setIsListening(false)
          }
        }, 5000) // 5 second recording limit
      }
    } catch (err) {
      setError(`Voice input failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      setIsListening(false)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !room) return
    await handleAgentResponse(message)
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>LiveKit Voice Connection</CardTitle>
        <CardDescription>Connect to a LiveKit room for real-time voice/data communication</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {!connected ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Room Name</label>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="mt-1"
              />
            </div>
            <Button onClick={joinRoom} className="w-full">
              Join Room
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md bg-primary/10 p-2 text-sm text-primary">Connected to: {roomName}</div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="spawn-agent"
                checked={spawnAgent}
                onChange={(e) => setSpawnAgent(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="spawn-agent" className="text-sm">
                Enable AI Agent (Voice Mode)
              </label>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 space-y-2">
              {messages.map((msg, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-semibold text-primary">{msg.sender}:</span>{" "}
                  <span className="text-foreground">{msg.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={startVoiceInput}
                disabled={isListening || isSpeaking}
                variant={isListening ? "default" : "outline"}
                className="flex-1"
              >
                {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "🎤 Speak"}
              </Button>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Or type a message..."
              />
              <Button onClick={sendMessage} disabled={!message.trim()}>
                Send
              </Button>
            </div>

            <Button onClick={leaveRoom} variant="outline" className="w-full bg-transparent">
              Leave Room
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
