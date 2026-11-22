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
