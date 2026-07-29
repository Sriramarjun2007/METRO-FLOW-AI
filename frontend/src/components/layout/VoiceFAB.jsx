import React, { useEffect, useRef, useState } from "react";
import { Mic, X, Send, Bot } from "lucide-react";
import clsx from "clsx";

// Floating AI Assistant - text + (optional) voice input. Exposed as FAB.
export default function VoiceFAB() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [input, setInput] = useState("");
  const [thread, setThread] = useState([
    {
      role: "assistant",
      text: "Hello, I'm Metro Assistant. Ask about queues, signals, consensus, or say 'activate green corridor'.",
    },
  ]);
  const recRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread]);

  async function send(text) {
    const q = (text || input).trim();
    if (!q) return;
    setThread((t) => [...t, { role: "user", text: q }]);
    setInput("");
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });
      const j = await res.json();
      setThread((t) => [...t, { role: "assistant", text: j.reply || "(no reply)" }]);
    } catch (e) {
      setThread((t) => [...t, { role: "assistant", text: "Network error — please retry." }]);
    }
  }

  function startListen() {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        setThread((t) => [...t, { role: "assistant", text: "Voice recognition not supported in this browser." }]);
        return;
      }
      const rec = new SR();
      rec.lang = "en-US";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        send(text);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      rec.start();
      setListening(true);
      recRef.current = rec;
    } catch (e) {
      setListening(false);
    }
  }

  function stopListen() {
    recRef.current?.stop();
    setListening(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          "fixed right-6 bottom-6 z-40 h-14 w-14 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-neon-cyan to-neon-violet text-ink-900 shadow-[0_8px_30px_rgba(34,224,255,0.4)] hover:scale-105 transition",
          open && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <Bot className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed right-6 bottom-6 z-40 w-[360px] glass-strong p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center">
                <Bot className="h-4 w-4 text-ink-900" />
              </div>
              <div>
                <div className="text-[13px] font-semibold">Metro Assistant</div>
                <div className="text-[10px] text-slate-400">Urban Consensus voice queries</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/5">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="h-64 overflow-y-auto pr-1 space-y-2 text-[12px]">
            {thread.map((m, i) => (
              <div
                key={i}
                className={clsx(
                  "px-3 py-2 rounded-xl max-w-[85%]",
                  m.role === "user"
                    ? "ml-auto bg-neon-cyan/15 border border-neon-cyan/30"
                    : "bg-white/[0.04] border border-white/10"
                )}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={listening ? stopListen : startListen}
              className={clsx(
                "h-9 w-9 rounded-lg flex items-center justify-center border",
                listening
                  ? "bg-neon-rose/15 border-neon-rose/40 text-neon-rose animate-pulse_soft"
                  : "bg-white/[0.04] border-white/10 hover:border-neon-cyan/40"
              )}
            >
              <Mic className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask... e.g. 'queue length at J-2-1'"
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[12px] outline-none focus:border-neon-cyan/40"
            />
            <button onClick={() => send()} className="h-9 w-9 rounded-lg bg-neon-cyan text-ink-900 flex items-center justify-center">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
