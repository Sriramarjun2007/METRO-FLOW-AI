import React from "react";

export default function Section({ title, subtitle, icon: Icon, right, children, className = "" }) {
  return (
    <section className={`glass p-5 ${className}`}>
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-neon-cyan" />}
          <div>
            <div className="text-[14px] font-semibold tracking-wide">{title}</div>
            {subtitle && <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
        </div>
        {right}
      </header>
      <div>{children}</div>
    </section>
  );
}
