export { VanillaContent as Content } from '@/entities/modal-template/ui/vanilla/form-modal/components/Content';
export { VanillaFooter as Footer } from '@/entities/modal-template/ui/vanilla/form-modal/components/Footer';
export { VanillaHeader as Header } from '@/entities/modal-template/ui/vanilla/form-modal/components/Header';
export { VanillaButtonContainer as ButtonContainer } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaButtonContainer';
export { VanillaFieldError as FieldError } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFieldError';
export { VanillaFieldGroup as FieldGroup } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFieldGroup';
export {
  VanillaFormLayout as DefaultLayout,
  VanillaFormLayout as FormLayout,
} from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFormLayout';
export { VanillaInput as Input } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaInput';
export { VanillaLabel as Label } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaLabel';

// namespace object for convenient access
import { VanillaContent as Content } from '@/entities/modal-template/ui/vanilla/form-modal/components/Content';
import { VanillaFooter as Footer } from '@/entities/modal-template/ui/vanilla/form-modal/components/Footer';
import { VanillaHeader as Header } from '@/entities/modal-template/ui/vanilla/form-modal/components/Header';
import { VanillaButtonContainer as ButtonContainer } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaButtonContainer';
import { VanillaFieldError as FieldError } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFieldError';
import { VanillaFieldGroup as FieldGroup } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFieldGroup';
import { VanillaFormLayout as FormLayout } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaFormLayout';
import { VanillaInput as Input } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaInput';
import { VanillaLabel as Label } from '@/entities/modal-template/ui/vanilla/form-modal/components/VanillaLabel';

export const VanillaFormModal = {
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
