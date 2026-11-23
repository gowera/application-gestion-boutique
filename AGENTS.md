<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Initialize the desktop JSON database before opening the window, outside browser cache and installation files; this makes an empty database exist even before online sign-in.
- Desktop writes must fail visibly instead of falling back silently to browser storage; readiness is valid only after durable writes succeed.
- Encrypt desktop records with OS secure storage and replace them atomically with a previous-version backup; interrupted writes must not erase saved work.
- Package Electron from an explicit allowlist of current compiled assets and desktop runtime files; never embed environment files or repository metadata and never reuse stale compiled output.
- Treat desktop disk storage as authoritative and flush writes before atomic replacement; browser cache must not mask missing or failed durable records.
- Serialize synchronization across upload and download; launch preparation must use the same queue-first flow as reconnection to avoid concurrent refreshes.
- Cache shop logo image bytes alongside local datasets so branding and PDF rendering remain available after browser cache deletion.
