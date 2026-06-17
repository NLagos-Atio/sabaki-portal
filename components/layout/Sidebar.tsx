"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { FileText, Package, Settings, Users, LogOut, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
  { href: "/usuarios", label: "Usuarios", icon: Users },
];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen bg-[#1B2A4A] flex flex-col text-white">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sabaki-logo.png" alt="Sabaki" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">Sabaki</p>
            <p className="text-xs text-white/60 leading-tight">Technologies</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          if (href === "/usuarios" && role !== "admin") return null;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active ? "bg-[#2E86AB] text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
