
'use client';

// This page is no longer used. The functionality has been merged into /schedule.
// You can safely delete this file. For now, it will just show a message.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DeprecatedEventsPage() {

    return (
        <Card>
            <CardHeader>
                <CardTitle>Página Desativada</CardTitle>
            </CardHeader>
            <CardContent>
                <p>
                    A funcionalidade de gerenciamento de eventos foi centralizada na página <Link href="/schedule" className="text-primary underline">Agenda de Eventos</Link>.
                </p>
            </CardContent>
        </Card>
    )
}
