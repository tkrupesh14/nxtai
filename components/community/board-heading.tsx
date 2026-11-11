import type { Board } from "@/lib/community/boards"

/** Top of a board page: back to all boards, icon, title and what it's for. */
export function BoardHeading({ board, boardsHref, asLink }: { board: Board; boardsHref: string; /** link the title to the board (on threads) */ asLink?: string }) {
  return (
    <header className="grid gap-1">
      <a href={boardsHref} className="text-xs text-muted-foreground hover:text-foreground">
        ← All boards
      </a>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <span aria-hidden>{board.icon}</span>
        {asLink ? (
          <a href={asLink} className="hover:text-primary">
            {board.title}
          </a>
        ) : (
          board.title
        )}
      </h1>
      <p className="text-sm text-muted-foreground">
        {board.kind === "course" ? `Questions and ideas about ${board.description.toLowerCase()}.` : board.description}
      </p>
    </header>
  )
}
