"use client";

import { useState } from "react";
import type { KeyView } from "@/api-types";
import { timeAgo } from "@/lib/format";
import { ProviderIcon, SourceLabel, StatusPill } from "@/components/ui/Presentational";
import { KeyDrawer } from "./KeyDrawer";

const HEADERS = ["Key", "Label", "Masked", "Source", "Status", "Last seen"];

export function KeyTable({ initialKeys }: { initialKeys: KeyView[] }) {
  const [keys, setKeys] = useState<KeyView[]>(initialKeys);
  const [selected, setSelected] = useState<KeyView | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Keys
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {keys.length} found
        </span>
      </div>

      {keys.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">
          No keys found yet. Run a scan from onboarding.
        </div>
      ) : (
        <>
          <div className="kl-scroll hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-500">
                  {HEADERS.map((h) => (
                    <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr
                    key={k.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open details for ${k.providerName}`}
                    onClick={() => setSelected(k)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(k);
                      }
                    }}
                    className="group cursor-pointer border-b border-slate-100 text-left transition-colors duration-150 last:border-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ProviderIcon provider={k.provider} size="sm" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {k.providerName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {k.label ?? "–"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-300">
                      {k.masked}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      <SourceLabel source={k.sourceType} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={k.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {k.lastSeenAt ? timeAgo(k.lastSeenAt) : "never"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 transition-transform duration-150 group-hover:translate-x-0.5 dark:text-slate-600">
                      →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60 lg:hidden">
            {keys.map((k) => (
              <li key={k.id}>
                <button
                  onClick={() => setSelected(k)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <ProviderIcon provider={k.provider} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {k.providerName}
                    </span>
                    <span className="block truncate font-mono text-xs text-indigo-600 dark:text-indigo-300">
                      {k.masked}
                    </span>
                  </span>
                  <StatusPill status={k.status} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selected && (
        <KeyDrawer
          initial={selected}
          onClose={() => setSelected(null)}
          onKeysChanged={setKeys}
        />
      )}
    </section>
  );
}
