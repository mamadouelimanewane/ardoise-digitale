"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, BookOpen, Package, BarChart3, Store } from "lucide-react";
import { ArdoiseProvider, useArdoise } from "./context/ArdoiseContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <ArdoiseProvider>
            <AppShell>{children}</AppShell>
        </ArdoiseProvider>
    );
}

function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="mobile-container">
            <main className="main-content">
                {children}
            </main>
            <Navigation />
        </div>
    );
}

function Navigation() {
    const pathname = usePathname();
    const { t } = useArdoise();

    const isActive = (path: string) => {
        if (path === "/") return pathname === "/";
        return pathname.startsWith(path);
    };

    return (
        <nav className="bottom-nav">
            <Link href="/" className={`nav-item ${isActive("/") ? "active" : ""}`}>
                <ShoppingBag size={21} />
                <span>{t("home")}</span>
            </Link>
            <Link href="/credits" className={`nav-item ${isActive("/credits") ? "active" : ""}`}>
                <BookOpen size={21} />
                <span>{t("credits")}</span>
            </Link>
            <Link href="/stock" className={`nav-item ${isActive("/stock") ? "active" : ""}`}>
                <Package size={21} />
                <span>{t("stock")}</span>
            </Link>
            <Link href="/rapports" className={`nav-item ${isActive("/rapports") ? "active" : ""}`}>
                <BarChart3 size={21} />
                <span>{t("reports")}</span>
            </Link>
            <Link href="/reglages" className={`nav-item ${isActive("/reglages") ? "active" : ""}`}>
                <Store size={21} />
                <span>{t("settings")}</span>
            </Link>
        </nav>
    );
}
