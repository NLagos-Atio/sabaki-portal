"use client";
import { useState } from "react";
import { CompanyProfileForm } from "./CompanyProfileForm";

type Profile = Parameters<typeof CompanyProfileForm>[0]["profile"];

export function AjustesClient({ profile1, profile2 }: { profile1: Profile; profile2: Profile }) {
  const [activeTab, setActiveTab] = useState<1 | 2>(1);

  const tabCls = (slot: 1 | 2) =>
    `px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
      activeTab === slot
        ? "bg-[#1B2A4A] text-white"
        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
    }`;

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button type="button" onClick={() => setActiveTab(1)} className={tabCls(1)}>
          Perfil 1{profile1?.nombre ? ` — ${profile1.nombre}` : ""}
        </button>
        <button type="button" onClick={() => setActiveTab(2)} className={tabCls(2)}>
          Perfil 2{profile2?.nombre ? ` — ${profile2.nombre}` : ""}
        </button>
      </div>

      {activeTab === 1
        ? <CompanyProfileForm key={1} slot={1} profile={profile1} />
        : <CompanyProfileForm key={2} slot={2} profile={profile2} />}
    </div>
  );
}
