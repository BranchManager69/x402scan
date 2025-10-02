'use client';

import { Calendar, DollarSign, Hash, Server, User } from 'lucide-react';

import Link from 'next/link';

import { Skeleton } from '@/components/ui/skeleton';

import { HeaderCell } from '@/components/ui/data-table/header-cell';

import { Address } from '@/components/ui/address';

import { Seller, SellerSkeleton } from '../../../_components/seller';

import { formatCompactAgo } from '@/lib/utils';
import { formatTokenAmount } from '@/lib/token';

import type { ExtendedColumnDef } from '@/components/ui/data-table';
import type { RouterOutputs } from '@/trpc/client';
import { Facilitator } from '@/app/_components/facilitator';

type ColumnType = RouterOutputs['transfers']['list']['items'][number];

export const columns: ExtendedColumnDef<ColumnType>[] = [
  {
    accessorKey: 'recipient',
    header: () => (
      <HeaderCell Icon={Server} label="Server" className="justify-start" />
    ),
    cell: ({ row }) => (
      <Link href={`/recipient/${row.original.recipient}`}>
        <Seller
          address={row.original.recipient}
          addressClassName="text-xs font-normal"
          disableCopy
        />
      </Link>
    ),
    size: 200,
    loading: () => <SellerSkeleton />,
  },
  {
    accessorKey: 'sender',
    header: () => (
      <HeaderCell Icon={User} label="Sender" className="justify-center" />
    ),
    cell: ({ row }) => (
      <Address
        address={row.original.sender}
        className="text-xs mx-auto block text-center"
      />
    ),
    size: 100, // Fixed width for transaction count
    loading: () => <Skeleton className="h-4 w-16 mx-auto" />,
  },
  {
    accessorKey: 'facilitator',
    header: () => <HeaderCell Icon={Server} label="Facilitator" />,
    cell: ({ row }) => (
      <Facilitator
        address={row.original.transaction_from}
        className="mx-auto justify-center"
      />
    ),
    size: 100,
    loading: () => <Skeleton className="h-4 w-16 mx-auto" />,
  },
  {
    accessorKey: 'transaction_hash',
    header: () => <HeaderCell Icon={Hash} label="Hash" />,
    cell: ({ row }) => (
      <Link href={`/transaction/${row.original.transaction_hash}`}>
        <Address
          address={row.original.transaction_hash}
          className="text-xs block text-center"
          disableCopy
          hideTooltip
        />
      </Link>
    ),
    size: 100,
    loading: () => <Skeleton className="h-4 w-16 mx-auto" />,
  },
  {
    accessorKey: 'block_timestamp',
    header: () => <HeaderCell Icon={Calendar} label="Timestamp" />,
    cell: ({ row }) => (
      <div className="text-center font-mono text-xs">
        {formatCompactAgo(row.original.block_timestamp)}
      </div>
    ),
    size: 50,
    loading: () => <Skeleton className="h-4 w-16 mx-auto" />,
  },
  {
    accessorKey: 'amount',
    header: () => (
      <HeaderCell Icon={DollarSign} label="Amount" className="justify-end" />
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono text-xs">
        {formatTokenAmount(row.original.amount)}
      </div>
    ),
    size: 50, // Fixed width for buyers count
    loading: () => <Skeleton className="h-4 w-16 ml-auto" />,
  },
];
