const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\frontend\\\\app\\\\onboarding\\\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update TextField
content = content.replace(
  'function TextField({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) {\n  return (\n    <label className="block">\n      <span className="mb-3 block text-[15px] font-bold text-slate-900">{label}</span>\n      <span className="flex h-[56px] items-center gap-3 rounded-[8px] border border-slate-200 bg-slate-50 px-5 \ntext-[15px] font-semibold text-slate-700">\n        {Icon ? <Icon size={19} className="text-slate-400" /> : null}\n        {value}\n      </span>\n    </label>\n  );\n}',
  `function TextField({ label, value, icon: Icon, onChange }: { label: string; value: string; icon?: LucideIcon; onChange?: (e:any)=>void }) {
  return (
    <label className="block">
      <span className="mb-3 block text-[15px] font-bold text-slate-900">{label}</span>
      <div className="flex h-[56px] items-center gap-3 rounded-[8px] border border-slate-200 bg-slate-50 px-5 text-[15px] font-semibold text-slate-700 focus-within:border-[#465FFF]/50">
        {Icon ? <Icon size={19} className="text-slate-400" /> : null}
        <input value={value} onChange={onChange} className="bg-transparent outline-none w-full" />
      </div>
    </label>
  );
}`
);

// Update ProfileStep
content = content.replace(
  'function ProfileStep() {',
  `function ProfileStep() {
  const { formData, updateForm } = useOnboarding();
`
);

content = content.replace('<TextField label={t("company")} value="FIFGROUP" />', '<TextField label={t("company")} value={formData.profile.brandName} onChange={(e) => updateForm("profile", { ...formData.profile, brandName: e.target.value })} />');

fs.writeFileSync(file, content, 'utf8');
console.log('Patched profile step');
