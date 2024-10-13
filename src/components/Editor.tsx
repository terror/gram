import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { ChangeEvent, KeyboardEvent, useEffect, useRef } from 'react';

export const Editor: React.FC<{
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  value: string;
}> = ({ disabled, onChange, onSend, value }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className='relative'>
      <textarea
        ref={textareaRef}
        disabled={disabled}
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          onChange(e.target.value)
        }
        onKeyDown={handleKeyDown}
        autoFocus={true}
        autoComplete='off'
        autoCorrect='off'
        className='w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50'
        placeholder='Type your message...'
        rows={1}
      />
      {value.trim() !== '' && (
        <Button
          onClick={onSend}
          className='hover:none absolute right-1 hover:border-inherit hover:bg-inherit hover:text-inherit hover:no-underline hover:shadow-none'
          size='sm'
          variant='ghost'
        >
          <Send size={18} />
        </Button>
      )}
    </div>
  );
};
