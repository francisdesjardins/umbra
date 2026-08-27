export { VanillaContent as Content } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/Content';
export { VanillaFooter as Footer } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/Footer';
export { VanillaHeader as Header } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/Header';
export { VanillaButtonContainer as ButtonContainer } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaButtonContainer';
export { VanillaFieldError as FieldError } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaFieldError';
export { VanillaFieldGroup as FieldGroup } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaFieldGroup';
export {
  VanillaFormLayout as DefaultLayout,
  VanillaFormLayout as FormLayout,
} from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaFormLayout';
export { VanillaInput as Input } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaInput';
export { VanillaLabel as Label } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaLabel';

// Imported as values, not just re-exported: the namespace object below needs them in scope.
import { VanillaContent as Content } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/Content';
import { VanillaFooter as Footer } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/Footer';
import { VanillaHeader as Header } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/Header';
import { VanillaButtonContainer as ButtonContainer } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaButtonContainer';
import { VanillaFieldError as FieldError } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaFieldError';
import { VanillaFieldGroup as FieldGroup } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaFieldGroup';
import { VanillaFormLayout as FormLayout } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaFormLayout';
import { VanillaInput as Input } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaInput';
import { VanillaLabel as Label } from '@/entities/dialog-template/ui/vanilla/form-dialog/components/VanillaLabel';

export const VanillaFormDialog = {
  DefaultLayout: FormLayout,
  FormLayout,
  ButtonContainer,
  FieldError,
  FieldGroup,
  Input,
  Label,
  Header,
  Content,
  Footer,
} as const;
