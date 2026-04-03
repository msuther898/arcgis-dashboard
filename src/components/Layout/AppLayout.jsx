export function AppLayout({ children, sidebar, header }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {header && (
        <header className="bg-white border-b border-gray-200">
          {header}
        </header>
      )}
      <div className="flex">
        {sidebar && (
          <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-120px)]">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
