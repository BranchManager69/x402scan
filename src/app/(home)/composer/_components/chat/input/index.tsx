'use client';

import { useSession } from 'next-auth/react';

import { Skeleton } from '@/components/ui/skeleton';

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';

import { ModelSelect } from './model-select';
import { ResourcesSelect } from './resources-select';

import { api } from '@/trpc/client';

import type { ChatStatus } from 'ai';
import type { SelectedResource } from '../../../_types/chat-config';

interface Props {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  model: string;
  setModel: (value: string) => void;
  selectedResources: SelectedResource[];
  onSelectResource: (resource: SelectedResource) => void;
  status: ChatStatus;
}

export const PromptInputSection: React.FC<Props> = ({
  input,
  setInput,
  handleSubmit,
  model,
  setModel,
  selectedResources,
  onSelectResource,
}) => {
  const { data: session } = useSession();

  const { data: usdcBalance } = api.user.serverWallet.usdcBaseBalance.useQuery(
    undefined,
    {
      enabled: !!session,
    }
  );

  const hasBalance = usdcBalance && usdcBalance > 0;

  return (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setInput(e.target.value)
        }
        value={input}
        disabled={!hasBalance}
      />
      <PromptInputToolbar>
        <PromptInputTools>
          <ModelSelect model={model} setModel={setModel} />
          <ResourcesSelect
            resources={selectedResources}
            onSelectResource={onSelectResource}
          />
        </PromptInputTools>
        <PromptInputSubmit
          disabled={!input || !hasBalance}
          className="size-8 md:size-8"
        />
      </PromptInputToolbar>
    </PromptInput>
  );
};

export const LoadingPromptInputSection = () => {
  return (
    <PromptInput>
      <PromptInputTextarea disabled />
      <PromptInputToolbar>
        <PromptInputTools>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </PromptInputTools>
        <Skeleton className="size-8" />
      </PromptInputToolbar>
    </PromptInput>
  );
};
