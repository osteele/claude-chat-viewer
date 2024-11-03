import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { parseMessage } from '../lib/messageParser';
import { ChatData } from '../types/types';

const STORAGE_KEY = 'chat-viewer-json';

const validateSchema = (data: unknown): data is ChatData => {
  if (!data || typeof data !== 'object') return false;
  const chatData = data as Partial<ChatData>;

  if (!Array.isArray(chatData.chat_messages)) return false;

  return chatData.chat_messages.every(message =>
    message.uuid &&
    message.sender &&
    Array.isArray(message.content) &&
    message.content.every(item =>
      item.type === 'text' &&
      typeof item.text === 'string'
    )
  );
};

interface JsonInputProps {
  onValidJson: (data: ChatData) => void;
  initialJson?: string;
}

const JsonInput: React.FC<JsonInputProps> = ({ onValidJson, initialJson = '' }) => {
  const [jsonText, setJsonText] = useState(initialJson);
  const [error, setError] = useState<string>('');

  const handleSubmit = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!validateSchema(parsed)) {
        throw new Error('Invalid chat data structure');
      }
      localStorage.setItem(STORAGE_KEY, jsonText);
      onValidJson(parsed);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">
        Paste a Claude Artifact JSON file here to visualize the conversation.
      </div>
      <div className="text-sm text-gray-600">
        See <a href="https://observablehq.com/@simonw/convert-claude-json-to-markdown">Convert Claude JSON to Markdown</a>
        for instructions on how to export a Claude chat as JSON.
      </div>

      <textarea
        className="w-full h-96 p-4 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder="Paste JSON here..."
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error parsing JSON: {error}
          </AlertDescription>
        </Alert>
      )}

      <Button onClick={handleSubmit} className="w-full">
        Load Conversation
      </Button>
    </div>
  );
};

interface MessageCardProps {
  message: ChatData['chat_messages'][number];
}

const MessageCard: React.FC<MessageCardProps> = ({ message }) => {
  const isHuman = message.sender === 'human';

  const renderContent = (content: ChatData['chat_messages'][number]['content']) => {
    return content.map((item, index) => {
      if (item.type === 'text') {
        const segments = isHuman ?
          [{ type: 'text' as const, content: item.text }] :
          parseMessage(item.text);

        return (
          <div key={index} className="prose max-w-none rounded-lg p-4">
            {segments.map((segment, i) => {
              if (segment.type === 'artifact') {
                return (
                  <div key={i} className="my-4 bg-white rounded border border-[#e8e7df] cursor-pointer hover:bg-gray-50">
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded">
                          <div className="text-sm text-gray-600 font-mono">&lt;/&gt;</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{segment.title}</div>
                          <div className="text-sm text-gray-500">Click to open component</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (segment.type === 'thinking') {
                return (
                  <div key={i} className="my-4 bg-purple-50 rounded border border-purple-100 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded">
                        <div className="text-sm text-purple-600">💭</div>
                      </div>
                      <div className="text-sm text-purple-700">Thinking Process</div>
                    </div>
                    <div className="text-sm text-purple-600">
                      {segment.content}
                    </div>
                  </div>
                );
              }

              return segment.content.split('\n').map((line, j) => (
                <ReactMarkdown
                  key={`${i}-${j}`}
                  className="prose prose-sm max-w-none"
                  components={{
                    code: ({node, className, children, ...props}) => {
                      return (
                        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                          <code {...props}>{children}</code>
                        </pre>
                      )
                    },
                    li: ({children}) => <li className="my-0">{children}</li>
                  }}
                >
                  {line}
                </ReactMarkdown>
              ));
            })}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className={`mb-8 bg-gray-200 rounded-md overflow-hidden
      ${isHuman ?
        'flex gap-2 bg-gradient-to-t from-[#e8e5d8] to-[#f5f4ee] border border-[#e8e7df]' :
        'bg-[#f8f8f4] border border-[#e9e7e1]'
      }`}>
      {isHuman && (
        <div className="flex-shrink-0 pt-4 pl-4">
          <div className="w-6 h-6 rounded-full bg-[#5645a1] text-white flex items-center justify-center text-sm">
            H
          </div>
        </div>
      )}

      {message.files && message.files.length > 0 && (
        <div className={`mb-4 hidden`}>
          {message.files.map((_file, i) => (
            <div key={i} className="w-64 h-64 ">
              <img
                src="/api/placeholder/256/256"
                alt="Chat attachment"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <div>
        {renderContent(message.content)}
      </div>
    </div>
  );
};

interface ConversationViewProps {
  data: ChatData;
}

const ConversationView: React.FC<ConversationViewProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-6">
      <Card className="mb-6 bg-white border-[#e9e7e1]">
        <div
          className="p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-600">🔄</span>
            <span className="font-medium">{data.name || 'Chat Conversation'}</span>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </Card>

      <div className="space-y-6">
        {data.chat_messages.map((message) => (
          <MessageCard key={message.uuid} message={message} />
        ))}
      </div>
    </div>
  );
};

const ChatViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'json' | 'view'>('json');
  const [chatData, setChatData] = useState<ChatData | null>(null);

  useEffect(() => {
    const savedJson = localStorage.getItem(STORAGE_KEY);
    if (savedJson) {
      try {
        const parsed = JSON.parse(savedJson);
        if (validateSchema(parsed)) {
          setChatData(parsed);
          setActiveTab('view');
        }
      } catch (err) {
        console.error('Error loading saved JSON:', err);
      }
    }
  }, []);

  const handleValidJson = (data: ChatData) => {
    setChatData(data);
    setActiveTab('view');
  };

  return (
    <div className="min-h-screen bg-[#f1f0e7]">
      <div className="max-w-4xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={val => setActiveTab(val as 'json' | 'view')}>
          <TabsList className="mb-6">
            <TabsTrigger value="json">Enter JSON</TabsTrigger>
            <TabsTrigger value="view" disabled={!chatData}>View</TabsTrigger>
          </TabsList>

          <TabsContent value="json">
            <JsonInput
              onValidJson={handleValidJson}
              initialJson={chatData ? JSON.stringify(chatData, null, 2) : ''}
            />
          </TabsContent>

          <TabsContent value="view">
            {chatData && <ConversationView data={chatData} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatViewer;
