import { sendLink, verifyCode } from "./actions";

const input = "w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const btn = "rounded bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; next?: string; error?: string }> }) {
  const { sent, next = "/", error } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {error === "config" && <p className="text-sm text-red-600">Authentication is not configured.</p>}
      {error === "denied" && <p className="text-sm text-red-600">That account is not allowed.</p>}
      {error === "link" && <p className="text-sm text-red-600">Link invalid or expired. Request a new one (open it in the same browser).</p>}
      {error === "code" && <p className="text-sm text-red-600">Invalid or expired code.</p>}
      {!sent ? (
        <form action={sendLink} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <input className={input} type="email" name="email" placeholder="you@example.com" required autoFocus />
          <button className={btn} type="submit">Email me a sign-in link</button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">If that address is allowed, a sign-in link and code were sent. Open the link in this browser, or enter the code:</p>
          <form action={verifyCode} className="space-y-3">
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="email" value={sent} />
            <input className={input} name="token" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required />
            <button className={btn} type="submit">Verify code</button>
          </form>
        </div>
      )}
    </div>
  );
}
