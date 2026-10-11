import { BN } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Grain, WarrantStatus } from "@/lib/arva";
import {
  configPda,
  mintAuthorityPda,
  RealArvaClient,
  warrantMintPda,
  warrantPda,
} from "@/lib/arva-real";

/**
 * Devnet starter kit: lets anyone walk the full cycle with their own wallet.
 * A service wallet (the demo certifier + test-USDC mint authority, read from
 * ARVA_SERVICE_SECRET, never committed) tops the caller up in ONE transaction:
 * a little SOL for fees, test USDC to cover interest, and a 100 t demo warrant.
 * Devnet only: the funds have no value. Each part is skipped when not needed.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

const RPC =
  process.env.ARVA_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const SOL_MIN = 0.02;
const SOL_GRANT = 0.05;
const USDC_MIN = 500;
const USDC_GRANT = 1_000;
const DEMO_TONS = 100;
const MAX_WARRANTS_PER_WALLET = 5;
const COOLDOWN_MS = 20_000;

const recent = new Map<string, number>();

function fail(error: string, status: number) {
  return Response.json({ ok: false, error }, { status });
}

function loadService(): Keypair | null {
  const raw = process.env.ARVA_SERVICE_SECRET;
  if (!raw) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const service = loadService();
  if (!service) return fail("not_configured", 503);

  let user: PublicKey;
  try {
    const { wallet } = (await req.json()) as { wallet?: string };
    user = new PublicKey(String(wallet));
    if (!PublicKey.isOnCurve(user.toBytes())) throw new Error("off-curve");
  } catch {
    return fail("bad_wallet", 400);
  }

  const key = user.toBase58();
  const last = recent.get(key) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) return fail("cooldown", 429);
  recent.set(key, Date.now());

  try {
    const connection = new Connection(RPC, "confirmed");
    const client = new RealArvaClient(connection);
    const [config, balances, positions] = await Promise.all([
      client.getConfig(),
      client.getWalletBalances(key),
      client.getMyWarrants(key),
    ]);
    if (config.certifier !== service.publicKey.toBase58()) return fail("not_configured", 503);

    const mine = positions.filter((p) => p.warrant.owner === key);
    const active = mine.some(
      (p) => p.warrant.status === WarrantStatus.Issued || p.warrant.status === WarrantStatus.InCustody,
    );
    const needSol = balances.sol < SOL_MIN;
    const needUsdc = balances.usdc < USDC_MIN;
    const needWarrant = !active && mine.length < MAX_WARRANTS_PER_WALLET;
    if (!needSol && !needUsdc && !needWarrant) {
      return Response.json({ ok: true, signature: null, granted: { sol: 0, usdc: 0, warrant: null } });
    }

    const tx = new Transaction();
    if (needSol) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: service.publicKey,
          toPubkey: user,
          lamports: Math.round(SOL_GRANT * LAMPORTS_PER_SOL),
        }),
      );
    }
    if (needUsdc) {
      const mint = new PublicKey(config.usdcMint);
      const ata = getAssociatedTokenAddressSync(mint, user);
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(service.publicKey, ata, user, mint),
        createMintToInstruction(mint, ata, service.publicKey, BigInt(USDC_GRANT * 1_000_000)),
      );
    }
    let siloId: string | null = null;
    if (needWarrant) {
      siloId = `DEMO-${Date.now().toString(36).toUpperCase()}`;
      const warrant = warrantPda(siloId);
      const mint = warrantMintPda(warrant);
      tx.add(
        await client.program.methods
          .registerWarrant(siloId, Grain.Soybean, new BN(DEMO_TONS), user)
          .accountsPartial({
            certifier: service.publicKey,
            config: configPda(),
            producer: user,
            warrant,
            mintAuthority: mintAuthorityPda(warrant),
            mint,
            producerTokenAccount: getAssociatedTokenAddressSync(mint, user),
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction(),
      );
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = service.publicKey;
    tx.recentBlockhash = blockhash;
    tx.sign(service);
    const signature = await connection.sendRawTransaction(tx.serialize());
    const res = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    if (res.value.err) throw new Error(JSON.stringify(res.value.err));

    return Response.json({
      ok: true,
      signature,
      granted: { sol: needSol ? SOL_GRANT : 0, usdc: needUsdc ? USDC_GRANT : 0, warrant: siloId },
    });
  } catch (e) {
    recent.delete(key);
    console.error("starter kit failed", e);
    return fail("chain_error", 502);
  }
}
