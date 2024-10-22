import ollamaIcon from '@/assets/ollama-icon.png';
import openaiIcon from '@/assets/openai-icon.png';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { core } from '@tauri-apps/api';
import 'highlight.js/styles/base16/seti-ui.css';
import 'katex/dist/katex.min.css';
import { TriangleAlert } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import { Textarea } from './components/textarea';
import { Chat, Message, Provider, Role } from './lib/types';
import { assertNever } from './lib/utils';

const OLLAMA_MODELS = ['llama3', 'codellama', 'mistral'];
const OPENAI_MODELS = ['gpt-3.5-turbo', 'gpt-4o'];

const EXAMPLE_CHATS: Chat[] = [
  {
    id: '1',
    name: 'Example (Ollama)',
    messages: [],
    provider: Provider.Ollama,
    model: 'llama3',
  },
  {
    id: '2',
    name: 'Example (OpenAI)',
    messages: [],
    provider: Provider.OpenAI,
    model: 'gpt-4o',
  },
];

const App: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>(EXAMPLE_CHATS);
  const [selectedChat, setSelectedChat] = useState<Chat>(chats[0]);
  const [input, setInput] = useState('');
  const [openAIKey, setOpenAIKey] = useState<string | null>(null);

  useEffect(() => {
    core
      .invoke<{ openai_api_key: string | null }>('get_config')
      .then((config) => setOpenAIKey(config.openai_api_key))
      .catch((error) => console.error('Failed to load config:', error));
  }, []);

  const handleSendMessage = async () => {
    if (!selectedChat || !input.trim()) return;

    const newMessage: Message = { role: Role.User, content: input };

    const updatedChat = {
      ...selectedChat,
      messages: [...selectedChat.messages, newMessage],
    };

    setChats(
      chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
    );

    setSelectedChat(updatedChat);
    setInput('');

    const assistantMessage: Message = {
      role: Role.Assistant,
      content: '',
    };

    let chatWithResponse = {
      ...updatedChat,
      messages: [...updatedChat.messages, assistantMessage],
    };

    setChats(
      chats.map((chat) =>
        chat.id === chatWithResponse.id ? chatWithResponse : chat
      )
    );

    setSelectedChat(chatWithResponse);

    try {
      if (selectedChat.provider === Provider.Ollama) {
        const ollamaMessages = selectedChat.messages.map((message) => ({
          role: message.role,
          content: message.content,
        }));

        ollamaMessages.push({
          role: Role.User,
          content: input,
        });

        const response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedChat.model,
            messages: ollamaMessages,
            stream: true,
          }),
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const parsedChunk = JSON.parse(line);

              if (!parsedChunk.done && parsedChunk.message?.content) {
                setSelectedChat((prevChat) => {
                  const newMessages = prevChat.messages.map((msg, index) =>
                    index === prevChat.messages.length - 1
                      ? {
                          ...msg,
                          content: msg.content + parsedChunk.message.content,
                        }
                      : msg
                  );

                  return {
                    ...prevChat,
                    messages: newMessages,
                  };
                });
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      } else if (selectedChat.provider === Provider.OpenAI) {
        const response = `This is a response from ${selectedChat.provider} using ${selectedChat.model} model.`;

        setSelectedChat((prevChat) => ({
          ...prevChat,
          messages: prevChat.messages.map((msg, index) =>
            index === prevChat.messages.length - 1
              ? { ...msg, content: response }
              : msg
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to get response:', error);
    }
  };

  const handleSetOpenAIKey = async () => {
    const key = prompt('Enter your OpenAI API key:');

    if (key) {
      core
        .invoke('set_openai_api_key', { apiKey: key })
        .then(() => {
          setOpenAIKey(key);
          console.log('OpenAI API key set successfully');
        })
        .catch((error) =>
          console.error('Failed to set OpenAI API key:', error)
        );
    }
  };

  const getProviderIcon = (provider: Provider) => {
    switch (provider) {
      case Provider.Ollama:
        return (
          <img
            src={ollamaIcon}
            alt='Ollama'
            className='mr-2 h-5 w-5 rounded-sm'
          />
        );
      case Provider.OpenAI:
        return (
          <img
            src={openaiIcon}
            alt='OpenAI'
            className='mr-2 h-5 w-5 rounded-sm'
          />
        );
      default:
        assertNever(provider);
    }
  };

  const handleModelChange = (value: string) => {
    const updatedChat = { ...selectedChat, model: value };

    setSelectedChat(updatedChat);

    setChats(
      chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat))
    );
  };

  const disabled = [selectedChat?.provider === Provider.OpenAI && !openAIKey];

  return (
    <div className='container mx-auto flex h-screen p-4'>
      <div className='w-1/4 pr-4'>
        {chats.map((chat) => (
          <Button
            key={chat.id}
            onClick={() => setSelectedChat(chat)}
            variant={selectedChat?.id === chat.id ? 'default' : 'outline'}
            className='mb-2 flex w-full items-center justify-start'
          >
            {getProviderIcon(chat.provider)}
            {chat.name}
          </Button>
        ))}
      </div>
      <div className='flex w-3/4 flex-col'>
        {selectedChat ? (
          <Card className='flex flex-grow flex-col'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div className='flex flex-col space-y-2'>
                <CardTitle className='text-md'>{selectedChat.name}</CardTitle>
                <Select
                  onValueChange={handleModelChange}
                  value={selectedChat.model}
                >
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Select a model' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedChat.provider === Provider.OpenAI
                      ? OPENAI_MODELS.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))
                      : OLLAMA_MODELS.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className='flex-grow overflow-y-auto'>
              {selectedChat.messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${message.role === Role.User ? 'text-right' : 'text-left'}`}
                >
                  <span
                    className={`inline-block rounded-lg p-2 ${
                      message.role === Role.User ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    {message.role === Role.User ? (
                      message.content
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeHighlight, rehypeKatex]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                  </span>
                </div>
              ))}
            </CardContent>
            <CardFooter className='flex-col items-stretch'>
              {selectedChat?.provider === Provider.OpenAI && !openAIKey && (
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
              <Textarea
                disabled={disabled.some(Boolean)}
                onChange={setInput}
                onSend={handleSendMessage}
                value={input}
              />
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
