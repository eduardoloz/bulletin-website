import React, { useState, useRef, useEffect } from 'react';

export default function ChatBot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I can help you find information about professors and courses based on student reviews. Try asking me something like "How is CSE 214?" or "Tell me about Professor Smith".',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [courseFilter, setCourseFilter] = useState('');
  const [professorFilter, setProfessorFilter] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to chat
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Build conversation history for context (last 5 user/assistant messages)
      const conversationHistory = messages
        .slice(-10) // Get last 10 messages (5 pairs of user/assistant)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Call the chatbot API
      console.log('Sending query to backend:', userMessage);
      console.log('With conversation history:', conversationHistory.length, 'messages');

      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();

      // Add assistant response to chat
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please make sure the backend server is running (uvicorn server:app --reload --port 8000 in the /chatbot folder).',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "How is CSE 214?",
    "Tell me about Professor Esmaili",
    "Which professors teach easy courses?",
    "What's the difficulty of AMS 301?",
  ];

  const handleSuggestionClick = (question) => {
    setInput(question);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hi! I can help you find information about professors and courses based on student reviews. Try asking me something like "How is CSE 214?" or "Tell me about Professor Smith".',
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Professor Review Chatbot</h1>
            <p className="text-sm text-gray-600 mt-1">
              Ask me anything about professors and courses based on RateMyProfessor reviews
            </p>
          </div>
          {messages.length > 1 && (
            <button
              onClick={clearChat}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by:</label>
          </div>
          <input
            type="text"
            placeholder="Course (e.g., CSE 214)"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Professor (e.g., Esmaili)"
            value={professorFilter}
            onChange={(e) => setProfessorFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(courseFilter || professorFilter) && (
            <button
              onClick={() => {
                setCourseFilter('');
                setProfessorFilter('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Clear filters
            </button>
          )}
          {(courseFilter || professorFilter) && (
            <span className="text-xs text-blue-600 font-medium">
              Filtering active
            </span>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.error
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Show sources if available */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Sources:</p>
                  <div className="space-y-1">
                    {message.sources.map((source, i) => (
                      <div key={i} className="text-xs text-gray-600">
                        📚 {source.course} - {source.professor} (Quality: {source.quality?.toFixed(1)},
                        Difficulty: {source.difficulty?.toFixed(1)})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="animate-bounce">💭</div>
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="px-6 py-3 bg-white border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(question)}
                className="px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full border border-blue-200 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a professor or course..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: The backend server must be running on port 8000 for this to work
        </p>
      </div>
    </div>
  );
}
