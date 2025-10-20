'use client';

import type { ChatStatus } from 'ai';
import { Loader2Icon, SendIcon, SquareIcon, XIcon } from 'lucide-react';
import {
  Children,
  type ComponentProps,
  type HTMLAttributes,
  type KeyboardEventHandler,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const PromptInput = ({
  className,
  ...props
}: HTMLAttributes<HTMLFormElement>) => (
  <form
    className={cn(
      'w-full divide-y overflow-hidden rounded-xl border bg-background shadow-sm transition-all duration-200',
      'focus-within:ring-ring focus-within:ring-2',
      className
    )}
    {...props}
  />
);

const PromptInputTextarea = ({
  onChange,
  className,
  placeholder = 'What is the most interesting thing you can do with x402?',
  ...props
}: ComponentProps<typeof Textarea> & {
  minHeight?: number;
  maxHeight?: number;
}) => {
  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = e => {
    if (e.key === 'Enter') {
      // Don't submit if IME composition is in progress
      if (e.nativeEvent.isComposing) {
        return;
      }

      if (e.shiftKey) {
        // Allow newline
        return;
      }

      // Submit on Enter (without Shift)
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <Textarea
      className={cn(
        'w-full resize-none rounded-none border-none p-3 pb-0 shadow-none outline-none ring-0',
        'field-sizing-content max-h-[6lh] bg-transparent dark:bg-transparent min-h-[2lh]',
        'focus-visible:ring-0',
        className
      )}
      name="message"
      onChange={e => {
        onChange?.(e);
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
};

const PromptInputToolbar = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center justify-between p-1 md:p-2', className)}
    {...props}
  />
);

const PromptInputTools = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center gap-1', className)} {...props} />
);

const PromptInputButton = ({
  variant = 'ghost',
  className,
  size,
  ...props
}: ComponentProps<typeof Button>) => {
  const newSize =
    size ??
    (props.children
      ? Children.count(props.children) > 1
        ? 'default'
        : 'icon'
      : 'default');

  return (
    <Button
      className={cn(
        'shrink-0 gap-1.5',
        variant === 'ghost' && 'text-muted-foreground',
        newSize === 'default' && 'px-3',
        className
      )}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    />
  );
};

const PromptInputSubmit = ({
  className,
  variant = 'default',
  size = 'icon',
  status,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  status?: ChatStatus;
}) => {
  let Icon = <SendIcon className="size-4" />;

  if (status === 'submitted') {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === 'streaming') {
    Icon = <SquareIcon className="size-4" />;
  } else if (status === 'error') {
    Icon = <XIcon className="size-4" />;
  }

  return (
    <Button
      className={cn('gap-1.5 rounded-lg', className)}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
};

const PromptInputModelSelect = (props: ComponentProps<typeof Select>) => (
  <Select {...props} />
);

const PromptInputModelSelectTrigger = ({
  className,
  ...props
}: ComponentProps<typeof SelectTrigger>) => (
  <SelectTrigger
    className={cn(
      'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
      'h-8! rounded-md px-3 text-xs md:text-xs font-medium',
      className
    )}
    {...props}
  />
);

const PromptInputModelSelectContent = ({
  className,
  ...props
}: ComponentProps<typeof SelectContent>) => (
  <SelectContent className={cn(className)} {...props} />
);

const PromptInputModelSelectItem = ({
  className,
  ...props
}: ComponentProps<typeof SelectItem>) => (
  <SelectItem className={cn(className)} {...props} />
);

const PromptInputModelSelectValue = ({
  className,
  ...props
}: ComponentProps<typeof SelectValue>) => (
  <SelectValue className={cn(className)} {...props} />
);

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
};
