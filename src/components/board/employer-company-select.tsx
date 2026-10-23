import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { m } from '@/paraglide/messages';

/** One approved-company choice for employer billing and candidate actions. */
export function EmployerCompanySelect({
  id,
  companies,
  value,
  disabled,
  onChange,
}: {
  id: string;
  companies: ReadonlyArray<{ id: string; name: string }>;
  value?: string;
  disabled?: boolean;
  onChange: (companyId: string | undefined) => void;
}) {
  return (
    <div className="space-y-3">
      <Label htmlFor={id}>{m.talentUnlock_companyLabel()}</Label>
      <NativeSelect
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <NativeSelectOption value="">
          {m.talentUnlock_chooseCompanyLabel()}
        </NativeSelectOption>
        {companies.map((company) => (
          <NativeSelectOption key={company.id} value={company.id}>
            {company.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
