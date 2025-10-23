import type {
  Address,
  TransactionSigner,
  Instruction,
  TransactionModifyingSigner,
} from '@solana/kit';
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  prependTransactionMessageInstruction,
  getBase64EncodedWireTransaction,
  fetchEncodedAccount,
  createSolanaRpc,
  compileTransaction,
} from '@solana/kit';

// import type { X402Config } from '../../../types/config';
import {
  fetchMint,
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstruction,
  getTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ADDRESS,
} from '@solana-program/token-2022';
import { TOKEN_PROGRAM_ADDRESS } from '@solana-program/token';
import {
  estimateComputeUnitLimitFactory,
  getSetComputeUnitLimitInstruction,
  setTransactionMessageComputeUnitPrice,
} from '@solana-program/compute-budget';
import { encodePayment } from './encode-payment';
import type { PaymentPayload, PaymentRequirements } from 'x402/types';

const rpc = createSolanaRpc(
  'https://mainnet.helius-rpc.com/?api-key=392489b6-e53c-48b4-9cb9-128b099bfab6'
);
/**
 * Creates and encodes a payment header for the given client and payment requirements.
 *
 * @param client - The signer instance used to create the payment header
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements containing scheme and network information
 * @param config - Optional configuration for X402 operations (e.g., custom RPC URLs)
 * @returns A promise that resolves to a base64 encoded payment header string
 */
export async function createPaymentHeader(
  signer: TransactionModifyingSigner,
  x402Version: number,
  paymentRequirements: PaymentRequirements
): Promise<string> {
  const paymentPayload = await createAndSignPayment(
    signer,
    x402Version,
    paymentRequirements
  );
  return encodePayment(paymentPayload);
}

/**
 * Creates and signs a payment for the given client and payment requirements.
 *
 * @param client - The signer instance used to create and sign the payment tx
 * @param x402Version - The version of the X402 protocol to use
 * @param paymentRequirements - The payment requirements
 * @param config - Optional configuration for X402 operations (e.g., custom RPC URLs)
 * @returns A promise that resolves to a payment payload containing a base64 encoded solana token transfer tx
 */
export async function createAndSignPayment(
  signer: TransactionModifyingSigner,
  x402Version: number,
  paymentRequirements: PaymentRequirements
): Promise<PaymentPayload> {
  console.log(signer);
  const transactionMessage = await createTransferTransactionMessage(
    signer,
    paymentRequirements
  );

  console.log(transactionMessage);

  // Explicitly sign with the wallet signer - this will trigger the wallet popup
  const compiledTransaction = compileTransaction(transactionMessage);
  const [signedTransaction] = await signer.modifyAndSignTransactions([
    {
      messageBytes: compiledTransaction.messageBytes,
      signatures: compiledTransaction.signatures,
    },
  ]);

  console.log(signedTransaction);

  const base64EncodedWireTransaction =
    getBase64EncodedWireTransaction(signedTransaction);

  // return payment payload
  return {
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    x402Version: x402Version,
    payload: {
      transaction: base64EncodedWireTransaction,
    },
  } as PaymentPayload;
}

/**
 * Creates a transfer transaction message for the given client and payment requirements.
 *
 * @param client - The signer instance used to create the transfer transaction message
 * @param paymentRequirements - The payment requirements
 * @param config - Optional configuration for X402 operations (e.g., custom RPC URLs)
 * @returns A promise that resolves to the transaction message with the transfer instruction
 */
async function createTransferTransactionMessage(
  signer: TransactionModifyingSigner,
  paymentRequirements: PaymentRequirements
) {
  // create the transfer instruction
  const transferInstructions = await createAtaAndTransferInstructions(
    signer,
    paymentRequirements
  );

  // create tx to simulate
  const feePayer = paymentRequirements.extra?.feePayer as Address;
  const txToSimulate = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageComputeUnitPrice(1, tx), // 1 microlamport priority fee
    tx => setTransactionMessageFeePayer(feePayer, tx),
    tx => appendTransactionMessageInstructions(transferInstructions, tx)
  );

  console.log();

  // estimate the compute budget limit (gas limit)
  const estimateComputeUnitLimit = estimateComputeUnitLimitFactory({ rpc });
  const estimatedUnits = await estimateComputeUnitLimit(txToSimulate).catch(
    e => {
      console.log(e.cause);
      throw e;
    }
  );

  console.log(estimatedUnits);

  // finalize the transaction message by adding the compute budget limit and blockhash
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const tx = pipe(
    txToSimulate,
    tx =>
      prependTransactionMessageInstruction(
        getSetComputeUnitLimitInstruction({ units: estimatedUnits }),
        tx
      ),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx)
  );

  return tx;
}

/**
 * Creates a transfer instruction for the given client and payment requirements.
 * This function will determine which transfer instruction to create
 * based on the program that created the token (token-2022 or token).
 *
 * @param client - The signer instance used to create the transfer instruction
 * @param paymentRequirements - The payment requirements
 * @param config - Optional configuration for X402 operations (e.g., custom RPC URLs)
 * @returns A promise that resolves to the create ATA (if needed) and transfer instruction
 */
async function createAtaAndTransferInstructions(
  signer: TransactionModifyingSigner,
  paymentRequirements: PaymentRequirements
): Promise<Instruction[]> {
  const { asset } = paymentRequirements;

  const tokenMint = await fetchMint(rpc, asset as Address);
  const tokenProgramAddress = tokenMint.programAddress;

  // validate that the asset was created by a known token program
  if (
    tokenProgramAddress.toString() !== TOKEN_PROGRAM_ADDRESS.toString() &&
    tokenProgramAddress.toString() !== TOKEN_2022_PROGRAM_ADDRESS.toString()
  ) {
    throw new Error('Asset was not created by a known token program');
  }

  const instructions: Instruction[] = [];

  // create the ATA (if needed)
  const createAtaIx = await createAtaInstructionOrUndefined(
    paymentRequirements,
    tokenProgramAddress
  );
  if (createAtaIx) {
    instructions.push(createAtaIx);
  }

  // create the transfer instruction
  const transferIx = await createTransferInstruction(
    signer,
    paymentRequirements,
    tokenMint.data.decimals,
    tokenProgramAddress
  );
  instructions.push(transferIx);

  return instructions;
}

/**
 * Returns a create ATA instruction for the payTo address if the ATA account does not exist.
 * The create ATA instruction will be paid for by the feePayer in the payment requirements.
 *
 * This function will work for both spl-token and token-2022.
 *
 * Returns undefined if the ATA account already exists.
 *
 * @param paymentRequirements - The payment requirements
 * @param tokenProgramAddress - The address of the token program
 * @param config - Optional configuration for X402 operations (e.g., custom RPC URLs)
 * @returns A promise that resolves to the create ATA instruction or undefined if the ATA account already exists
 * @throws an error if the feePayer is not provided in the payment requirements
 */
async function createAtaInstructionOrUndefined(
  paymentRequirements: PaymentRequirements,
  tokenProgramAddress: Address
): Promise<Instruction | undefined> {
  const { asset, payTo, extra } = paymentRequirements;
  const feePayer = extra?.feePayer as Address;

  // feePayer is required
  if (!feePayer) {
    throw new Error(
      'feePayer is required in paymentRequirements.extra in order to set the ' +
        'facilitator as the fee payer for the create associated token account instruction'
    );
  }

  // derive the ATA of the payTo address
  const [destinationATAAddress] = await findAssociatedTokenPda({
    mint: asset as Address,
    owner: payTo as Address,
    tokenProgram: tokenProgramAddress,
  });

  // check if the ATA exists
  const maybeAccount = await fetchEncodedAccount(rpc, destinationATAAddress);

  // if the ATA does not exist, return an instruction to create it
  if (!maybeAccount.exists) {
    return getCreateAssociatedTokenInstruction({
      payer: paymentRequirements.extra?.feePayer as TransactionSigner,
      ata: destinationATAAddress,
      owner: payTo as Address,
      mint: asset as Address,
      tokenProgram: tokenProgramAddress,
    });
  }

  // if the ATA exists, return undefined
  return undefined;
}

/**
 * Creates a transfer instruction for the given client and payment requirements.
 * This function will create a transfer instruction for a token created by either
 * the token program or the token-2022 program.
 *
 * @param client - The signer instance who's tokens will be debited from
 * @param paymentRequirements - The payment requirements
 * @param decimals - The decimals of the token
 * @param tokenProgramAddress - The address of the token program
 * @returns A promise that resolves to the transfer instruction
 */
async function createTransferInstruction(
  signer: TransactionModifyingSigner,
  paymentRequirements: PaymentRequirements,
  decimals: number,
  tokenProgramAddress: Address
): Promise<Instruction> {
  const { asset, maxAmountRequired: amount, payTo } = paymentRequirements;

  const [sourceATA] = await findAssociatedTokenPda({
    mint: asset as Address,
    owner: signer.address,
    tokenProgram: tokenProgramAddress,
  });

  const [destinationATA] = await findAssociatedTokenPda({
    mint: asset as Address,
    owner: payTo as Address,
    tokenProgram: tokenProgramAddress,
  });

  return getTransferCheckedInstruction(
    {
      source: sourceATA,
      mint: asset as Address,
      destination: destinationATA,
      authority: signer,
      amount: BigInt(amount),
      decimals: decimals,
    },
    { programAddress: tokenProgramAddress }
  );
}
