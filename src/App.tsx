import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ask } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import { TriangleAlert } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import ollamaIcon from '@/assets/ollama-icon.png';
import openaiIcon from '@/assets/openai-icon.png';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  name: string;
  messages: Message[];
  provider: 'ollama' | 'openai';
}

const App: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      name: 'Example',
      messages: [],
      provider: 'ollama',
    },
    {
      id: '2',
      name: 'Example',
      messages: [],
      provider: 'openai',
    },
  ]);

  const [selectedChat, setSelectedChat] = useState<Chat>(chats[0]);
  const [input, setInput] = useState('');
  const [openAIKey, setOpenAIKey] = useState<string | null>(null);

  useEffect(() => {
    invoke<{ openai_api_key: string | null }>('get_config')
      .then((config) => setOpenAIKey(config.openai_api_key))
      .catch((error) => console.error('Failed to load config:', error));
  }, []);

  const handleSendMessage = () => {
    if (!selectedChat || !input.trim()) return;

    const newMessage: Message = { role: 'user', content: input };

    const updatedChat = {
      ...selectedChat,
      messages: [...selectedChat.messages, newMessage],
    };

    setChats(
      chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
    );
    setSelectedChat(updatedChat);
    setInput('');

    // TODO: Implement actual API calls to Ollama or OpenAI here
    // For now, we'll just simulate a response
    setTimeout(() => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: `This is a simulated response from ${selectedChat.provider}.`,
      };
      const chatWithResponse = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage],
      };
      setChats(
        chats.map((chat) =>
          chat.id === chatWithResponse.id ? chatWithResponse : chat
        )
      );
      setSelectedChat(chatWithResponse);
    }, 1000);
  };

  const handleSetOpenAIKey = async () => {
    const yes = await ask('Are you sure?', 'Tauri');
    const key = prompt('Enter your OpenAI API key:');

    if (key) {
      invoke('set_openai_api_key', { apiKey: key })
        .then(() => {
          setOpenAIKey(key);
          console.log('OpenAI API key set successfully');
        })
        .catch((error) =>
          console.error('Failed to set OpenAI API key:', error)
        );
    }
  };

const getProviderIcon = (provider: 'ollama' | 'openai') => {
  switch (provider) {
    case 'ollama':
      return <img src={ollamaIcon} alt="Ollama" className="w-5 h-5 mr-2" />;
    case 'openai':
      return <img src={openaiIcon} alt="OpenAI" className="w-5 h-5 mr-2" />;
    default:
      return null;
  }
};

  const disabled = [selectedChat?.provider === 'openai' && !openAIKey];

  return (
    <div className='container mx-auto flex h-screen p-4'>
      <div className='w-1/4 pr-4'>
        <h2 className='mb-4 text-2xl font-bold'>gram</h2>
{chats.map((chat) => (
          <Button
            key={chat.id}
            onClick={() => setSelectedChat(chat)}
            variant={selectedChat?.id === chat.id ? 'default' : 'outline'}
            className="w-full mb-2 flex items-center justify-start"
          >
            {getProviderIcon(chat.provider)}
            {chat.name}
          </Button>
        ))}
      </div>
      <div className='flex w-3/4 flex-col'>
        {selectedChat ? (
          <Card className='flex flex-grow flex-col'>
            <CardHeader>
              <CardTitle>{selectedChat.name}</CardTitle>
            </CardHeader>
            <CardContent className='flex-grow overflow-y-auto'>
              {selectedChat.messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <span
                    className={`inline-block rounded-lg p-2 ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}
                  >
                    {message.content}
                  </span>
                </div>
              ))}
            </CardContent>
            <CardFooter className='flex-col items-stretch'>
              {selectedChat?.provider === 'openai' && !openAIKey && (
                <Alert variant='destructive' className='mb-4'>
                  <AlertTitle className='flex items-center space-x-1'>
                    <TriangleAlert />
                    <p>API key not set</p>
                  </AlertTitle>
                  <AlertDescription>
                    Please set your OpenAI API key to use this chat.
                    <Button
                      onClick={handleSetOpenAIKey}
                      variant='outline'
                      className='ml-2'
                    >
                      Set API Key
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              <div className='flex'>
                <Input
                  value={input}
                  disabled={disabled.some(Boolean)}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='Type your message...'
                  className='mr-2 flex-grow'
                />
                <Button onClick={handleSendMessage}>Send</Button>
              </div>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <p className='text-center text-gray-500'>
                Select a chat to start messaging
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default App;
