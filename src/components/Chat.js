import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./Chat.css";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botResponse = "";

      setIsTyping(false);

      const processLine = (line) => {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          botResponse += data.message;
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            if (newMessages[newMessages.length - 1].sender === "bot") {
              newMessages[newMessages.length - 1].text = botResponse;
            } else {
              newMessages.push({ sender: "bot", text: botResponse });
            }
            return newMessages;
          });
        } else if (line === "event: end") {
          setIsTyping(false);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        lines.forEach(processLine);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className={`chat-container ${darkTheme ? "dark-theme" : ""}`}>
      <div className="glassy-transparent">
        <button className="darkBtn" onClick={() => setDarkTheme(!darkTheme)}>
          {!darkTheme ? "🌙" : "☀️"}
        </button>
      </div>
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message-container ${msg.sender}`}>
            <div className={`message ${msg.sender}`}>
              <ReactMarkdown
                children={msg.text}
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        children={String(children).replace(/\n$/, "")}
                        style={materialDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      />
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              />
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message-container bot">
            <div className="message bot">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
        />
        <button className="button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
