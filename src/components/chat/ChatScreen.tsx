
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { ChatMessage } from '../../types';
import { marked } from 'marked';

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chat history from localStorage
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }

    // Add welcome message if no history
    if (!savedMessages) {
      const welcomeMessage: ChatMessage = {
        id: '1',
        text: 'Hello! I\'m your Cameroon legal assistant. How can I help you with legal information today?',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  useEffect(() => {
    // Save messages to localStorage
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getBotResponse = (message: string): string => {
    const normalizedMessage = message.toLowerCase();
    
    if (normalizedMessage.includes('hello') || normalizedMessage.includes('hi')) {
      return "Hello! I'm your Cameroon legal assistant. How can I help you with legal information today?";
    } else if (normalizedMessage.includes('theft') || normalizedMessage.includes('stealing')) {
      return "**Theft in Cameroon Law**\n\nTheft is addressed in Section 318 of the Cameroon Penal Code.\n\n**Definition:** Theft is defined as fraudulently taking property belonging to another person.\n\n**Penalties:**\n- Simple theft: Imprisonment from 5 to 10 years and a fine\n- Aggravated theft (with weapons or at night): Imprisonment from 10 to 20 years\n\nIf you're dealing with a theft case, it's advisable to consult with a licensed attorney in Cameroon for specific advice.";
    } else if (normalizedMessage.includes('marriage') || normalizedMessage.includes('divorce')) {
      return "**Marriage and Divorce in Cameroon**\n\nCameroon recognizes both civil marriages and traditional marriages.\n\n**Marriage Requirements:**\n- Minimum age: 18 for males, 15 for females (with parental consent)\n- No existing marriages (prohibition of polygamy in civil marriages)\n- Consent of both parties\n\n**Divorce:**\n- Grounds include adultery, abandonment, and cruelty\n- Both judicial and traditional divorce procedures exist\n- Child custody typically favors the mother for young children\n\nThe Civil Status Registration Ordinance (No. 81-02) governs civil marriages and divorces in Cameroon.";
    } else if (normalizedMessage.includes('assault') || normalizedMessage.includes('battery') || normalizedMessage.includes('fight')) {
      return "**Assault in Cameroon Law**\n\nAssault is covered under Section 337 of the Cameroon Penal Code.\n\n**Definition:** Assault refers to any force intentionally applied to another person without their consent.\n\n**Penalties:**\n- Simple assault: Imprisonment from 6 days to 3 years and a fine\n- Aggravated assault (causing serious harm): Imprisonment from 5 to 10 years\n- Assault resulting in death unintentionally: Imprisonment from 6 to 20 years\n\nSelf-defense is recognized as a legal justification under certain circumstances, outlined in Section 84 of the Penal Code.";
    } else {
      return "Thank you for your question about Cameroon's legal system. To provide you with accurate information, I would need to research specific Cameroon laws and regulations related to this topic. In a full implementation, I would connect to comprehensive legal databases and resources specific to Cameroon's legal code.\n\nIf you have questions about a specific area of law, such as criminal law, family law, property rights, or business regulations, please let me know and I can provide more targeted information.";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputMessage),
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.sender === 'bot') {
      return <div dangerouslySetInnerHTML={{ __html: marked(message.text) }} />;
    }
    return <p>{message.text}</p>;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="card mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Legal Assistant</h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Ask questions about Cameroon's legal system, laws, and offences. I'll provide information and references to relevant legal provisions.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 overflow-y-auto mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 mb-4 ${
              message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.sender === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`flex-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block p-3 rounded-lg max-w-xs sm:max-w-md lg:max-w-lg ${
                message.sender === 'user'
                  ? 'bg-primary text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
              }`}>
                {renderMessageContent(message)}
              </div>
              <div className={`text-xs text-gray-500 mt-1 ${
                message.sender === 'user' ? 'text-right' : 'text-left'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Bot size={16} className="text-gray-600 dark:text-gray-300" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a legal question..."
            className="flex-1 input-field"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
