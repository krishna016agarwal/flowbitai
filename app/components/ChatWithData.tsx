"use client";
import React, { useState, useRef } from "react";
import { MessageSquare, Zap, Database, CheckSquare, XCircle } from "lucide-react";

type Row = Record<string, any>;

export default function ChatWithData() {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<{ type: string; text?: string; sql?: string }[]>([]);
    const [rows, setRows] = useState<Row[] | null>(null);
    const [sql, setSql] = useState<string | null>(null);
    const streamingRef = useRef(false);

    async function submit() {
        if (!question.trim() || streamingRef.current) return;
        setMessages([{ type: "info", text: "Sending query..." }]);
        setRows(null);
        setSql(null);
        streamingRef.current = true;

        try {
            const res = await fetch("http://127.0.0.1:8000/chat-with-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question }),
            });

            if (!res.ok) {
                const err = await res.text();
                setMessages([{ type: "error", text: err }]);
                streamingRef.current = false;
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            if (!reader) {
                setMessages([{ type: "error", text: "No streaming body." }]);
                streamingRef.current = false;
                return;
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let idx;
                while ((idx = buffer.indexOf("\n\n")) !== -1) {
                    const chunk = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 2);

                    const lines = chunk.split("\n").filter(Boolean);
                    for (const line of lines) {
                        if (!line.startsWith("data:")) continue;
                        const payload = line.replace(/^data:\s?/, "");
                        try {
                            const obj = JSON.parse(payload);
                            handleEvent(obj);
                        } catch (e) {
                            console.error("Malformed JSON chunk:", payload, e);
                        }
                    }
                }
            }

            // flush remaining buffer
            if (buffer.trim()) {
                try {
                    const obj = JSON.parse(buffer.replace(/^data:\s?/, ""));
                    handleEvent(obj);
                } catch {
                    // ignore
                }
            }
        } catch (err: any) {
            setMessages([{ type: "error", text: err.message || "Request failed" }]);
        } finally {
            streamingRef.current = false;
        }
    }

    function handleEvent(obj: any) {
        switch (obj.type) {
            case "llm_text":
                setMessages((m) => [...m, { type: "llm_text", text: obj.text }]);
                break;
            case "sql_candidate":
                setSql(obj.sql);
                setMessages((m) => [...m, { type: "sql", sql: obj.sql }]);
                break;
            case "result_rows":
                setRows(obj.rows || []);
                setMessages((m) => [...m, { type: "info", text: `Received ${obj.rows?.length ?? 0} rows` }]);
                break;
            case "result_meta":
                setMessages((m) => [...m, { type: "info", text: `Rows: ${obj.row_count}` }]);
                break;
            case "error":
                setMessages((m) => [...m, { type: "error", text: obj.text }]);
                break;
            case "info":
            case "done":
                setMessages((m) => [...m, { type: "info", text: obj.text }]);
                break;
            default:
                break;
        }
    }

    const getMessageStyle = (type: string) => {
        switch (type) {
            case "sql":
                return "bg-green-50 text-gray-800 p-2 rounded-lg my-2 border border-green-200";
            case "llm_text":
                return "text-gray-700";
            case "info":
            case "done":
                return "text-sm text-green-700 font-medium flex items-center gap-2";
            case "error":
                return "text-sm text-red-600 font-medium flex items-center gap-2";
            default:
                return "text-gray-600";
        }
    };

    return (
        <div className="p-8 bg-green-50 min-h-full">
            <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-3xl font-bold mb-6 text-green-800 flex items-center gap-2">
                    <MessageSquare size={28} className="text-green-500" /> Chat with Data
                </h2>

                <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                    <textarea
                        className="w-full text-black p-4 border border-green-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition shadow-inner resize-none text-gray-900 placeholder-gray-500"
                        rows={4}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder='Ask a question about your data, e.g., "What is the total spend in the last 90 days?"'
                    />
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={submit}
                            disabled={streamingRef.current}
                            className={`px-6 py-2 rounded-full font-semibold transition duration-200 ${streamingRef.current
                                    ? "bg-green-400 opacity-70 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 text-white shadow-md"
                                }`}
                        >
                            {streamingRef.current ? (
                                <span className="flex items-center gap-2">
                                    <Zap size={18} className="animate-pulse" /> Processing...
                                </span>
                            ) : (
                                "Ask"
                            )}
                        </button>
                    </div>
                </div>

                {/* Stream Messages */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Conversation Stream</h3>
                    <div className="p-4 border border-gray-200 rounded-lg max-h-52 overflow-y-auto bg-gray-50 shadow-inner">
                        {messages.map((m, i) => (
                            <div key={i} className={`mb-2 ${getMessageStyle(m.type)}`}>
                                {(m.type === "info" || m.type === "done") && <CheckSquare size={14} />}
                                {m.type === "error" && <XCircle size={14} />}
                                {m.type === "sql" ? (
                                    <pre className="text-sm font-mono whitespace-pre-wrap break-words">{m.sql}</pre>
                                ) : (
                                    m.text
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Generated SQL Section */}
                {sql && (
                    <div className="mb-8 p-4 border border-green-400 rounded-lg bg-green-100 shadow-md">
                        <h3 className="text-xl font-semibold mb-3 text-green-800 flex items-center gap-2">
                            <Database size={20} /> Generated SQL
                        </h3>
                        <pre className="bg-green-800 text-gray-900 p-4 rounded-lg overflow-auto font-mono text-sm whitespace-pre-wrap break-words">{sql}</pre>
                    </div>
                )}

                {/* Results Table Section */}
                {rows && rows.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-xl font-semibold mb-3 text-gray-700">Results ({rows.length})</h3>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-green-200">
                                    <tr>
                                        {Object.keys(rows[0]).map((col) => (
                                            <th
                                                key={col}
                                                className="px-6 py-3 text-left text-xs font-bold text-green-800 uppercase tracking-wider"
                                            >
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {rows.map((r, i) => (
                                        <tr key={i} className="hover:bg-green-50 transition duration-150">
                                            {Object.values(r).map((v, j) => (
                                                <td key={j} className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                                                    {String(v ?? "")}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
