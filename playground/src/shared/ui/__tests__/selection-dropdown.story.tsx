import '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';
import { SelectionDropdown } from '@/shared/ui/SelectionDropdown';

/** The form tokens live on `:root` in the stylesheet imported above, so the harness only has to
 * flip the attribute they key on. */
export const SelectionDropdownHarness = ({ scheme }: { readonly scheme: 'light' | 'dark' }) => {
  document.documentElement.setAttribute('data-color-scheme', scheme);

  return (
    <SelectionDropdown id="step" aria-label="Step" data-testid="dropdown" defaultValue="1">
      <option value="1">Step 1</option>
      <option value="2">Step 2</option>
    </SelectionDropdown>
  );
};
