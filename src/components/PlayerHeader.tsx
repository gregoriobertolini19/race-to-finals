import Image from "next/image";
import Link from "next/link";

interface Props {
  tournamentName?: string;
}

export default function PlayerHeader({ tournamentName }: Props) {
  return (
    <header className="border-b border-dark-elevated bg-dark text-on-dark">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-border-accent">
            <Image
              src="/borgo-bagnolo-logo.png"
              alt="Logo Sporting Borgo Bagnolo"
              width={40}
              height={40}
              className="h-full w-full object-contain p-0.5"
              priority
            />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-on-dark-muted">
              Sporting Borgo Bagnolo
            </p>
            <h1 className="text-lg font-bold leading-tight text-on-dark">
              Race to Finals
            </h1>
            {tournamentName && (
              <p className="mt-0.5 text-sm text-on-dark-muted">{tournamentName}</p>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
