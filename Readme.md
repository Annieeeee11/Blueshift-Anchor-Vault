# Blueshift Vault

This is Solana Anchor program, a simple vault that lets users deposit and withdraw SOL. I learned this from Blueshift, and I'm documenting what I learned along the way.
Blueshift -> https://learn.blueshift.gg/en/challenges/anchor-vault

## About

A vault program that allows users to:
- Deposit SOL into their personal vault
- Withdraw all their SOL back from the vault

The key thing I learned is that each user gets their own vault account, which is created using something called a Program Derived Address (PDA). This was a new concept for me!

## What I Learned About PDAs

At first, I thought all accounts needed a private key, but PDAs are different. They're addresses that are deterministically generated from seeds like a formula that always produces the same result.

In my program, the vault PDA is created using:
- The string "vault" 
- The user's public key

So each user gets a unique vault address that's tied to their wallet. The cool part is that the program can "sign" on behalf of this PDA using the seeds, which is how withdrawals work.

## Understanding the Account Structure

I learned that in Anchor, you define accounts using a struct with constraints. The `VaultAction` struct has three accounts:

1. **signer** - The user making the transaction (marked as `mut` because their balance changes)
2. **vault** - The PDA vault account (also `mut` because it holds the lamports)
3. **system_program** - Solana's built-in program for transfers

The `seeds` and `bump` constraints on the vault were tricky at first. I learned that:
- `seeds` tells Anchor how to derive the PDA address
- `bump` is automatically found and stored by Anchor (it's a number that makes the PDA valid)

## Deposit Function

Here's what I learned while implementing deposit:

1. **Check if vault is empty** - We use `require_eq!` to make sure the vault has zero lamports. This prevents someone from depositing into an already used vault.

2. **Check minimum amount** - Solana accounts need a minimum balance to be "rent-exempt" (so they don't get deleted). I learned to use `Rent::get()?.minimum_balance(0)` to get this value and ensure deposits are above it.

3. **Transfer the lamports** - This was my first time using a CPI (Cross-Program Invocation). I learned that `transfer()` is a helper function from Anchor that calls the System Program to move SOL. The `?` at the end handles errors.

```rust
pub fn deposit(ctx: Context<VaultAction>, amount: u64) -> Result<()> {
    require_eq!(ctx.accounts.vault.lamports(), 0, VaultError::VaultAlreadyExists);
    require_gt!(amount, Rent::get()?.minimum_balance(0), VaultError::InvalidAmount);
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.signer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}
```

## Withdraw Function

I had to learn about PDA signing:

1. **Get the vault balance** - We store it in a variable to use later
2. **Check minimum balance** - Make sure there's enough to withdraw (more than rent-exempt minimum)
3. **Create signer seeds** - learned that to sign on behalf of a PDA, I need to provide the seeds that created it, plus the bump. Anchor gives me `ctx.bumps.vault` which is the bump it found earlier.
4. **Transfer with PDA signing** - We use `CpiContext::new_with_signer` instead of `new` because the vault needs to sign the transfer. The seeds prove that we are allowed to move funds from this specific PDA.

```rust
pub fn withdraw(ctx: Context<VaultAction>) -> Result<()> {
    let vault_lamports = ctx.accounts.vault.lamports();
    let min_balance = Rent::get()?.minimum_balance(0);
    require_gt!(vault_lamports, min_balance, VaultError::InvalidAmount);
    require_gte!(vault_lamports, min_balance, VaultError::InsufficientFunds);
    let signer_key = ctx.accounts.signer.key();
    let signer_seeds = &[b"vault", signer_key.as_ref(), &[ctx.bumps.vault]];
    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.signer.to_account_info(),
            },
            &[&signer_seeds[..]]
        ),
        vault_lamports
    )?;
    Ok(())
}
```

## Error Handling

I learned about Anchor's error system. Created a custom error enum with three errors:

- `VaultAlreadyExists` - When trying to deposit into a non-empty vault
- `InvalidAmount` - When the amount is too small (below rent-exempt minimum)
- `InsufficientFunds` - When trying to withdraw but there's not enough 

The `#[error_code]` attribute tells Anchor to generate error codes automatically, and `#[msg()]` sets the error message.


## Running the Program

To build:
```bash
anchor build
```

To test:
```bash
anchor test
```
