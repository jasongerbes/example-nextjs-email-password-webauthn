# Email and password example with 2FA and WebAuthn in Next.js

Built with SQLite.

- Password checks with HaveIBeenPwned
- Sign in with passkeys
- Email verification
- 2FA with TOTP
- 2FA recovery codes
- 2FA with passkeys and security keys
- Password reset with 2FA
- Login throttling and rate limiting

Emails are just logged to the console. Rate limiting is implemented using JavaScript `Map`.

## Initialize project

Create `sqlite.db` and run `setup.sql`.

```bash
sqlite3 sqlite.db
.read setup.sql
```

Create a `.env` file. Generate a 128 bit (16 byte) string, base64 encode it, and set it as `ENCRYPTION_KEY`.

```bash
ENCRYPTION_KEY="L9pmqRJnO1ZJSQ2svbHuBA=="
```

> You can use OpenSSL to quickly generate a secure key.
>
> ```bash
> openssl rand -base64 16
> ```

Install dependencies and run the application:

```bash
pnpm i
pnpm dev
```

## Notes

- We do not consider user enumeration to be a real vulnerability so please don't open issues on it. If you really need to prevent it, just don't use emails.
- This example does not handle unexpected errors gracefully.
- There are some major code duplications (specifically for 2FA) to keep the codebase simple.
- TODO: Passkeys will only work when hosted on `localhost:3000`. Update the host and origin values before deploying.
- TODO: You may need to rewrite some queries and use transactions to avoid race conditions when using MySQL, Postgres, etc.
- TODO: This project relies on the `X-Forwarded-For` header for getting the client's IP address.
- TODO: Logging should be implemented.
