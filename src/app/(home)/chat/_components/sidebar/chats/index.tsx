'use client';

import { useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';

import { ChatItem } from './item';

import { api } from '@/trpc/client';

export const NavChats = () => {
  const router = useRouter();
  const pathname = usePathname();

  const { setOpenMobile, state } = useSidebar();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [chats, { isLoading }] =
    api.chats.getUserChats.useSuspenseQuery(undefined);

  const utils = api.useUtils();
  const deleteChat = api.chats.deleteChat.useMutation();

  const handleDelete = () => {
    if (deleteId) {
      deleteChat.mutate(
        { chatId: deleteId },
        {
          onSuccess: () => {
            setShowDeleteDialog(false);
            void utils.chats.getUserChats.invalidate();
            void router.push('/chat');
          },
        }
      );
    }
  };

  if (isLoading || !chats || state === 'collapsed') return null;

  if (chats.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <SidebarMenu>
          <div className="text-muted-foreground px-2 py-2 text-xs">
            No chats yet.
          </div>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <SidebarMenu>
          {chats.map(chat => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isActive={pathname.endsWith(chat.id)}
              onDelete={id => {
                setDeleteId(id);
                setShowDeleteDialog(true);
              }}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </SidebarMenu>
      </SidebarGroup>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
