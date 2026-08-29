import { useNavigate } from '@tanstack/react-router';

import { m } from '../../paraglide/messages';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseTalentSearch, type TalentSearch } from '@/lib/talent-search';

function formField(form: FormData, name: string): string | undefined {
  const raw = form.get(name);
  if (raw === null || raw instanceof File) return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

export function TalentFilters({ search }: { search: TalentSearch }) {
  const navigate = useNavigate({ from: '/talent/' });

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const parsed = parseTalentSearch({
          q: formField(form, 'q'),
          skill: formField(form, 'skill'),
          jobSearchStatus: formField(form, 'jobSearchStatus'),
          languages: formField(form, 'languages'),
          openToRelocate: formField(form, 'openToRelocate'),
          place: formField(form, 'place'),
          sort: formField(form, 'sort'),
          seniority: formField(form, 'seniority'),
          permitCountry: formField(form, 'permitCountry'),
          interestedRole: formField(form, 'interestedRole'),
        });
        void navigate({
          search: (previous) => ({
            ...previous,
            ...parsed,
            page: undefined,
          }),
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="talent-q">{m.talentFilters_queryLabel()}</Label>
        <Input
          id="talent-q"
          name="q"
          defaultValue={search.q ?? ''}
          placeholder={m.talentFilters_queryPlaceholder()}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="talent-skill">{m.talentFilters_skillLabel()}</Label>
        <Input
          id="talent-skill"
          name="skill"
          defaultValue={search.skill ?? ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="talent-status">{m.talentFilters_statusLabel()}</Label>
        <select
          id="talent-status"
          name="jobSearchStatus"
          defaultValue={search.jobSearchStatus ?? ''}
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="">{m.talentFilters_anyOption()}</option>
          <option value="actively_looking">
            {m.talentFilters_statusActive()}
          </option>
          <option value="open_to_offers">{m.talentFilters_statusOpen()}</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="talent-languages">
          {m.talentFilters_languagesLabel()}
        </Label>
        <Input
          id="talent-languages"
          name="languages"
          defaultValue={search.languages ?? ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="talent-relocate">
          {m.talentFilters_relocateLabel()}
        </Label>
        <select
          id="talent-relocate"
          name="openToRelocate"
          defaultValue={search.openToRelocate ?? ''}
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="">{m.talentFilters_anyOption()}</option>
          <option value="true">{m.talentFilters_relocateYes()}</option>
          <option value="false">{m.talentFilters_relocateNo()}</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="talent-place">{m.talentFilters_placeLabel()}</Label>
        <Input
          id="talent-place"
          name="place"
          defaultValue={search.place ?? ''}
          placeholder={m.talentFilters_placePlaceholder()}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="talent-sort">{m.talentFilters_sortLabel()}</Label>
        <select
          id="talent-sort"
          name="sort"
          defaultValue={search.sort ?? 'relevance'}
          className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
        >
          <option value="relevance">{m.talentFilters_sortBestMatch()}</option>
          <option value="newest">{m.talentFilters_sortNewest()}</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="talent-seniority">
          {m.talentFilters_seniorityLabel()}
        </Label>
        <Input
          id="talent-seniority"
          name="seniority"
          defaultValue={search.seniority ?? ''}
        />
      </div>
      <div className="flex items-end">
        <Button type="submit">{m.talentFilters_applyLabel()}</Button>
      </div>
    </form>
  );
}
