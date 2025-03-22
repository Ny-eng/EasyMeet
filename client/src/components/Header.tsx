import { Link } from "wouter";

interface HeaderProps {
  minimal?: boolean;
}

export function Header({ minimal = false }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 py-6 px-4 border-b bg-background z-50">
      <div className="container mx-auto">
        <Link href="/" className="block text-center">
          <h1 className="text-2xl font-bold tracking-[0.05em] text-primary">
            EasyMeet
          </h1>
          {!minimal && (
            <p className="text-sm text-muted-foreground mt-1">
              No logins, no hassle. Just pick a time! 🥳
            </p>
          )}
        </Link>
      </div>
    </header>
  );
}